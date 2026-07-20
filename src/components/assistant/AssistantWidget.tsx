'use client';

// Floating AI assistant: chat over /api/assistant with voice input via the
// browser's native Web Speech API (no dependency; mic hidden if unsupported).

import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Mic, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        { role: 'assistant', content: res.ok ? data.reply : (data.error ?? 'Something went wrong.') },
      ]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Network error, please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || listening) return;
    const rec = new SR();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2 font-semibold">
              <Bot className="h-5 w-5" /> ICONA Assistant
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <p className="text-muted-foreground">
                Ask me about your payments, project progress, or site photos, e.g.{' '}
                <em>&quot;How much is still receivable on my villa project?&quot;</em>
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-8 rounded-lg bg-primary px-3 py-2 text-primary-foreground'
                    : 'mr-8 whitespace-pre-wrap rounded-lg bg-muted px-3 py-2'
                }
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="mr-8 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask anything…'}
              disabled={busy}
            />
            {voiceSupported && (
              <Button
                type="button"
                size="icon"
                variant={listening ? 'destructive' : 'outline'}
                onClick={startVoice}
                disabled={busy}
                aria-label="Voice input"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open ICONA Assistant"
      >
        <Bot className="h-6 w-6" />
      </Button>
    </div>
  );
}
