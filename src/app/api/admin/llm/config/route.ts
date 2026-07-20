import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { encryptSecret, maskSecret, decryptSecret } from '@/lib/crypto';

export interface LLMModelDef {
  id: string;
  provider: 'ollama' | 'gemini' | 'openrouter' | 'openai' | 'custom';
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string; // masked in GET responses
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export async function GET(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const settingsList = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'llm_active_provider',
            'llm_active_model',
            'llm_custom_models',
            'llm_max_tokens',
            'llm_temperature',
            'llm_starter_limit',
            'llm_growth_limit',
            'llm_enterprise_limit',
            'llm_rate_limit_qpm',
            'llm_system_prompt_override',
          ],
        },
      },
    });

    const settingsMap = settingsList.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);

    // Parse models list or provide defaults
    let models: LLMModelDef[] = [];
    if (settingsMap.llm_custom_models) {
      try {
        const parsed = JSON.parse(settingsMap.llm_custom_models);
        models = parsed.map((m: LLMModelDef) => ({
          ...m,
          apiKey: maskSecret(m.apiKey || ''),
        }));
      } catch (e) {
        console.error('Failed to parse llm_custom_models JSON:', e);
      }
    }

    if (models.length === 0) {
      models = [
        {
          id: 'model-ollama-qwen',
          provider: 'ollama',
          name: 'Self-Hosted Ollama (Qwen 2.5 7B)',
          model: 'qwen2.5:7b-instruct',
          baseUrl: 'http://localhost:11434/v1',
          apiKey: '••••••••ollama',
          isDefault: true,
          status: 'ACTIVE',
        },
        {
          id: 'model-gemini-flash',
          provider: 'gemini',
          name: 'Cloud Google Gemini 1.5 Flash',
          model: 'gemini-1.5-flash',
          baseUrl: 'https://generativelanguage.googleapis.com',
          apiKey: '••••••••gemini',
          isDefault: false,
          status: 'ACTIVE',
        },
      ];
    }

    return NextResponse.json({
      activeProvider: settingsMap.llm_active_provider || 'ollama',
      activeModel: settingsMap.llm_active_model || 'qwen2.5:7b-instruct',
      maxTokens: parseInt(settingsMap.llm_max_tokens || '2048', 10),
      temperature: parseFloat(settingsMap.llm_temperature || '0.2'),
      starterLimit: parseInt(settingsMap.llm_starter_limit || '250', 10),
      growthLimit: parseInt(settingsMap.llm_growth_limit || '1000', 10),
      enterpriseLimit: parseInt(settingsMap.llm_enterprise_limit || '5000', 10),
      rateLimitQpm: parseInt(settingsMap.llm_rate_limit_qpm || '10', 10),
      systemPromptOverride: settingsMap.llm_system_prompt_override || '',
      models,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/llm/config] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch LLM configuration' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminUser(req);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await req.json();
    const {
      activeProvider,
      activeModel,
      maxTokens,
      temperature,
      starterLimit,
      growthLimit,
      enterpriseLimit,
      rateLimitQpm,
      systemPromptOverride,
      models,
    } = body;

    const updates: { key: string; value: string }[] = [];

    if (activeProvider) updates.push({ key: 'llm_active_provider', value: String(activeProvider) });
    if (activeModel) updates.push({ key: 'llm_active_model', value: String(activeModel) });
    if (maxTokens) updates.push({ key: 'llm_max_tokens', value: String(maxTokens) });
    if (temperature !== undefined) updates.push({ key: 'llm_temperature', value: String(temperature) });
    if (starterLimit) updates.push({ key: 'llm_starter_limit', value: String(starterLimit) });
    if (growthLimit) updates.push({ key: 'llm_growth_limit', value: String(growthLimit) });
    if (enterpriseLimit) updates.push({ key: 'llm_enterprise_limit', value: String(enterpriseLimit) });
    if (rateLimitQpm) updates.push({ key: 'llm_rate_limit_qpm', value: String(rateLimitQpm) });
    if (systemPromptOverride !== undefined) updates.push({ key: 'llm_system_prompt_override', value: String(systemPromptOverride) });

    if (Array.isArray(models)) {
      // Process model definitions & encrypt secret API keys
      const processedModels = models.map((m: LLMModelDef) => {
        let key = m.apiKey || '';
        // If incoming key is masked placeholder, keep existing DB value if possible, else encrypt new raw key
        if (!key.startsWith('••••••••') && key.trim() !== '') {
          key = encryptSecret(key.trim());
        }
        return {
          ...m,
          apiKey: key,
        };
      });

      updates.push({ key: 'llm_custom_models', value: JSON.stringify(processedModels) });
    }

    const prismaUpserts = updates.map((u) =>
      prisma.systemSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      })
    );

    await prisma.$transaction(prismaUpserts);

    return NextResponse.json({
      success: true,
      message: 'LLM models, limitations, and prompt guardrails updated successfully.',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/llm/config] Error:', error);
    return NextResponse.json({ error: 'Failed to update LLM configuration' }, { status: 500 });
  }
}
