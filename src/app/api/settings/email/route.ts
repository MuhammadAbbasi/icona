import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptSecret } from '@/lib/crypto';
import { sendViaSmtp } from '@/lib/mail';
import type { OrgEmailConfig } from '@/lib/email-config';

// Per-tenant outbound email settings. Each client org's ADMIN/MANAGER configures
// the mailbox their ICONA emails are sent from (Gmail / Outlook / Yahoo / custom).
export const dynamic = 'force-dynamic';

const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const MASK = '••••••••';

async function gate() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!STAFF.includes(session.user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  const orgId = (session.user as { orgId?: string }).orgId;
  if (!orgId) return { error: NextResponse.json({ error: 'No organization on your account' }, { status: 400 }) };
  return { session, orgId };
}

async function loadConfig(orgId: string): Promise<OrgEmailConfig | null> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { emailConfig: true } });
  return (org?.emailConfig as unknown as OrgEmailConfig) || null;
}

// GET — return the saved config with the password masked (never sent to the client).
export async function GET() {
  const g = await gate();
  if ('error' in g) return g.error;
  const cfg = await loadConfig(g.orgId);
  if (!cfg) return NextResponse.json({ config: null });
  const { passEnc, ...rest } = cfg;
  return NextResponse.json({ config: { ...rest, password: passEnc ? MASK : '' } });
}

// PUT — save. Password is only re-encrypted when actually changed (a masked or
// blank value keeps the stored one), matching the app's existing secret pattern.
export async function PUT(req: Request) {
  const g = await gate();
  if ('error' in g) return g.error;
  const body = await req.json().catch(() => ({}));
  const { provider, fromName, fromEmail, user, password, host, port, secure } = body;

  if (!['gmail', 'outlook', 'yahoo', 'custom'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  if (!fromEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail)) {
    return NextResponse.json({ error: 'A valid "From" email address is required' }, { status: 400 });
  }
  if (provider === 'custom' && !host) {
    return NextResponse.json({ error: 'A custom provider requires an SMTP host' }, { status: 400 });
  }

  const existing = await loadConfig(g.orgId);
  let passEnc = existing?.passEnc || '';
  if (password && password !== MASK) passEnc = encryptSecret(password);
  if (!passEnc) {
    return NextResponse.json({ error: 'An SMTP password / app-password is required' }, { status: 400 });
  }

  const config: OrgEmailConfig = {
    provider,
    fromName: (fromName || '').trim(),
    fromEmail: fromEmail.trim(),
    user: (user || fromEmail).trim(),
    passEnc,
    ...(provider === 'custom'
      ? { host: String(host).trim(), port: Number(port) || 587, secure: Boolean(secure) }
      : {}),
  };

  await prisma.organization.update({ where: { id: g.orgId }, data: { emailConfig: config as object } });
  return NextResponse.json({ success: true });
}

// POST — send a test email to the signed-in admin using the saved config.
export async function POST() {
  const g = await gate();
  if ('error' in g) return g.error;
  const cfg = await loadConfig(g.orgId);
  if (!cfg?.passEnc) {
    return NextResponse.json({ error: 'Save your email settings first, then send a test.' }, { status: 400 });
  }
  const to = g.session.user.email;
  if (!to) return NextResponse.json({ error: 'Your account has no email address to test with' }, { status: 400 });

  try {
    await sendViaSmtp(cfg, {
      to,
      subject: 'ICONA — test email',
      html: `<p>This is a test message from ICONA, sent through your configured mailbox <b>${cfg.fromEmail}</b>.</p>
             <p>If it reached you, outbound email for your company is working. Replies to ICONA emails will arrive at this address.</p>`,
    });
    return NextResponse.json({ success: true, message: `Test email sent to ${to}.` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'SMTP error';
    return NextResponse.json({ error: `Send failed: ${msg}` }, { status: 502 });
  }
}
