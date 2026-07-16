import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// systemPrisma: identity lookups run BEFORE a tenant context exists (the org is
// derived from the user, not the other way round), so the tenant-guarded client
// would always fail closed here.
import { systemPrisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { rateLimit, rateLimitReset } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/verifyEmail';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 h; live DB revocation handles early invalidation
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // S4: throttle web login to blunt brute-force. Per-account and per-IP.
        // ponytail: in-process Map, so ineffective on serverless / multi-instance
        // (e.g. Vercel); move to Redis/Upstash before relying on it at scale (S5).
        const email = credentials.email.toLowerCase();
        const fwd = (req?.headers?.['x-forwarded-for'] as string | undefined) ?? '';
        const ip = fwd.split(',')[0]?.trim() || 'unknown';
        const WINDOW = 15 * 60 * 1000;
        const byEmail = rateLimit(`web-login:email:${email}`, 5, WINDOW);
        const byIp = rateLimit(`web-login:ip:${ip}`, 30, WINDOW);
        if (!byEmail.ok || !byIp.ok) {
          throw new Error('Too many login attempts. Please try again in a few minutes.');
        }

        const user = await systemPrisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true, org: { select: { planId: true } } },
        });

        if (!user) return null;

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) return null;

        if (user.status === 'INACTIVE') return null; // deactivated accounts cannot sign in

        // Signup email verification gate. Re-send the link (rate-limited) so an
        // account whose first email was lost is never permanently locked out.
        // Migration note: when importing legacy icon-crm users, backfill
        // emailVerified = createdAt or they will all be blocked here.
        if (!user.emailVerified) {
          const resend = rateLimit(`verify-resend:${email}`, 3, 60 * 60 * 1000);
          if (resend.ok) {
            sendVerificationEmail(user.email, user.name).catch((e: unknown) =>
              console.error('Verification re-send failed:', e)
            );
          }
          throw new Error('Please verify your email first — we have sent you a verification link.');
        }

        rateLimitReset(`web-login:email:${email}`); // a successful login clears the account counter

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          companyId: user.companyId,
          companyName: user.company?.name,
          orgId: user.orgId,
          orgPlanId: user.org?.planId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, seed the token from the authorize() payload.
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status ?? 'ACTIVE';
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
        token.orgId = (user as any).orgId;
        token.orgPlanId = (user as any).orgPlanId;
        return token;
      }

      // On every subsequent request, re-read the authoritative role/status from
      // the database so that an admin changing a user's role or deactivating
      // them invalidates the live JWT session on the next request — instead of
      // waiting for the token to expire. Tradeoff: one indexed PK lookup per
      // session read, in exchange for immediate revocation.
      if (token.id) {
        const fresh = await systemPrisma.user.findUnique({
          where: { id: token.id as string },
          select: { 
            role: true, 
            status: true, 
            companyId: true, 
            name: true, 
            email: true, 
            orgId: true,
            org: { select: { planId: true } },
          },
        });
        if (!fresh || fresh.status === 'INACTIVE') {
          // Deleted or deactivated → strip privileges; middleware redirects out.
          token.invalid = true;
          token.role = '';
          token.status = 'INACTIVE';
        } else {
          token.invalid = false;
          token.role = fresh.role;
          token.status = fresh.status;
          token.companyId = fresh.companyId ?? undefined;
          token.orgId = fresh.orgId ?? undefined;
          token.orgPlanId = fresh.org?.planId ?? undefined;
          // Keep name/email live so profile edits show without re-login.
          token.name = fresh.name;
          token.email = fresh.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
        session.user.companyId = token.companyId as string;
        session.user.companyName = token.companyName as string;
        session.user.orgId = token.orgId as string;
        session.user.orgPlanId = (token as any).orgPlanId as string;
      }
      return session;
    },
  },
};
