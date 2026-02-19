"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface StructuredResponse {
  diagnosis: string;
  evidence: string[];
  actions: string[];
}

const emptyResponse: StructuredResponse = {
  diagnosis: "",
  evidence: [],
  actions: [],
};

export function CommandConsole() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<StructuredResponse>(emptyResponse);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  const runMockInvestigation = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];

    const topic = prompt.trim() || "Supplier X mismatch spike this week";

    const finalResponse: StructuredResponse = {
      diagnosis:
        `Primary variance is concentrated in supplier payload normalization after schema v2.4 rollout. ` +
        `Spike correlates with ${topic.toLowerCase()}.`,
      evidence: [
        "Run #8293 entered UploadCompleted with 12 ambiguous row matches after fetch retry.",
        "Mismatch rate moved from 2.9% to 3.8% within 6 hours of supplier batch window.",
        "Trace logs show field mapping fallback invoked 37 times for ItemCode variant keys.",
      ],
      actions: [
        "Lock supplier mapping to schema v2.3 fallback for next two cycles.",
        "Launch targeted run investigation for affected suppliers and compare row-level diffs.",
        "Generate evidence bundle and route to Finance Ops + Data Platform for approval.",
      ],
    };

    const phases: StructuredResponse[] = [
      { diagnosis: "", evidence: [], actions: [] },
      { diagnosis: finalResponse.diagnosis, evidence: [], actions: [] },
      {
        diagnosis: finalResponse.diagnosis,
        evidence: finalResponse.evidence.slice(0, 2),
        actions: [],
      },
      finalResponse,
    ];

    setLoading(true);
    setResponse(emptyResponse);

    phases.forEach((phase, index) => {
      const timer = window.setTimeout(
        () => {
          setResponse(phase);
          if (index === phases.length - 1) {
            setLoading(false);
          }
        },
        450 + index * 650
      );

      timers.current.push(timer);
    });
  };

  const attachContext = () => {
    setPrompt((prev) => {
      if (!prev) {
        return "Context attached: supplier logs + trace from Run #8293";
      }
      return `${prev}\n[Context attached: supplier logs + trace from Run #8293]`;
    });
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
            placeholder="Ask OpsBrain... e.g., Investigate Supplier X mismatch spike this week"
            className="min-h-[130px] resize-none border-white/55 bg-white/75 dark:border-slate-700/80 dark:bg-slate-900/70"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={runMockInvestigation} disabled={loading}>
              Investigate
            </Button>
            <Button variant="secondary" onClick={attachContext} disabled={loading}>
              <Paperclip className="h-4 w-4" />
              Attach context
            </Button>
          </div>
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
              OpsBrain is drafting a structured investigation response...
            </motion.div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-white/55 dark:border-slate-800/85">
        <CardHeader>
          <CardTitle className="text-base">Structured Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
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
                  <li key={item} className="rounded-lg bg-secondary/40 px-2.5 py-1.5">
                    {item}
                  </li>
                ))}
              </ul>
            :
              <p className="text-muted-foreground">Action recommendations will appear here.</p>
            }
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
