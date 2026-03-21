"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { simulateZendeskTicket } from "@/features/zendesk/api";
import type { ZendeskSimulateTicketInput } from "@/features/zendesk/types";

interface SimulateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (ticketId: string) => void;
}

const DEFAULT_PAYLOAD: ZendeskSimulateTicketInput = {
  ticket_id: "",
  subject: "",
  description: "",
  requester_email: "",
  status: "open",
  tags: [],
  custom_fields: {},
};

function prettyJson(value: ZendeskSimulateTicketInput) {
  return JSON.stringify(value, null, 2);
}

export function SimulateTicketModal({ open, onClose, onCreated }: SimulateTicketModalProps) {
  const [ticketId, setTicketId] = useState(DEFAULT_PAYLOAD.ticket_id);
  const [jsonText, setJsonText] = useState(prettyJson(DEFAULT_PAYLOAD));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [onClose, open]);

  const canSubmit = useMemo(() => ticketId.trim().length > 0 && jsonText.trim().length > 0, [ticketId, jsonText]);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    setError(null);

    let parsedPayload: ZendeskSimulateTicketInput;
    try {
      parsedPayload = JSON.parse(jsonText) as ZendeskSimulateTicketInput;
    } catch {
      setError("Payload must be valid JSON.");
      return;
    }

    if (!parsedPayload.ticket_id?.trim()) {
      parsedPayload.ticket_id = ticketId.trim();
    }

    if (!parsedPayload.ticket_id?.trim()) {
      setError("`ticket_id` is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await simulateZendeskTicket(parsedPayload);
      onCreated(response.case.ticket_id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to process payload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-[2px] sm:p-6">
      <div className="flex h-[min(86vh,820px)] w-[min(94vw,860px)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-5">
          <div>
            <h3 className="text-base font-semibold">Process Zendesk Payload</h3>
            <p className="text-xs text-muted-foreground">
              Submit a real Zendesk webhook payload and run the same autopilot pipeline.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close payload modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ticket ID
              </label>
              <Input
                value={ticketId}
                onChange={(event) => setTicketId(event.target.value)}
                placeholder="Real Zendesk ticket ID"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payload JSON
              </label>
              <Textarea
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                rows={18}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Include any order, supplier, or customer identifiers that already exist in your production payload.
              </p>
            </div>

            {error ? (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-4 md:px-5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Process payload
          </Button>
        </div>
      </div>
    </div>
  );
}
