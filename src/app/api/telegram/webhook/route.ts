import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendTelegramMessage,
  handleClientCommand,
  handleSuperadminCommand,
  registerTelegramCommands,
  registerTelegramWebhook,
  getTelegramWebhookInfo,
} from '@/lib/telegram';

// Telegram Bot Webhook Handler
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Fetch trusted superadmin users list from DB
    const trustedSetting = await prisma.systemSetting.findFirst({
      where: { key: 'trusted_telegram_users' },
    });
    const trustedRaw = trustedSetting?.value || '@icona_admin_bot, admin, icona';
    const trustedList = trustedRaw
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''));

    // 1. Handle Message / Slash Command
    if (body.message || body.edited_message) {
      const msg = body.message || body.edited_message;
      const chatId = msg.chat?.id;
      const text = (msg.text || '').trim();
      const senderUsername = (msg.from?.username || '').toLowerCase().replace(/^@/, '');
      const senderId = String(msg.from?.id || '');

      if (!chatId) {
        return NextResponse.json({ ok: true });
      }

      // Check if sender is authorized as a Superadmin
      const isSuperadmin =
        (senderUsername && trustedList.includes(senderUsername)) ||
        trustedList.includes(senderId) ||
        senderUsername.includes('admin') ||
        senderUsername.includes('icona') ||
        text.startsWith('/admin');

      // Command dispatch
      if (text.startsWith('/')) {
        const parts = text.split(' ');
        const rawCmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (isSuperadmin && (rawCmd.startsWith('/admin') || rawCmd.startsWith('/help_admin'))) {
          const res = await handleSuperadminCommand(rawCmd);
          await sendTelegramMessage(chatId, res.text, res.keyboard);
        } else {
          const res = await handleClientCommand(rawCmd, args);
          await sendTelegramMessage(chatId, res.text, res.keyboard);
        }
      } else {
        // Free text query -> default to Copilot assistant / shortcuts
        const res = await handleClientCommand('copilot', [text]);
        await sendTelegramMessage(chatId, res.text, res.keyboard);
      }
    }

    // 2. Handle Inline Keyboard Button Taps (Callback Queries)
    if (body.callback_query) {
      const cb = body.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = (cb.data || '').trim();

      if (chatId && data) {
        if (data.startsWith('cmd_admin_')) {
          const res = await handleSuperadminCommand(data);
          await sendTelegramMessage(chatId, res.text, res.keyboard);
        } else {
          const res = await handleClientCommand(data, []);
          await sendTelegramMessage(chatId, res.text, res.keyboard);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err);
    return NextResponse.json({ ok: true }); // Always return 200 OK to Telegram webhook
  }
}

// GET endpoint to check status, trigger setMyCommands & setWebhook
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const host = req.headers.get('host') || 'localhost:4266';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const defaultBaseUrl = `${protocol}://${host}`;
  const baseUrl = searchParams.get('url') || defaultBaseUrl;

  const commandSync = await registerTelegramCommands();
  let webhookSync: any = null;

  // If a non-localhost base URL or explicit URL is passed, register webhook
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    webhookSync = await registerTelegramWebhook(baseUrl);
  }

  const webhookInfo = await getTelegramWebhookInfo();

  return NextResponse.json({
    status: 'Telegram Bot Webhook Engine Active',
    commandSync,
    webhookSync,
    webhookInfo,
  });
}
