// POST /api/assistant — the client-facing AI assistant.
// Backed by OpenRouter (free NVIDIA Nemotron, tool + vision capable).
// Stateless: the widget sends the visible conversation each turn; we run the
// tool loop server-side and return the final text answer.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUser, type ApiUser } from '@/lib/apiAuth';
import { withTenantContext } from '@/lib/tenantPrisma';
import { assistantTools, runAssistantTool } from '@/lib/assistant';

export const runtime = 'nodejs';
export const maxDuration = 120;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Free Nemotron with both tool calling and image input (256K context) —
// required so view_photo's vision analysis keeps working.
const MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

function systemPrompt(user: ApiUser): string {
  return [
    'You are the ICONA Assistant, built into the ICONA construction ERP & CRM.',
    `The signed-in user's role is ${user.role}. All money is PKR (Pakistani Rupees) — format like "PKR 1,250,000".`,
    'You help with: payment/financial questions, project workflow analysis, and reviewing site photos.',
    'Answer only from tool data — never invent figures, projects or photos. If the user names a project, resolve it with list_projects first.',
    'When the user asks about a photo or how work looks on site, use list_photos then view_photo to actually look at it.',
    'Be concise and practical; answer in the language the user writes in (English or Urdu).',
  ].join('\n');
}

async function runChat(user: ApiUser, history: { role: string; content: string }[]): Promise<string> {
  const messages: any[] = [{ role: 'system', content: systemPrompt(user) }, ...history];

  // ponytail: fixed 6-iteration tool loop; swap to streaming SSE if answers get long
  for (let i = 0; i < 6; i++) {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages, tools: assistantTools }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    if (data.error) throw new Error(`OpenRouter: ${data.error.message ?? JSON.stringify(data.error)}`);

    const message = data.choices?.[0]?.message;
    if (!message) throw new Error('OpenRouter returned no message');

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      // Reasoning models may leak <think> blocks into content — strip them.
      return String(message.content ?? '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();
    }

    messages.push(message);
    const imageParts: any[] = [];
    for (const call of toolCalls) {
      let text: string;
      try {
        const input = JSON.parse(call.function.arguments || '{}');
        const result = await runAssistantTool(user, call.function.name, input);
        text = result.text;
        if (result.imageDataUrl) {
          imageParts.push({ type: 'image_url', image_url: { url: result.imageDataUrl } });
        }
      } catch (err: any) {
        text = `Tool failed: ${err?.message ?? 'unknown error'}`;
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: text });
    }
    // Tool results are text-only on this wire format; images ride in a user turn.
    if (imageParts.length > 0) {
      messages.push({
        role: 'user',
        content: [{ type: 'text', text: 'Photo(s) from view_photo:' }, ...imageParts],
      });
    }
  }

  return 'I could not finish that in one go — please ask a more specific question.';
}

export async function POST(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Assistant is not configured (missing OPENROUTER_API_KEY).' }, { status: 503 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const run = () => runChat(user, parsed.data.messages);
    // Explicit tenant context so scoped models work for bearer (mobile) callers too.
    const reply = user.orgId ? await withTenantContext(user.orgId, run) : await run();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('[POST /api/assistant]', error);
    return NextResponse.json({ error: error?.message || 'Assistant failed' }, { status: 500 });
  }
}
