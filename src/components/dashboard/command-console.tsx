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

interface AttachedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildQuestion(prompt: string, files: AttachedDocument[]) {
  const cleanPrompt = prompt.trim();
  if (files.length === 0) {
    return cleanPrompt;
  }

  const attachmentsBlock = files
    .map((file, index) => `${index + 1}. ${file.name} (${formatFileSize(file.size)}, ${file.type || "unknown"})`)
    .join("\n");

  if (!cleanPrompt) {
    return `Investigate current operational risk using attached documents.\n\nAttached files:\n${attachmentsBlock}`;
  }

  return `${cleanPrompt}\n\nAttached files:\n${attachmentsBlock}`;
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
  const [attachedDocuments, setAttachedDocuments] = useState<AttachedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef(0);

  const runInvestigation = async () => {
    if (loading) {
      return;
    }

    if (!prompt.trim() && attachedDocuments.length === 0) {
      setError("Add a question or attach context before running investigation.");
      return;
    }

    setError(null);
    setLoading(true);
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    const question = buildQuestion(prompt, attachedDocuments);

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
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const nextDocuments = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setAttachedDocuments((current) => {
      const seen = new Set(current.map((item) => item.id));
      const merged = [...current];

      for (const document of nextDocuments) {
        if (!seen.has(document.id)) {
          merged.push(document);
          seen.add(document.id);
        }
      }

      return merged;
    });

    // reset input so selecting the same file again still triggers change
    event.target.value = "";
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
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
            accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,.log,.rtf"
            aria-hidden
            tabIndex={-1}
          />
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
          {attachedDocuments.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Attached Documents
              </p>
              <div className="flex flex-wrap gap-2">
                {attachedDocuments.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() =>
                      setAttachedDocuments((current) =>
                        current.filter((item) => item.id !== file.id)
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1 text-xs text-muted-foreground transition hover:border-white/30 hover:text-foreground"
                  >
                    {file.name} • {formatFileSize(file.size)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Files stay in-browser in demo mode; metadata is included in the investigation prompt.
              </p>
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
