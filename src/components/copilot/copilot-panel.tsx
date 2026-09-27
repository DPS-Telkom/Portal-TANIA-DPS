"use client";

import { RefreshCw, Send, SquarePen, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Markdown } from "@/components/copilot/markdown";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { MAX_QUESTION_CHARS, askCopilot, getBriefing, suggestionsFor } from "@/lib/copilot";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ChatItem {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

// AV-01/AV-05 — docked on the dashboard (with briefing), floating elsewhere.
// Chat history is private per user (RLS: own rows only).
export function CopilotPanel({ withBriefing, onClose, className }: { withBriefing: boolean; onClose?: () => void; className?: string }) {
  const { profile } = useAuth();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingNote, setBriefingNote] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(withBriefing);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const loadBriefing = useCallback(async (force: boolean) => {
    setBriefingLoading(true);
    setBriefingNote(null);
    try {
      const res = await getBriefing(force);
      setBriefing(res.reply);
      if (res.notice) setBriefingNote(res.notice);
    } catch (e) {
      setBriefingNote(e instanceof Error ? e.message : "Briefing tidak tersedia.");
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  // Briefing: once per dashboard load; the function serves today's cache.
  // The ref also absorbs React StrictMode's double effect run in development,
  // so two concurrent requests never generate (and bill) two briefings.
  const briefingRequested = useRef(false);
  useEffect(() => {
    if (!withBriefing || briefingRequested.current) return;
    briefingRequested.current = true;
    loadBriefing(false);
  }, [withBriefing, loadBriefing]);

  const loadConversation = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(((data ?? []) as ChatItem[]).reverse());
    setConversationId(id);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);
      const list = (data ?? []) as Conversation[];
      setConversations(list);
      if (list[0]) loadConversation(list[0].id);
    })();
  }, [loadConversation]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [items, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    if (question.length > MAX_QUESTION_CHARS) return;
    setInput("");
    setItems((list) => [...list, { role: "user", content: question }]);
    setSending(true);
    try {
      const res = await askCopilot(question, conversationId);
      setItems((list) => [...list, { role: "assistant", content: res.reply }]);
      if (res.conversation_id !== conversationId) {
        setConversationId(res.conversation_id);
        setConversations((c) => [
          { id: res.conversation_id, title: question.slice(0, 80), updated_at: new Date().toISOString() },
          ...c.filter((x) => x.id !== res.conversation_id),
        ]);
      }
    } catch (e) {
      setItems((list) => [
        ...list,
        { role: "assistant", content: e instanceof Error ? e.message : "Terjadi kesalahan.", error: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  function newConversation() {
    setConversationId(null);
    setItems([]);
  }

  if (!profile) return null;
  const chips = suggestionsFor(profile.role);

  return (
    <section
      aria-label="TANIA Copilot"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background", className)}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-telkom-red text-xs font-bold text-white">AI</span>
          <div>
            <div className="text-sm font-semibold leading-tight">TANIA Copilot</div>
            <div className="text-[11px] text-muted-foreground">Read-only · sesuai hak akses Anda</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Percakapan baru" title="Percakapan baru" onClick={newConversation}>
            <SquarePen />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon-sm" aria-label="Tutup copilot" onClick={onClose}>
              <X />
            </Button>
          )}
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {withBriefing && (
          <div className="rounded-md border border-telkom-red/30 bg-telkom-red/5 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-telkom-red uppercase">Briefing hari ini</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Perbarui briefing"
                title="Perbarui briefing"
                disabled={briefingLoading}
                onClick={() => loadBriefing(true)}
              >
                <RefreshCw className={cn(briefingLoading && "animate-spin")} />
              </Button>
            </div>
            {briefingLoading ? (
              <p className="text-muted-foreground">Menyusun briefing…</p>
            ) : briefing ? (
              <Markdown text={briefing} />
            ) : null}
            {briefingNote && <p className="mt-1 text-xs text-muted-foreground">{briefingNote}</p>}
          </div>
        )}

        {conversations.length > 1 && (
          <select
            className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={conversationId ?? ""}
            onChange={(e) => (e.target.value ? loadConversation(e.target.value) : newConversation())}
            aria-label="Riwayat percakapan"
          >
            <option value="">— Percakapan baru —</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.title ?? "Percakapan").slice(0, 60)}
              </option>
            ))}
          </select>
        )}

        {items.length === 0 && !sending && (
          <div className="space-y-2">
            <p className="text-muted-foreground">Tanyakan kondisi talent, timesheet, workload, feasibility, atau budget.</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => send(c)}
                  className="rounded-full border px-2.5 py-1 text-left text-xs hover:border-telkom-red hover:text-telkom-red"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2",
                m.role === "user" ? "bg-telkom-red text-white" : "bg-muted",
                m.error && "bg-red-50 text-red-900",
              )}
            >
              {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-muted-foreground">TANIA sedang membaca data…</p>}
      </div>

      <form
        className="border-t p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            rows={1}
            placeholder="Tanya TANIA…"
            maxLength={MAX_QUESTION_CHARS}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            aria-label="Pertanyaan untuk TANIA Copilot"
          />
          <Button type="submit" size="icon" aria-label="Kirim" disabled={sending || !input.trim()}>
            <Send />
          </Button>
        </div>
        {input.length > MAX_QUESTION_CHARS * 0.8 && (
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {input.length}/{MAX_QUESTION_CHARS}
          </p>
        )}
      </form>
    </section>
  );
}
