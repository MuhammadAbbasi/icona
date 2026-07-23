import { NextResponse } from 'next/server';
import { systemPrisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Validate password strength against NIST 12+ character security standard
    const valResult = validatePasswordStrength(newPassword);
    if (!valResult.valid) {
      return NextResponse.json(
        { error: valResult.message || 'Password does not meet 12+ character security requirement.' },
        { status: 400 }
      );
    }

    const user = await systemPrisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await systemPrisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: user.emailVerified || new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account credentials upgraded successfully to NIST SP 800-63B standards.',
    });
  } catch (error: any) {
    console.error('Failed to upgrade security credentials:', error);
    return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 });
  }
}
