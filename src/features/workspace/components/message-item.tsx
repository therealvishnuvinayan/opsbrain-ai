"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OpsWorkspaceMessage } from "@/features/workspace/types";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  message: OpsWorkspaceMessage;
  onPromptSelect: (prompt: string) => void;
}

const reasoningModeLabels = {
  quick: "Quick",
  standard: "Standard",
  deep: "Deep",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function compactSourceLabel(value: string) {
  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

export function MessageItem({ message, onPromptSelect }: MessageItemProps) {
  const isUser = message.role === "user";
  const response = message.response;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <article className="max-w-[min(42rem,86%)] rounded-[30px] bg-[linear-gradient(135deg,rgba(59,130,246,0.98),rgba(139,92,246,0.98))] px-5 py-4 text-white shadow-[0_24px_60px_-42px_rgba(99,102,241,0.56)] md:px-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/80">
            <span className="flex h-7 w-7 items-center justify-center rounded-2xl bg-white/14">
              <UserRound className="h-4 w-4" />
            </span>
            <span>You</span>
            <span>·</span>
            <span>{formatTime(message.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>
        </article>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <article className="w-full max-w-4xl space-y-4">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(139,92,246,0.18))] text-primary dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(139,92,246,0.26))]">
            <Bot className="h-[18px] w-[18px]" />
          </span>
          <span className="text-foreground">OpsBrain</span>
          <span>·</span>
          <span>{formatTime(message.createdAt)}</span>
          {response ? (
            <Badge variant="neutral" className="ml-auto px-3 py-1">
              {reasoningModeLabels[response.reasoningMode]}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-6 rounded-[30px] bg-white/72 px-5 py-5 shadow-[0_22px_80px_-56px_rgba(16,24,40,0.22)] backdrop-blur dark:bg-slate-950/54 md:px-6">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/92">
            {message.content}
          </p>

          {response ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {response.diagnosis ? (
                  <Badge variant="warning" className="px-3 py-1">
                    {response.diagnosis}
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">{response.sourceLabel}</span>
              </div>

              {response.keyFindings.length > 0 ? (
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Key findings</p>
                  <ul className="space-y-3">
                    {response.keyFindings.map((finding, index) => (
                      <li
                        key={`${message.id}-finding-${index}`}
                        className="flex gap-3 text-sm leading-6 text-muted-foreground"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {response.evidence.length > 0 ? (
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Evidence</p>
                  <div className="space-y-3">
                    {response.evidence.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[22px] border-l border-border/80 bg-white/65 px-4 py-3 dark:bg-slate-900/56"
                      >
                        <p className="text-sm leading-6 text-muted-foreground">
                          {item.snippet}
                        </p>
                        {item.sourceId ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Source {compactSourceLabel(item.sourceId)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {response.relatedEntities.length > 0 ? (
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Related entities</p>
                  <div className="flex flex-wrap gap-2">
                    {response.relatedEntities.map((entity) => (
                      <Badge
                        key={`${message.id}-${entity.type}-${entity.id}`}
                        variant="neutral"
                        className="px-3 py-1 text-xs"
                      >
                        {entity.label}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              {response.recommendedActions.length > 0 ? (
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Recommended actions</p>
                  <div className="flex flex-wrap gap-2">
                    {response.recommendedActions.map((action) => (
                      <Link
                        key={`${message.id}-${action.label}-${action.href}`}
                        href={action.href}
                        className={cn(
                          buttonVariants({
                            variant: "outline",
                            size: "sm",
                          }),
                          "rounded-full border-white/70 bg-white/70 px-4 dark:border-white/[0.08] dark:bg-slate-900/62"
                        )}
                      >
                        {action.label}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {response.followUpPrompts.length > 0 ? (
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Follow-up</p>
                  <div className="flex flex-wrap gap-2">
                    {response.followUpPrompts.map((prompt) => (
                      <Button
                        key={`${message.id}-${prompt}`}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full px-4"
                        onClick={() => onPromptSelect(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </article>
    </div>
  );
}
