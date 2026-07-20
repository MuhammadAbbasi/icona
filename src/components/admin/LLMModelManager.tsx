'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu, Plus, Trash2, Edit3, Check, ShieldAlert, Sliders, Lock, Sparkles,
  RefreshCw, CheckCircle2, AlertTriangle, Save, Server, Globe, Key, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface LLMModelDef {
  id: string;
  provider: 'ollama' | 'gemini' | 'openrouter' | 'openai' | 'custom';
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export function LLMModelManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Configuration State
  const [models, setModels] = useState<LLMModelDef[]>([]);
  const [activeProvider, setActiveProvider] = useState('ollama');
  const [activeModel, setActiveModel] = useState('qwen2.5:7b-instruct');
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.2);
  const [starterLimit, setStarterLimit] = useState(250);
  const [growthLimit, setGrowthLimit] = useState(1000);
  const [enterpriseLimit, setEnterpriseLimit] = useState(5000);
  const [rateLimitQpm, setRateLimitQpm] = useState(10);
  const [systemPromptOverride, setSystemPromptOverride] = useState('');

  // Modal State for Adding/Editing Models
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modalProvider, setModalProvider] = useState<'ollama' | 'gemini' | 'openrouter' | 'openai' | 'custom'>('ollama');
  const [modalName, setModalName] = useState('');
  const [modalModel, setModalModel] = useState('');
  const [modalBaseUrl, setModalBaseUrl] = useState('');
  const [modalApiKey, setModalApiKey] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/llm/config');
      if (res.ok) {
        const d = await res.json();
        setModels(d.models || []);
        setActiveProvider(d.activeProvider || 'ollama');
        setActiveModel(d.activeModel || 'qwen2.5:7b-instruct');
        setMaxTokens(d.maxTokens || 2048);
        setTemperature(d.temperature || 0.2);
        setStarterLimit(d.starterLimit || 250);
        setGrowthLimit(d.growthLimit || 1000);
        setEnterpriseLimit(d.enterpriseLimit || 5000);
        setRateLimitQpm(d.rateLimitQpm || 10);
        setSystemPromptOverride(d.systemPromptOverride || '');
      } else {
        setError('Failed to fetch LLM configuration settings.');
      }
    } catch {
      setError('Network error fetching LLM settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (res.ok) {
        setSuccess('LLM configurations, limitations, and prompt rules saved successfully.');
        await fetchConfig();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save configuration.');
      }
    } catch {
      setError('Network error saving LLM configurations.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddModel = () => {
    setEditingModelId(null);
    setModalProvider('ollama');
    setModalName('');
    setModalModel('');
    setModalBaseUrl('http://localhost:11434/v1');
    setModalApiKey('');
    setIsModalOpen(true);
  };

  const handleOpenEditModel = (m: LLMModelDef) => {
    setEditingModelId(m.id);
    setModalProvider(m.provider);
    setModalName(m.name);
    setModalModel(m.model);
    setModalBaseUrl(m.baseUrl);
    setModalApiKey(m.apiKey);
    setIsModalOpen(true);
  };

  const handleSaveModelForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName || !modalModel) return;

    if (editingModelId) {
      setModels((prev) =>
        prev.map((m) =>
          m.id === editingModelId
            ? {
                ...m,
                provider: modalProvider,
                name: modalName.trim(),
                model: modalModel.trim(),
                baseUrl: modalBaseUrl.trim(),
                apiKey: modalApiKey.trim(),
              }
            : m
        )
      );
    } else {
      const newDef: LLMModelDef = {
        id: `model-${Date.now()}`,
        provider: modalProvider,
        name: modalName.trim(),
        model: modalModel.trim(),
        baseUrl: modalBaseUrl.trim(),
        apiKey: modalApiKey.trim(),
        isDefault: models.length === 0,
        status: 'ACTIVE',
      };
      setModels((prev) => [...prev, newDef]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteModel = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleModelStatus = (id: string) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : m
      )
    );
  };

  const handleSetDefaultModel = (m: LLMModelDef) => {
    setActiveProvider(m.provider);
    setActiveModel(m.model);
    setModels((prev) =>
      prev.map((item) => ({
        ...item,
        isDefault: item.id === m.id,
      }))
    );
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">Loading LLM model registry & parameters…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* 1. LLM Models Registry & Addition */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#2563EB]" /> Registered LLM Engines & Providers
            </h3>
            <p className="text-xs text-slate-500">Define local self-hosted GPU endpoints, cloud APIs, and active default models</p>
          </div>
          <Button size="sm" onClick={handleOpenAddModel} className="gap-1.5 text-xs bg-[#2563EB] hover:bg-[#1A365D] text-white">
            <Plus className="w-4 h-4" /> Add Custom Model
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((m) => {
            const isSelectedDefault = activeProvider === m.provider && activeModel === m.model;
            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isSelectedDefault
                    ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0F172A]">{m.name}</span>
                    {isSelectedDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-600 text-white">
                        Active Engine
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModel(m)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                      title="Edit Model"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteModel(m.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete Model"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Provider / Model:</span>
                    <span className="font-bold text-slate-800">{m.provider} ({m.model})</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span className="text-slate-400 font-sans">Endpoint:</span>
                    <span className="text-sky-600 truncate max-w-[200px]">{m.baseUrl}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleModelStatus(m.id)}
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      m.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {m.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                  </button>

                  {!isSelectedDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefaultModel(m)}
                      className="text-xs h-7"
                    >
                      Set as Active Engine
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Hyperparameters & Conditions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 border-b border-slate-100 pb-2">
          <Sliders className="w-4 h-4 text-[#2563EB]" /> Model Hyperparameters & Execution Conditions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="max-tokens">Max Output Tokens per Request</Label>
            <Input
              id="max-tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 2048)}
              min={512}
              max={8192}
            />
            <p className="text-[11px] text-slate-400">Controls maximum response length (512 - 8192 tokens)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="temp">Temperature (Creativity vs Accuracy)</Label>
            <Input
              id="temp"
              type="number"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.2)}
              min={0}
              max={1}
            />
            <p className="text-[11px] text-slate-400">0.1 - 0.3 recommended for ERP financial calculations</p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs pt-2">
          <Label htmlFor="prompt-override">Master System Prompt Overrides & Guardrails</Label>
          <textarea
            id="prompt-override"
            value={systemPromptOverride}
            onChange={(e) => setSystemPromptOverride(e.target.value)}
            rows={3}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white"
            placeholder="e.g. Enforce Roman Urdu comprehension, restrict cross-tenant financial reads..."
          />
        </div>
      </div>

      {/* 3. Tenant Tier Limitations & Rate Limits */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" /> Plan Tier Limitations & Rate Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="lim-starter">Starter Tier Cap (Queries/Mo)</Label>
            <Input
              id="lim-starter"
              type="number"
              value={starterLimit}
              onChange={(e) => setStarterLimit(parseInt(e.target.value, 10) || 250)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lim-growth">Growth Tier Cap (Queries/Mo)</Label>
            <Input
              id="lim-growth"
              type="number"
              value={growthLimit}
              onChange={(e) => setGrowthLimit(parseInt(e.target.value, 10) || 1000)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lim-enterprise">Enterprise Tier Cap (Queries/Mo)</Label>
            <Input
              id="lim-enterprise"
              type="number"
              value={enterpriseLimit}
              onChange={(e) => setEnterpriseLimit(parseInt(e.target.value, 10) || 5000)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lim-qpm">Rate Limit (QPM / User)</Label>
            <Input
              id="lim-qpm"
              type="number"
              value={rateLimitQpm}
              onChange={(e) => setRateLimitQpm(parseInt(e.target.value, 10) || 10)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSaveConfig}
            disabled={saving}
            className="gap-2 bg-[#2563EB] hover:bg-[#1A365D] text-white"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Apply LLM Configurations
          </Button>
        </div>
      </div>

      {/* Add / Edit Model Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#0F172A]">
                {editingModelId ? 'Edit LLM Model Definition' : 'Add Custom LLM Model'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModelForm} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="mod-name">Display Name *</Label>
                <Input
                  id="mod-name"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Local GPU Qwen 2.5 7B"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mod-provider">Provider Type</Label>
                  <select
                    id="mod-provider"
                    value={modalProvider}
                    onChange={(e) => setModalProvider(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="ollama">Ollama (Local)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">OpenAI</option>
                    <option value="custom">Custom REST</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mod-model">Model String *</Label>
                  <Input
                    id="mod-model"
                    value={modalModel}
                    onChange={(e) => setModalModel(e.target.value)}
                    placeholder="e.g. qwen2.5:7b-instruct"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="mod-url">Base Endpoint URL *</Label>
                <Input
                  id="mod-url"
                  value={modalBaseUrl}
                  onChange={(e) => setModalBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mod-key">API Secret Key (Optional for Local Ollama)</Label>
                <Input
                  id="mod-key"
                  type="password"
                  value={modalApiKey}
                  onChange={(e) => setModalApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-[#2563EB] text-white">
                  Save Model Definition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
