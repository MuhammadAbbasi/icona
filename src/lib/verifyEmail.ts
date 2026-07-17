import crypto from 'node:crypto';
import { systemPrisma } from '@/lib/prisma';
import { hashResetCode } from '@/lib/password';
import { sendEmail } from '@/lib/mail';

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// Creates (or replaces) the verification token for this email and sends the link.
// Used by signup and by the login-time resend in auth.ts.
export async function sendVerificationEmail(email: string, name: string) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = hashResetCode(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await systemPrisma.emailVerificationToken.upsert({
    where: { email },
    update: { token: hashed, expiresAt },
    create: { email, token: hashed, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL || 'http://localhost:4266';
  const link = `${base}/api/auth/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: 'Verify your email — ICONA',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
          <h2 style="margin: 0;">Verify your email</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">ICONA — Construction ERP + CRM</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p>Hi ${name},</p>
          <p>Welcome to ICONA. Click the button below to verify your email address and continue setting up your workspace:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${link}" style="background-color: #ea580c; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Verify email
            </a>
          </p>
          <p style="font-size: 12px; color: #64748b;">
            This link is valid for 24 hours. If the button does not work, copy this URL into your browser:<br/>
            <span style="word-break: break-all;">${link}</span>
          </p>
          <p style="font-size: 12px; color: #64748b;">If you did not sign up for ICONA, you can ignore this email.</p>
        </div>
      </div>
    `,
  });
}
