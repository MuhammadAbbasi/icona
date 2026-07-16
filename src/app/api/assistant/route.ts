// POST /api/assistant — the client-facing AI assistant (Claude with tools).
// Stateless: the widget sends the visible conversation each turn; we run the
// tool loop server-side and return the final text answer.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getApiUser, type ApiUser } from '@/lib/apiAuth';
import { withTenantContext } from '@/lib/tenantPrisma';
import { assistantTools, runAssistantTool } from '@/lib/assistant';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

async function runChat(
  anthropic: Anthropic,
  user: ApiUser,
  history: Anthropic.MessageParam[],
): Promise<string> {
  const messages = [...history];

  // ponytail: fixed 6-iteration tool loop; swap to streaming SSE if answers get long
  for (let i = 0; i < 6; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemPrompt(user),
      tools: assistantTools,
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
    }

    messages.push({ role: 'assistant', content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      try {
        const content = await runAssistantTool(user, block.name, block.input as Record<string, unknown>);
        results.push({ type: 'tool_result', tool_use_id: block.id, content });
      } catch (err: any) {
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Tool failed: ${err?.message ?? 'unknown error'}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: results });
  }

  return 'I could not finish that in one go — please ask a more specific question.';
}

export async function POST(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Assistant is not configured (missing ANTHROPIC_API_KEY).' }, { status: 503 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const anthropic = new Anthropic();
    const run = () => runChat(anthropic, user, parsed.data.messages);
    // Explicit tenant context so scoped models work for bearer (mobile) callers too.
    const reply = user.orgId ? await withTenantContext(user.orgId, run) : await run();

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('[POST /api/assistant]', error);
    return NextResponse.json({ error: error?.message || 'Assistant failed' }, { status: 500 });
  }
}
