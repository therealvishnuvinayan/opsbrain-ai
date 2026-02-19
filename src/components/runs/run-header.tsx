"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Microscope, ScrollText } from "lucide-react";
import type { RunMode, RunStatus, Severity } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  badgeVariantForSeverity,
  badgeVariantForStatus,
  getSeverityLabel,
  getStatusLabel,
} from "@/lib/reconciliation";
import { cn } from "@/lib/utils";

interface RunHeaderProps {
  run: {
    id: string;
    processId: string;
    entityType: string;
    entityName: string;
    mode: RunMode;
    status: RunStatus;
    severity: Severity;
  };
}

export function RunHeader({ run }: RunHeaderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGenerateEvidence = async () => {
    try {
      setIsGenerating(true);
      setFeedback(null);

      const response = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: run.id,
          actionType: "GENERATE_EVIDENCE_BUNDLE",
          note: `Evidence bundle requested for ${run.processId}.`,
          payloadJson: {
            source: "run_header",
            processId: run.processId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to generate evidence bundle.");
      }

      setFeedback("Evidence bundle request logged.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {run.processId} • {run.entityType}: {run.entityName} • {run.mode}
        </h2>
        <Badge variant={badgeVariantForStatus(run.status)}>{getStatusLabel(run.status)}</Badge>
        <Badge variant={badgeVariantForSeverity(run.severity)}>{getSeverityLabel(run.severity)}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/investigation?runId=${run.id}`}
          className={cn(buttonVariants(), "inline-flex")}
        >
          <Microscope className="h-4 w-4" />
          Investigate
        </Link>

        <Button variant="outline" onClick={handleGenerateEvidence} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4" />}
          Generate Evidence Bundle
        </Button>
      </div>

      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
