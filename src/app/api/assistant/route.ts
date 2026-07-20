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

const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || 'http://192.168.1.40:11434/v1';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b-instruct';
const API_KEY = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || 'ollama';

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
    '',
    '### MULTILINGUAL & ROMAN URDU COMPREHENSION RULES:',
    '1. Users will write in English, Urdu script (اردو), or Roman Urdu (e.g., "Canal Plaza ka kitna kharcha hua hai?", "Naya project add karo").',
    '2. Map South Asian currency units to exact numbers:',
    '   - 1 Lakh / 1 Lac = 100,000 PKR',
    '   - 1 Crore = 10,000,000 PKR',
    '   - 50 Lac = 5,000,000 PKR',
    '3. Map construction & accounting vocabulary:',
    '   - "Mistry" / "Mazdoor" -> Labour / Workers',
    '   - "Thekedar" -> Subcontractor',
    '   - "Kharcha" / "Lagat" -> Expenses / Transactions',
    '   - "Advance" / "Hisaab" -> Owner Drawing / Payout / Financial Ledger',
    '   - "Hazri" -> Attendance',
    '4. Language matching: Respond in natural Roman Urdu if the user typed in Roman Urdu, in Urdu script if typed in Urdu script, or English if typed in English.',
    '',
    '### DATA INTEGRITY & TOOL USAGE:',
    'Answer ONLY from tool data — never invent figures, projects or photos.',
    'If the user names a project, resolve it with list_projects first.',
    'When asked about a photo or site work, use list_photos then view_photo to visually inspect it.',
    'Be concise, accurate, and direct.',
  ].join('\n');
}

async function runChat(user: ApiUser, history: { role: string; content: string }[]): Promise<string> {
  const messages: any[] = [{ role: 'system', content: systemPrompt(user) }, ...history];
  const url = `${DEFAULT_BASE_URL.replace(/\/+$/, '')}/chat/completions`;

  // Fixed 6-iteration tool loop
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: DEFAULT_MODEL, messages, tools: assistantTools }),
    });
    if (!res.ok) throw new Error(`LLM Server (${url}) ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    if (data.error) throw new Error(`LLM Error: ${data.error.message ?? JSON.stringify(data.error)}`);

    const message = data.choices?.[0]?.message;
    if (!message) throw new Error('LLM server returned no message choices');

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
