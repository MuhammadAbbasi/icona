import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashResetCode, safeCompareHash } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim()?.toLowerCase();
    const code = body?.code?.trim();
    const newPassword = body?.newPassword;
    const confirmPassword = body?.confirmPassword;

    if (!email || !code || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // Find the latest token for this email
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'No password reset code requested for this email.' }, { status: 400 });
    }

    if (!safeCompareHash(resetToken.code, hashResetCode(code))) {
      return NextResponse.json({ error: 'Invalid verification code. Please check and try again.' }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash new password and update user record
    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { email },
      }),
    ]);

    return NextResponse.json({ message: 'Password has been reset successfully.' });
  } catch (error: any) {
    console.error('[POST /api/auth/reset-password] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
