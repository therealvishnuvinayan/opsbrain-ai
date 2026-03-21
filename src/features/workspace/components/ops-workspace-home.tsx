"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkspaceCategory } from "@/features/workspace/components/category-pills";
import {
  FloatingOpsComposer,
} from "@/features/workspace/components/floating-ops-composer";
import { PromptSuggestions } from "@/features/workspace/components/prompt-suggestions";
import type { ComposerTool } from "@/features/workspace/components/composer-tool-rail";
import { WorkspaceHeader } from "@/features/workspace/components/workspace-header";
import { WorkspaceHeroStage } from "@/features/workspace/components/workspace-hero-stage";
import { WorkspaceResultStage } from "@/features/workspace/components/workspace-result-stage";
import { useOpsWorkspaceChat } from "@/features/workspace/hooks/use-ops-workspace-chat";
import type { OpsWorkspaceMessage } from "@/features/workspace/types";
import { cn } from "@/lib/utils";

const starterPrompts = [
  "What needs escalation today?",
  "Investigate supplier delay issues.",
  "Summarize the highest operational risk.",
  "Explain the latest payout anomaly.",
];

export function OpsWorkspaceHome() {
  const {
    messages,
    inputValue,
    setInputValue,
    reasoningMode,
    setReasoningMode,
    status,
    errorMessage,
    setErrorMessage,
    isSubmitting,
    submitQuestion,
    refreshStatus,
    clearConversation,
  } = useOpsWorkspaceChat();
  const [category, setCategory] = useState<WorkspaceCategory>("ops_ai");
  const [tool, setTool] = useState<ComposerTool>("reconciliation");

  const latestAssistantResponse = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (message.role === "assistant" && message.response) {
        return message.response;
      }
    }

    return null;
  }, [messages]);

  const hasConversation = messages.length > 0 || isSubmitting;
  const composerDisabled = status.status === "not_configured";
  const promptSuggestions =
    latestAssistantResponse?.followUpPrompts.length
      ? latestAssistantResponse.followUpPrompts
      : starterPrompts;

  const submitLabel =
    status.status === "not_configured" ? "Backend required" : "Ask OpsBrain";

  const noticeTone = errorMessage
    ? "danger"
    : status.status === "not_configured"
      ? "warning"
      : status.status === "unavailable"
        ? "neutral"
        : null;

  const noticeMessage =
    errorMessage ||
    (status.status === "unavailable" || status.status === "not_configured"
      ? status.detail
      : null);

  function handlePromptSelect(prompt: string) {
    setInputValue(prompt);
    void submitQuestion(prompt);
  }

  function handleClearConversation() {
    clearConversation();
    setErrorMessage(null);
  }

  const notice = noticeMessage ? (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-sm shadow-[0_18px_50px_-40px_rgba(16,24,40,0.28)]",
        noticeTone === "danger"
          ? "bg-danger/10 text-danger"
          : noticeTone === "warning"
            ? "bg-warning/12 text-warning"
            : "bg-white/74 text-muted-foreground ring-1 ring-black/[0.05] backdrop-blur dark:bg-slate-950/68 dark:ring-white/[0.08]"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0 leading-6">{noticeMessage}</p>
      </div>
      {status.status === "unavailable" || errorMessage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => void refreshStatus()}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      ) : null}
    </div>
  ) : null;

  const resultStages = useMemo(() => {
    const stages: Array<{
      prompt: OpsWorkspaceMessage;
      response?: OpsWorkspaceMessage;
    }> = [];

    let pendingPrompt: OpsWorkspaceMessage | null = null;

    for (const message of messages) {
      if (message.role === "user") {
        pendingPrompt = message;
        continue;
      }

      if (message.role === "assistant" && pendingPrompt) {
        stages.push({ prompt: pendingPrompt, response: message });
        pendingPrompt = null;
      }
    }

    if (pendingPrompt) {
      stages.push({ prompt: pendingPrompt });
    }

    return stages;
  }, [messages]);

  if (!hasConversation) {
    return (
      <WorkspaceHeroStage
        category={category}
        onCategoryChange={setCategory}
        notice={notice}
        composer={
          <FloatingOpsComposer
            value={inputValue}
            submitLabel={submitLabel}
            isDisabled={composerDisabled}
            isSubmitting={isSubmitting}
            tool={tool}
            reasoningMode={reasoningMode}
            onChange={setInputValue}
            onSubmit={() => void submitQuestion()}
            onToolChange={setTool}
            onReasoningChange={setReasoningMode}
          />
        }
        suggestions={
          <PromptSuggestions
            prompts={promptSuggestions}
            disabled={composerDisabled || isSubmitting}
            onSelect={handlePromptSelect}
          />
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-14 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <WorkspaceHeader centered={false} compact status={status} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full bg-white/70 px-4 shadow-[0_16px_40px_-34px_rgba(16,24,40,0.22)] hover:bg-white dark:bg-slate-950/68 dark:hover:bg-slate-900"
          onClick={handleClearConversation}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {notice}

      <div className="space-y-10">
        {resultStages.map((stage, index) => (
          <WorkspaceResultStage
            key={stage.prompt.id}
            prompt={stage.prompt}
            response={stage.response}
            isLoading={isSubmitting && index === resultStages.length - 1 && !stage.response}
            onPromptSelect={handlePromptSelect}
          />
        ))}

        {isSubmitting && resultStages.length === 0 ? (
          <WorkspaceResultStage
            prompt={{
              id: "pending",
              role: "user",
              content: inputValue,
              createdAt: new Date().toISOString(),
            }}
            isLoading
            onPromptSelect={handlePromptSelect}
          />
        ) : null}
      </div>

      <section className="space-y-4">
        <FloatingOpsComposer
          variant="conversation"
          value={inputValue}
          submitLabel={submitLabel}
          isDisabled={composerDisabled}
          isSubmitting={isSubmitting}
          tool={tool}
          reasoningMode={reasoningMode}
          onChange={setInputValue}
          onSubmit={() => void submitQuestion()}
          onToolChange={setTool}
          onReasoningChange={setReasoningMode}
        />

        <div className="md:max-w-[60%]">
          <PromptSuggestions
            prompts={promptSuggestions}
            disabled={composerDisabled || isSubmitting}
            onSelect={handlePromptSelect}
          />
        </div>
      </section>
    </div>
  );
}
