// POST /api/assistant — the client-facing & admin-facing AI assistant.
// Reads active LLM engine settings, base URLs, API keys, max tokens, temperature,
// and prompt guardrails configured by Super Admin in System Settings.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUser, type ApiUser } from '@/lib/apiAuth';
import { withTenantContext } from '@/lib/tenantPrisma';
import { assistantTools, runAssistantTool } from '@/lib/assistant';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/crypto';

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

function normalizeLlmBaseUrl(provider: string, rawUrl: string): string {
  let cleaned = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!cleaned) {
    return provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://openrouter.ai/api/v1';
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }
  if (provider === 'ollama') {
    // Check if port is missing
    const hasPort = /:\d+/.test(cleaned.replace(/^https?:\/\//, ''));
    if (!hasPort && !cleaned.includes('localhost') && !cleaned.includes('127.0.0.1')) {
      cleaned = `${cleaned}:11434`;
    }
    if (!cleaned.endsWith('/v1')) {
      cleaned = `${cleaned}/v1`;
    }
  }
  return cleaned;
}

async function getLLMConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'llm_active_provider',
          'llm_active_model',
          'llm_custom_models',
          'llm_max_tokens',
          'llm_temperature',
          'llm_system_prompt_override',
        ],
      },
    },
  });

  const map = settings.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {} as Record<string, string>);

  const provider = map.llm_active_provider || process.env.LLM_PROVIDER || 'ollama';
  const model = map.llm_active_model || process.env.LLM_MODEL || 'qwen2.5:3b-instruct';
  const maxTokens = parseInt(map.llm_max_tokens || '2048', 10);
  const temperature = parseFloat(map.llm_temperature || '0.2');
  const promptOverride = map.llm_system_prompt_override || '';

  let rawBaseUrl = process.env.LLM_BASE_URL || (provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://openrouter.ai/api/v1');
  let apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || 'ollama';

  if (map.llm_custom_models) {
    try {
      const models = JSON.parse(map.llm_custom_models);
      const active = models.find((m: any) => m.provider === provider && m.model === model) || models[0];
      if (active) {
        if (active.baseUrl) rawBaseUrl = active.baseUrl;
        if (active.apiKey && active.apiKey !== '••••••••') {
          apiKey = decryptSecret(active.apiKey);
        }
      }
    } catch (e) {
      console.error('Failed to parse custom LLM models:', e);
    }
  }

  const baseUrl = normalizeLlmBaseUrl(provider, rawBaseUrl);
  return { provider, model, baseUrl, apiKey, maxTokens, temperature, promptOverride };
}

function buildSystemPrompt(user: ApiUser, promptOverride: string): string {
  const baseRules = [
    'You are the ICONA Assistant, built into the ICONA construction ERP & CRM.',
    `The signed-in user's role is ${user.role}. All money is PKR (Pakistani Rupees) - format like "PKR 1,250,000".`,
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
    'Answer ONLY from tool data - never invent figures, projects or photos.',
    'If the user names a project, resolve it with list_projects first.',
    'When asked about a photo or site work, use list_photos then view_photo to visually inspect it.',
    'Be concise, accurate, and direct.',
  ];

  if (promptOverride && promptOverride.trim()) {
    baseRules.push('', '### SUPER ADMIN GUARDRAIL INSTRUCTIONS:', promptOverride.trim());
  }

  return baseRules.join('\n');
}

async function runChat(user: ApiUser, history: { role: string; content: string }[]): Promise<string> {
  const config = await getLLMConfig();
  const messages: any[] = [{ role: 'system', content: buildSystemPrompt(user, config.promptOverride) }, ...history];
  const url = `${config.baseUrl}/chat/completions`;

  // Fixed 6-iteration tool loop
  for (let i = 0; i < 6; i++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          tools: assistantTools,
          tool_choice: 'auto',
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
      });
    } catch (fetchErr: any) {
      console.error(`LLM Connection error to ${url}:`, fetchErr);
      if (process.env.OPENROUTER_API_KEY) {
        // Fallback to cloud OpenRouter
        const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'qwen/qwen-2.5-7b-instruct',
            messages,
            tools: assistantTools,
            tool_choice: 'auto',
            temperature: config.temperature,
            max_tokens: config.maxTokens,
          }),
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const choice = data.choices?.[0]?.message;
          if (choice) return choice.content || 'Completed request using cloud fallback.';
        }
      }
      throw new Error(`Could not connect to Ollama model endpoint at ${config.baseUrl}. Please check that Ollama is running and accessible.`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LLM provider call failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error('No choice returned from LLM provider.');

    messages.push(choice);

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return choice.content || 'I have completed your request.';
    }

    // Execute each tool requested by the model
    for (const toolCall of choice.tool_calls) {
      const name = toolCall.function?.name;
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(toolCall.function?.arguments || '{}');
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }

      let toolResult: any;
      try {
        toolResult = await runAssistantTool(user, name, args);
      } catch (err: any) {
        toolResult = { error: err.message || 'Tool execution failed' };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return 'Completed maximum reasoning iterations.';
}

export async function POST(req: Request) {
  try {
    const user = await getApiUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid message payload' }, { status: 400 });
    }

    // Wrap execution inside tenant context if orgId is set
    const reply = user.orgId
      ? await withTenantContext(user.orgId, () => runChat(user, parsed.data.messages))
      : await runChat(user, parsed.data.messages);

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('[POST /api/assistant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal AI assistant error' },
      { status: 500 }
    );
  }
}
