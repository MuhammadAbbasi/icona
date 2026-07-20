import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/adminAuth';

let featureFlags: Record<string, boolean> = {
  // Client Tenant Features
  ENABLE_AI_COPILOT: true,
  ENABLE_ROMAN_URDU_PARSER: true,
  ENABLE_WHATSAPP_ALERTS: true,
  ENABLE_TELEGRAM_BOT: true,
  ENABLE_ODOO_SYNC: true,
  ENABLE_SLACK_ALERTS: true,
  ENABLE_NOTION_SYNC: true,
  ENABLE_PREFILLED_MODALS: true,
  ENABLE_PADDLE_CHECKOUT: true,
  ENABLE_PKR_TAX_INVOICES: true,

  // Super Admin Platform Alerts & Communications
  ENABLE_ADMIN_SIGNUP_ALERTS: true,
  ENABLE_ADMIN_SECURITY_ALERTS: true,
  ENABLE_ADMIN_LLM_COST_ALERTS: true,
  ENABLE_ADMIN_BILLING_ALERTS: true,
  MAINTENANCE_MODE: false,
};

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  return NextResponse.json({ flags: featureFlags });
}

export async function POST(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await req.json();
    const { key, value } = body;
    if (key && typeof value === 'boolean') {
      featureFlags[key] = value;
    }
    return NextResponse.json({ success: true, flags: featureFlags });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}
