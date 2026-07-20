import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminUser } from '@/lib/adminAuth';
import { encryptSecret, maskSecret } from '@/lib/crypto';

const ALLOWED_MASTER_KEYS = new Set([
  'master_whatsapp_phone',
  'master_whatsapp_phone_id',
  'master_whatsapp_waba_id',
  'master_whatsapp_token',
  'test_wa_recipient',
  'master_telegram_username',
  'master_telegram_token',
  'trusted_telegram_users',
  'test_tg_target_user',
]);

const SECRET_KEYS = new Set([
  'master_whatsapp_token',
  'master_telegram_token',
]);

export async function GET() {
  const admin = await requireAdminUser();
  if ('error' in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const settingsList = await prisma.systemSetting.findMany({
      where: { key: { in: Array.from(ALLOWED_MASTER_KEYS) } },
    });

    const settings = settingsList.reduce((acc, item) => {
      if (SECRET_KEYS.has(item.key)) {
        acc[item.key] = maskSecret(item.value);
      } else {
        acc[item.key] = item.value;
      }
      return acc;
    }, {} as Record<string, string>);

    // Default fallbacks
    if (!settings.master_whatsapp_phone) settings.master_whatsapp_phone = '+92 42 111 426 62';
    if (!settings.master_whatsapp_phone_id) settings.master_whatsapp_phone_id = '1092837465928';
    if (!settings.master_whatsapp_waba_id) settings.master_whatsapp_waba_id = '9018273645920';
    if (!settings.test_wa_recipient) settings.test_wa_recipient = '+923211234567';
    if (!settings.master_telegram_username) settings.master_telegram_username = '@icona_admin_bot';
    if (!settings.trusted_telegram_users) settings.trusted_telegram_users = '@icona_admin_bot, 987654321';

    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error('[GET /api/admin/settings] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch admin settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminUser();
  if ('error' in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      if (!ALLOWED_MASTER_KEYS.has(key)) continue;
      if (typeof value === 'string' || typeof value === 'number') {
        let strVal = String(value).trim();

        // If field is a secret and contains client mask placeholder, skip overwriting DB
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

    return NextResponse.json({ success: true, message: 'Master platform settings saved securely.' });
  } catch (err: any) {
    console.error('[POST /api/admin/settings] Error:', err);
    return NextResponse.json({ error: 'Failed to save admin settings' }, { status: 500 });
  }
}
