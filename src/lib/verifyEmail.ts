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
    subject: 'Verify your email - ICONA',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0F172A; background-color: #F8FAFC;">
        <div style="background-color: #1A365D; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Verify Your Email</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #38BDF8; font-weight: 500;">ICONA - Construction ERP & CRM</p>
        </div>
        <div style="background-color: #FFFFFF; padding: 32px 28px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.05);">
          <p style="margin-top: 0; font-size: 15px; color: #0F172A;">Hello <strong>${name || 'there'}</strong>,</p>
          <p style="font-size: 14px; color: #64748B; line-height: 1.6;">Welcome to <strong>ICONA Construction Software</strong>. Please click the button below to verify your email address and continue setting up your workspace portal:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">This link is valid for <strong>24 hours</strong>. If the button above doesn't work, copy and paste this URL into your browser:</p>
          <div style="background-color: #F8FAFC; padding: 12px; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 12px; word-break: break-all; color: #2563EB; font-family: monospace; margin-bottom: 20px;">
            ${link}
          </div>
          <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0;">If you did not sign up for an ICONA account, you can safely ignore this message.</p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">© ICONA Construction Software. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

// Sends a Security Upgrade Notification email to existing users to update password & verify email
export async function sendSecurityUpgradeEmail(email: string, name: string) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = hashResetCode(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await systemPrisma.emailVerificationToken.upsert({
    where: { email },
    update: { token: hashed, expiresAt },
    create: { email, token: hashed, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL || 'http://localhost:4266';
  const link = `${base}/forgot-password?email=${encodeURIComponent(email)}&upgradeToken=${rawToken}`;

  await sendEmail({
    to: email,
    subject: 'Action Required: Upgrade Your ICONA Account Security Credentials',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #0F172A; background-color: #F8FAFC;">
        <div style="background-color: #1A365D; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Security Update Required</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #38BDF8; font-weight: 500;">ICONA Construction ERP & CRM</p>
        </div>
        <div style="background-color: #FFFFFF; padding: 32px 28px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.05);">
          <p style="margin-top: 0; font-size: 15px; color: #0F172A;">Hello <strong>${name || 'there'}</strong>,</p>
          <p style="font-size: 14px; color: #64748B; line-height: 1.6;">We have upgraded the platform security standards for <strong>ICONA ERP & CRM</strong> to comply with NIST SP 800-63B standards (12+ character minimum password security and verified email accounts).</p>
          <p style="font-size: 14px; color: #64748B; line-height: 1.6;">Please click the button below to update your password and complete your account security verification:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
              Upgrade Account Credentials
            </a>
          </div>
          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">Direct link if button is disabled:</p>
          <div style="background-color: #F8FAFC; padding: 12px; border-radius: 6px; border: 1px solid #E2E8F0; font-size: 12px; word-break: break-all; color: #2563EB; font-family: monospace; margin-bottom: 20px;">
            ${link}
          </div>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">© ICONA Construction Software. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

