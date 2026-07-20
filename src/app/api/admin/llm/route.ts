import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/adminAuth';

let currentProvider = process.env.LLM_PROVIDER || 'ollama';
let currentModel = process.env.LLM_MODEL || 'qwen2.5:7b-instruct';

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  return NextResponse.json({
    activeEngine: {
      provider: currentProvider,
      model: currentModel,
      baseUrl: currentProvider === 'ollama' ? 'http://localhost:11434/v1' : 'https://generativelanguage.googleapis.com',
      vramUsagePercent: 68,
      requestQueueDepth: 0,
      status: 'ONLINE',
    },
    telemetry: {
      totalQueriesToday: 412,
      totalQueriesMonth: 3625,
      inputTokensMonth: 4920000,
      outputTokensMonth: 1280000,
      totalTokensMonth: 6200000,
      estCostUsd: 2.17,
      estCostPkr: 607,
      avgTtftMs: 140,
      avgLatencyMs: 395,
      errorRatePercent: 0.6,
    },
    tenants: [
      {
        id: 'cl1',
        name: 'Skyline Infrastructure',
        plan: 'enterprise',
        queries: 3120,
        queryCap: 5000,
        inputTokens: 4200000,
        outputTokens: 1100000,
        estCostUsd: 1.85,
        copilotState: 'Active',
      },
      {
        id: 'cl2',
        name: 'Apex Builders Ltd',
        plan: 'growth',
        queries: 420,
        queryCap: 1000,
        inputTokens: 610000,
        outputTokens: 150000,
        estCostUsd: 0.27,
        copilotState: 'Active',
      },
      {
        id: 'cl3',
        name: 'Al-Rehman Construction',
        plan: 'starter',
        queries: 85,
        queryCap: 1000,
        inputTokens: 110000,
        outputTokens: 28000,
        estCostUsd: 0.05,
        copilotState: 'Active',
      },
    ],
  });
}

export async function POST(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await req.json();
    if (body.provider) {
      currentProvider = body.provider;
      currentModel = body.provider === 'gemini' ? 'gemini-1.5-flash' : 'qwen2.5:7b-instruct';
    }
    return NextResponse.json({ success: true, activeProvider: currentProvider, activeModel: currentModel });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to switch LLM engine' }, { status: 500 });
  }
}
