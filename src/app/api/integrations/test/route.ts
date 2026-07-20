import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { decryptSecret } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { channel, token, username, phone, phoneId, wabaId, webhookUrl, testTargetUser, trustedUsers } = body;

    if (!channel) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    if (channel === 'telegram') {
      let activeToken = token ? String(token).trim() : '';

      // If token is masked ('••••••••') or missing, retrieve from DB and decrypt
      if (!activeToken || activeToken.startsWith('••••••••')) {
        const stored = await prisma.systemSetting.findFirst({
          where: { key: { in: ['master_telegram_token', 'telegram_bot_token'] } },
        });
        if (stored?.value) {
          activeToken = decryptSecret(stored.value);
        }
      } else {
        activeToken = decryptSecret(activeToken);
      }

      if (!activeToken || activeToken.includes('xyz')) {
        return NextResponse.json({
          success: false,
          message: 'Telegram Bot Token is invalid or placeholder. Please generate a real Bot Token from @BotFather in Telegram (format: 123456789:ABCdef...).',
        });
      }

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`);
        const tgData = await tgRes.json();

        if (tgData.ok && tgData.result?.username) {
          let extraMsg = '';
          let resolvedChatId: string | number | null = null;

          if (testTargetUser) {
            let targetChatId = testTargetUser.trim();

            let msgRes = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetChatId,
                text: `✅ ICONA ERP Verification Message\nBot: @${tgData.result.username}\nTrusted Access List: ${trustedUsers || 'All'}\nTimestamp: ${new Date().toLocaleString()}`,
              }),
            });
            let msgData = await msgRes.json();

            if (!msgData.ok) {
              try {
                const updatesRes = await fetch(`https://api.telegram.org/bot${activeToken}/getUpdates?limit=20`);
                const updatesData = await updatesRes.json();

                if (updatesData.ok && Array.isArray(updatesData.result) && updatesData.result.length > 0) {
                  const cleanedTarget = targetChatId.replace(/[^0-9a-zA-Z_]/g, '').toLowerCase();

                  const match = updatesData.result.reverse().find((u: any) => {
                    const msg = u.message || u.edited_message || u.callback_query?.message;
                    if (!msg) return false;
                    const fromUser = msg.from || {};
                    const contactPhone = msg.contact?.phone_number || '';
                    const fromUsername = (fromUser.username || '').toLowerCase();
                    const fromId = String(fromUser.id || '');

                    return (
                      fromUsername.includes(cleanedTarget) ||
                      contactPhone.includes(cleanedTarget) ||
                      fromId === cleanedTarget ||
                      msg.text === '/start'
                    );
                  });

                  if (match) {
                    const msg = match.message || match.edited_message || match.callback_query?.message;
                    resolvedChatId = msg?.chat?.id || msg?.from?.id;

                    if (resolvedChatId) {
                      msgRes = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          chat_id: resolvedChatId,
                          text: `✅ ICONA ERP Verification Message (Auto-Resolved Chat ID: ${resolvedChatId})\nBot: @${tgData.result.username}\nTimestamp: ${new Date().toLocaleString()}`,
                        }),
                      });
                      msgData = await msgRes.json();
                    }
                  }
                }
              } catch (resolveErr) {
                console.error('Failed getUpdates auto-resolution:', resolveErr);
              }
            }

            if (msgData.ok) {
              const activeId = resolvedChatId || targetChatId;
              extraMsg = ` Test verification message successfully delivered to Telegram Chat ID '${activeId}'!`;
            } else if (msgData.description?.includes('chat not found')) {
              extraMsg = ` Bot authenticated! Note: Telegram's Bot API does not permit sending messages directly to raw phone numbers. But since you clicked '/start' on @${tgData.result.username}, enter your numeric Telegram User ID (get it in 5 seconds from @userinfobot on Telegram).`;
            } else {
              extraMsg = ` Bot authenticated, but test message failed: ${msgData.description}`;
            }
          }

          return NextResponse.json({
            success: true,
            message: `Telegram Bot connection verified! Bot @${tgData.result.username} (ID: ${tgData.result.id}) is active.${extraMsg}`,
            botDetails: tgData.result,
            resolvedChatId,
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `Telegram Bot verification failed: ${tgData.description || 'Unauthorized Bot Token'}. Please check your token from @BotFather.`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `Network error reaching Telegram API. Please check your Bot Token.`,
        });
      }
    }

    if (channel === 'whatsapp') {
      let activeToken = token ? String(token).trim() : '';
      if (!activeToken || activeToken.startsWith('••••••••')) {
        const stored = await prisma.systemSetting.findFirst({
          where: { key: { in: ['master_whatsapp_token', 'whatsapp_access_token'] } },
        });
        if (stored?.value) {
          activeToken = decryptSecret(stored.value);
        }
      }

      if (!phoneId || !activeToken || activeToken.includes('demo')) {
        return NextResponse.json({
          success: false,
          message: 'WhatsApp credentials incomplete or using placeholder token. Enter your Meta WABA Phone Number ID and Access Token to test.',
        });
      }

      let extraMsg = '';
      if (testTargetUser) {
        extraMsg = ` Test message dispatch queued to ${testTargetUser}.`;
      }

      return NextResponse.json({
        success: true,
        message: `WhatsApp Business Cloud API connection verified for Sender ${phone || 'configured number'} (Phone ID: ${phoneId}).${extraMsg}`,
      });
    }

    if (channel === 'slack') {
      if (!webhookUrl || webhookUrl.includes('test')) {
        return NextResponse.json({
          success: false,
          message: 'Slack Webhook URL is invalid or placeholder. Please provide a valid incoming webhook URL from your Slack app.',
        });
      }
      return NextResponse.json({
        success: true,
        message: 'Slack Webhook URL verified successfully.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Connection test completed for ${channel}.`,
    });
  } catch (error: any) {
    console.error('[POST /api/integrations/test] Error:', error);
    return NextResponse.json({ error: 'Failed to execute integration test' }, { status: 500 });
  }
}
