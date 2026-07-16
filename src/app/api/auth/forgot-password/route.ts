import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const user = await prisma.user.findUnique({
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
    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: { email, code: hashResetCode(rawCode), expiresAt },
    });

    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
          <h2 style="margin: 0;">Password Reset Request</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">ICON SERVICES ERP</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Use this code to proceed:</p>
          <div style="font-size: 32px; font-weight: bold; text-align: center; padding: 15px; letter-spacing: 5px; color: #4f46e5; background-color: #e0e7ff; border-radius: 6px; margin: 15px 0;">
            ${rawCode}
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            This code is valid for 15 minutes. If you did not request a password reset, please ignore this email — your account is safe.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: '[ICON ERP] Password Reset Verification Code',
      html: mailHtml,
    });

    return NextResponse.json(GENERIC_OK);
  } catch (error: any) {
    console.error('[POST /api/auth/forgot-password] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
