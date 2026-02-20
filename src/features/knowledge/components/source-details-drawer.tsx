"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";

import type { KnowledgeCollection, KnowledgeSource } from "@/features/knowledge/types";
import {
  accessBadgeVariant,
  formatBytes,
  formatDateTime,
  sourceStatusBadgeVariant,
  sourceTypeLabel,
} from "@/features/knowledge/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DrawerTab = "OVERVIEW" | "PREVIEW" | "ERRORS" | "ASK";

interface SourceDetailsDrawerProps {
  source: KnowledgeSource | null;
  open: boolean;
  onClose: () => void;
  collections: KnowledgeCollection[];
  initialTab?: DrawerTab;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const tabs: DrawerTab[] = ["OVERVIEW", "PREVIEW", "ERRORS", "ASK"];

function tabLabel(tab: DrawerTab) {
  switch (tab) {
    case "OVERVIEW":
      return "Overview";
    case "PREVIEW":
      return "Preview";
    case "ERRORS":
      return "Errors";
    case "ASK":
    default:
      return "Ask";
  }
}

export function SourceDetailsDrawer({
  source,
  open,
  onClose,
  collections,
  initialTab = "OVERVIEW",
}: SourceDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sourceCollections = useMemo(() => {
    if (!source) {
      return [];
    }

    return collections.filter((collection) => source.collections.includes(collection.id));
  }, [collections, source]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab(initialTab);
    setMessages([]);
    setDraft("");
  }, [initialTab, open, source?.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!open || !source) {
    return null;
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();

    const question = draft.trim();

    if (!question || isThinking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `q-${Date.now()}`,
      role: "user",
      content: question,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsThinking(true);

    window.setTimeout(() => {
      const responseText = `(Demo) Searching indexed chunks for \"${source.name}\". ` +
        `Top signal: ${source.previewChunks[0] ?? "No indexed chunk available."}`;

      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: responseText,
        },
      ]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-[1px]">
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-white/15 bg-slate-950/95 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">{source.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={sourceStatusBadgeVariant(source.status)}>{source.status}</Badge>
              <Badge variant={accessBadgeVariant(source.access)}>{source.access}</Badge>
              <Badge variant="neutral">{sourceTypeLabel(source.type)}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close source drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground"
              )}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "OVERVIEW" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="text-sm font-medium">{source.owner}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Last synced</p>
                  <p className="text-sm font-medium">{formatDateTime(source.lastSyncedAt)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Chunk count</p>
                  <p className="text-sm font-medium">{source.chunksCount.toLocaleString("en-US")}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="text-sm font-medium">{formatBytes(source.sizeBytes)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Collections
                </p>
                <div className="flex flex-wrap gap-2">
                  {sourceCollections.length === 0 ? (
                    <Badge variant="neutral">Not assigned</Badge>
                  ) : (
                    sourceCollections.map((collection) => (
                      <Badge key={collection.id} variant="neutral">
                        {collection.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {source.tags.length === 0 ? (
                    <Badge variant="neutral">No tags</Badge>
                  ) : (
                    source.tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "PREVIEW" ? (
            <div className="space-y-2">
              {source.previewChunks.slice(0, 10).map((chunk, index) => (
                <article
                  key={`${source.id}-chunk-${index}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chunk {index + 1}
                  </p>
                  {chunk}
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "ERRORS" ? (
            source.status === "FAILED" && source.errorMessage ? (
              <div className="space-y-2 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                <p className="font-semibold">Ingestion failed</p>
                <p>{source.errorMessage}</p>
                <p className="text-xs">Next step: reconnect credentials or validate source payload shape, then retry sync.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                No active ingestion errors for this source.
              </div>
            )
          ) : null}

          {activeTab === "ASK" ? (
            <div className="flex h-full min-h-[320px] flex-col gap-3">
              <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ask a question about this source. Responses are demo-only and grounded on indexed chunk previews.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                        message.role === "assistant"
                          ? "bg-primary/15 text-primary"
                          : "ml-auto bg-white/[0.06] text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                {isThinking ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-sm text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>(Demo) Searching indexed chunks…</span>
                  </div>
                ) : null}
              </div>

              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="What changed in supplier matching policy?"
                />
                <Button type="submit" size="icon" aria-label="Send question">
                  {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-5 py-3 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            <span>Knowledge retrieval sandbox (demo mode)</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
