import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;
    const isStaff = ['ADMIN', 'MANAGER'].includes(role);

    // Fetch personal user details & preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        position: true,
        department: true,
        role: true,
        taskAssignNotifications: true,
        dailyTaskDigest: true,
        weeklyClientUpdates: true,
        projectCompletionAlert: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let systemSettings: Record<string, string> = {};

    // Keys that must never be returned to the client — they are internal secrets.
    const SECRET_KEYS = new Set(['mobile_jwt_secret', 'nextauth_secret']);

    // Only Admins/Managers can fetch global settings
    if (isStaff) {
      const dbSettings = await prisma.systemSetting.findMany({
        where: { key: { notIn: Array.from(SECRET_KEYS) } },
      });
      systemSettings = dbSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      // Provide fallbacks if they don't exist yet
      if (!systemSettings.forgot_password_email) {
        systemSettings.forgot_password_email = 'muhammadabbasi.llm@gmail.com';
      }
      if (!systemSettings.global_weekly_client_updates) {
        systemSettings.global_weekly_client_updates = 'true';
      }
      if (!systemSettings.global_budget_alert_threshold) {
        systemSettings.global_budget_alert_threshold = '90';
      }
      if (!systemSettings.global_min_txn_alert_amount) {
        systemSettings.global_min_txn_alert_amount = '100000';
      }
    }

    return NextResponse.json({
      user,
      system: isStaff ? systemSettings : null,
    });
  } catch (error: any) {
    console.error('[GET /api/settings] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;
    const isStaff = ['ADMIN', 'MANAGER'].includes(role);

    const body = await req.json().catch(() => ({}));
    const { userPreferences, systemSettings } = body;

    // 1. Update personal settings/preferences
    if (userPreferences) {
      const updateData: Record<string, any> = {};

      if (typeof userPreferences.name === 'string') updateData.name = userPreferences.name.trim();
      if (typeof userPreferences.phone === 'string') updateData.phone = userPreferences.phone.trim();
      if (typeof userPreferences.address === 'string') updateData.address = userPreferences.address.trim();

      if (typeof userPreferences.taskAssignNotifications === 'boolean') {
        updateData.taskAssignNotifications = userPreferences.taskAssignNotifications;
      }
      if (typeof userPreferences.dailyTaskDigest === 'boolean') {
        updateData.dailyTaskDigest = userPreferences.dailyTaskDigest;
      }
      if (typeof userPreferences.weeklyClientUpdates === 'boolean') {
        updateData.weeklyClientUpdates = userPreferences.weeklyClientUpdates;
      }
      if (typeof userPreferences.projectCompletionAlert === 'boolean') {
        updateData.projectCompletionAlert = userPreferences.projectCompletionAlert;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    // 2. Update global system settings (Admins/Managers only)
    if (systemSettings && isStaff) {
      // Explicit allowlist — prevents overwriting secrets or injecting arbitrary keys.
      const ALLOWED_SYSTEM_KEYS = new Set([
        'forgot_password_email',
        'global_weekly_client_updates',
        'global_budget_alert_threshold',
        'global_min_txn_alert_amount',
      ]);

      const updates = [];

      for (const [key, value] of Object.entries(systemSettings)) {
        if (!ALLOWED_SYSTEM_KEYS.has(key)) continue; // reject unknown / secret keys
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          updates.push(
            prisma.systemSetting.upsert({
              where: { key },
              update: { value: String(value) },
              create: { key, value: String(value) },
            })
          );
        }
      }

      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }
    }

    return NextResponse.json({ message: 'Settings updated successfully.' });
  } catch (error: any) {
    console.error('[PATCH /api/settings] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
