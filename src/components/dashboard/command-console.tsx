"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Paperclip, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askOpsBrain, canUseBackendApi } from "@/features/operations/api";
import { respondToQuestion } from "@/features/operations/aiResponder";
import { customers, orders, suppliers } from "@/features/operations/mock";
import type { AIResponse } from "@/features/operations/types";

interface ConsoleAction {
  label: string;
  href: string;
}

interface CommandResponse {
  summary: string;
  diagnosis: string;
  evidence: string[];
  actions: ConsoleAction[];
  sourceLabel: string;
}

const emptyResponse: CommandResponse = {
  summary: "",
  diagnosis: "",
  evidence: [],
  actions: [],
  sourceLabel: "",
};

const CONTEXT_ATTACHMENTS = [
  "Supplier reconciliation logs from last 6 hours",
  "Run anomaly digest for high-risk mismatches",
  "Escalation notes from Finance Ops channel",
];

function buildQuestion(prompt: string, context: string[]) {
  const cleanPrompt = prompt.trim();
  if (context.length === 0) {
    return cleanPrompt;
  }

  const contextBlock = context.map((item, index) => `${index + 1}. ${item}`).join("\n");

  if (!cleanPrompt) {
    return `Investigate current operational risk using attached context.\n\nAttached context:\n${contextBlock}`;
  }

  return `${cleanPrompt}\n\nAttached context:\n${contextBlock}`;
}

function mapToCommandResponse(response: AIResponse, source: "backend" | "fallback"): CommandResponse {
  const evidence = Array.from(
    new Set([...response.structured.keyFindings, ...response.structured.evidence])
  ).slice(0, 7);

  return {
    summary: response.answerMarkdown,
    diagnosis: response.structured.diagnosis ?? "Operational diagnosis generated",
    evidence,
    actions: response.structured.recommendedActions.slice(0, 5),
    sourceLabel:
      source === "backend"
        ? "Backend API (OpsBrain RAG)"
        : "Local deterministic fallback",
  };
}

export function CommandConsole() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CommandResponse>(emptyResponse);
  const [attachedContext, setAttachedContext] = useState<string[]>([]);
  const [contextCursor, setContextCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const runInvestigation = async () => {
    if (loading) {
      return;
    }

    if (!prompt.trim() && attachedContext.length === 0) {
      setError("Add a question or attach context before running investigation.");
      return;
    }

    setError(null);
    setLoading(true);
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    const question = buildQuestion(prompt, attachedContext);

    try {
      let result: AIResponse;
      let source: "backend" | "fallback" = "fallback";

      if (canUseBackendApi()) {
        try {
          result = await askOpsBrain(question);
          source = "backend";
        } catch {
          result = respondToQuestion(question, { orders, customers, suppliers });
        }
      } else {
        result = respondToQuestion(question, { orders, customers, suppliers });
      }

      if (requestRef.current !== requestId) {
        return;
      }

      setResponse(mapToCommandResponse(result, source));
    } catch {
      if (requestRef.current !== requestId) {
        return;
      }
      setError(
        "Investigation failed. Verify backend availability or try again with a narrower question."
      );
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const attachContext = () => {
    const nextContext = CONTEXT_ATTACHMENTS[contextCursor % CONTEXT_ATTACHMENTS.length];
    setAttachedContext((current) =>
      current.includes(nextContext) ? current : [...current, nextContext]
    );
    setContextCursor((current) => current + 1);
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]" aria-label="Command console">
      <Card className="border-white/55 dark:border-slate-800/85">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Command Console
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            aria-label="Ask OpsBrain"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void runInvestigation();
              }
            }}
            placeholder="Ask OpsBrain... e.g., Investigate Supplier X mismatch spike this week"
            className="min-h-[130px] resize-none border-white/55 bg-white/75 dark:border-slate-700/80 dark:bg-slate-900/70"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void runInvestigation()} disabled={loading}>
              Investigate
            </Button>
            <Button variant="secondary" onClick={attachContext} disabled={loading}>
              <Paperclip className="h-4 w-4" />
              Attach context
            </Button>
          </div>
          {attachedContext.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attached Context
              </p>
              <div className="flex flex-wrap gap-2">
                {attachedContext.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setAttachedContext((current) =>
                        current.filter((contextItem) => contextItem !== item)
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-xs text-muted-foreground transition hover:border-white/30 hover:text-foreground"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="mb-1 h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground"
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: dot * 0.15,
                  }}
                />
              ))}
              OpsBrain is analyzing operational evidence...
            </motion.div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Tip: press Ctrl+Enter (Cmd+Enter on Mac) to run investigation.
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/55 dark:border-slate-800/85">
        <CardHeader>
          <CardTitle className="text-base">Structured Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-1">
            <h3 className="font-semibold">Summary</h3>
            <p className="text-muted-foreground">
              {response.summary ||
                "Use Command Console to ask operational questions and receive structured analysis."}
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold">Diagnosis</h3>
            <p className="text-muted-foreground">
              {response.diagnosis ||
                "Run an investigation to generate diagnosis and reasoning from operational traces."}
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold">Evidence</h3>
            {response.evidence.length > 0 ?
              <ul className="space-y-1 text-muted-foreground">
                {response.evidence.map((item) => (
                  <li key={item} className="rounded-lg bg-secondary/40 px-2.5 py-1.5">
                    {item}
                  </li>
                ))}
              </ul>
            :
              <p className="text-muted-foreground">Evidence snippets will appear here.</p>
            }
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold">Recommended Actions</h3>
            {response.actions.length > 0 ?
              <ul className="space-y-1 text-muted-foreground">
                {response.actions.map((item) => (
                  <li key={`${item.label}-${item.href}`} className="rounded-lg bg-secondary/40 px-2 py-1.5">
                    <Link href={item.href}>
                      <Button variant="ghost" className="h-auto w-full justify-start px-1 py-1 text-left">
                        {item.label}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            :
              <p className="text-muted-foreground">Action recommendations will appear here.</p>
            }
          </div>
          <p className="text-xs text-muted-foreground">
            Data source: {response.sourceLabel || "Waiting for first investigation run"}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
