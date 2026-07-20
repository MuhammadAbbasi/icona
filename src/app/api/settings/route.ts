import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptSecret, maskSecret } from '@/lib/crypto';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const role = session.user.role;
    const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

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

    const MASKED_SECRET_KEYS = new Set([
      'whatsapp_access_token',
      'telegram_bot_token',
      'notion_integration_token',
    ]);

    const INTERNAL_SECRET_KEYS = new Set(['mobile_jwt_secret', 'nextauth_secret']);

    if (isStaff) {
      const dbSettings = await prisma.systemSetting.findMany({
        where: { key: { notIn: Array.from(INTERNAL_SECRET_KEYS) } },
      });

      systemSettings = dbSettings.reduce((acc, setting) => {
        if (MASKED_SECRET_KEYS.has(setting.key)) {
          acc[setting.key] = maskSecret(setting.value);
        } else {
          acc[setting.key] = setting.value;
        }
        return acc;
      }, {} as Record<string, string>);

      if (!systemSettings.forgot_password_email) {
        systemSettings.forgot_password_email = 'support@icona.pk';
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
    const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

    const body = await req.json().catch(() => ({}));
    const { userPreferences, systemSettings } = body;

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

    if (systemSettings && isStaff) {
      const ALLOWED_SYSTEM_KEYS = new Set([
        'forgot_password_email',
        'global_weekly_client_updates',
        'global_budget_alert_threshold',
        'global_min_txn_alert_amount',
        'use_custom_whatsapp',
        'whatsapp_phone_number_id',
        'whatsapp_waba_id',
        'whatsapp_sender_phone',
        'whatsapp_access_token',
        'use_custom_telegram_bot',
        'telegram_bot_username',
        'telegram_bot_token',
        'slack_webhook_url',
        'odoo_sync_endpoint',
        'notion_integration_token',
        'trusted_telegram_users',
        'test_tg_target_user',
        'test_wa_recipient',
        'org_flag_ai_copilot',
        'org_flag_roman_urdu',
        'org_flag_whatsapp',
        'org_flag_telegram',
        'org_flag_odoo',
        'org_flag_slack',
        'org_flag_notion',
        'org_flag_prefilled_modals',
        'org_flag_deadline_emails',
      ]);

      const SECRET_KEYS = new Set([
        'whatsapp_access_token',
        'telegram_bot_token',
        'notion_integration_token',
      ]);

      const updates = [];

      for (const [key, value] of Object.entries(systemSettings)) {
        if (!ALLOWED_SYSTEM_KEYS.has(key)) continue;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          let strVal = String(value).trim();

          if (SECRET_KEYS.has(key)) {
            if (strVal.startsWith('••••••••') || strVal === '') {
              continue;
            }
            strVal = encryptSecret(strVal);
          }

          updates.push(
            prisma.systemSetting.upsert({
              where: { key },
              update: { value: strVal },
              create: { key, value: strVal },
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
