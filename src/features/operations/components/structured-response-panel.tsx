"use client";

import Link from "next/link";
import { Check, Clipboard, FileSearch, ListChecks } from "lucide-react";
import { useState } from "react";

import { SuggestedPromptsRow } from "@/features/operations/components/suggested-prompts-row";
import type { AIResponse } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StructuredResponsePanelProps {
  response: AIResponse | null;
  onPromptSelect: (prompt: string) => void;
}

export function StructuredResponsePanel({
  response,
  onPromptSelect,
}: StructuredResponsePanelProps) {
  const [copied, setCopied] = useState(false);

  const copyAnswer = async () => {
    if (!response) {
      return;
    }

    try {
      await navigator.clipboard.writeText(response.answerMarkdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (!response) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Structured Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Ask OpsBrain to generate diagnosis, findings, evidence snippets, and recommended next actions.
          </p>
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3">
            Tip: include an order ID (for example, OB-24831) for high-confidence entity matching.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>Structured Response</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyAnswer()}>
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy answer"}
          </Button>
        </div>
        {response.structured.diagnosis ? (
          <Badge variant="warning" className="w-fit">
            {response.structured.diagnosis}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <section className="space-y-2">
          <p className="text-sm font-semibold">Summary</p>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-muted-foreground">{response.answerMarkdown}</p>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4" />
            Key Findings
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {response.structured.keyFindings.map((finding, index) => (
              <li key={`${finding}-${index}`}>- {finding}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileSearch className="h-4 w-4" />
            Context & Evidence
          </div>
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {response.structured.evidence.map((item, index) => (
              <p key={`${item}-${index}`} className="text-xs text-muted-foreground">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-semibold">Recommended next actions</p>
          <div className="flex flex-wrap gap-2">
            {response.structured.recommendedActions.map((action) => (
              <Link
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={buttonVariants({
                  size: "sm",
                  variant: action.label === "Start Investigation" ? "default" : "outline",
                })}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        <SuggestedPromptsRow
          prompts={response.suggestedPrompts}
          onSelect={onPromptSelect}
          title="Suggested follow-up"
        />
      </CardContent>
    </Card>
  );
}
