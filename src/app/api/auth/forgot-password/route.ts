import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';
import { rateLimit } from '@/lib/rateLimit';
import { hashResetCode } from '@/lib/password';

// Rate limit: 3 requests per hour per IP
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

// Generic response — identical whether email exists or not (prevents enumeration)
const GENERIC_OK = { message: 'If that email is registered, a reset code has been sent.' };

export async function POST(req: Request) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  const { ok, retryAfter } = rateLimit(`forgot-pw:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const user = await systemPrisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // Always return 200 — never reveal whether the email is registered
    if (!user) {
      return NextResponse.json(GENERIC_OK);
    }

    // CSPRNG 6-digit code
    const rawCode = String(crypto.randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate previous tokens and store SHA-256 hash (never plaintext)
    await systemPrisma.passwordResetToken.deleteMany({ where: { email } });
    await systemPrisma.passwordResetToken.create({
      data: { email, code: hashResetCode(rawCode), expiresAt },
    });

    const mailHtml = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0F172A; background-color: #F8FAFC;">
        <div style="background-color: #1A365D; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Password Reset Request</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #38BDF8; font-weight: 500;">ICONA - Construction ERP & CRM</p>
        </div>
        <div style="background-color: #FFFFFF; padding: 32px 28px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.05);">
          <p style="margin-top: 0; font-size: 15px; color: #0F172A;">Hello <strong>${user.name || 'User'}</strong>,</p>
          <p style="font-size: 14px; color: #64748B; line-height: 1.6;">We received a request to reset the password for your ICONA account. Use the 6-digit verification code below to complete your reset:</p>
          
          <div style="text-align: center; margin: 28px 0; padding: 16px; background-color: #F8FAFC; border: 1px border-dashed #CBD5E1; border-radius: 8px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563EB;">${rawCode}</span>
          </div>

          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">© ICONA Construction Software. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Your Password Reset Code - ICONA',
      html: mailHtml,
    });

    return NextResponse.json(GENERIC_OK);
  } catch (error: any) {
    console.error('[POST /api/auth/forgot-password] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
