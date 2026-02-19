"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface RunActionsPanelProps {
  runId: string;
}

export function RunActionsPanel({ runId }: RunActionsPanelProps) {
  const [note, setNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const postAction = async (actionType: string, noteText?: string) => {
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        runId,
        actionType,
        note: noteText,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to save action.");
    }

    return response.json();
  };

  const saveNote = async () => {
    if (!note.trim()) {
      setFeedback("Enter a note before saving.");
      return;
    }

    try {
      setIsSavingNote(true);
      await postAction("ADD_NOTE", note.trim());
      setNote("");
      setFeedback("Note saved to action log.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const runSimpleAction = async (actionType: string, noteText: string) => {
    try {
      setIsActionRunning(true);
      await postAction(actionType, noteText);
      setFeedback("Action logged successfully.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to execute action.");
    } finally {
      setIsActionRunning(false);
    }
  };

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add investigation notes, evidence, or operator context..."
          className="min-h-[120px] border-white/10 bg-white/[0.03]"
        />

        <Button onClick={saveNote} disabled={isSavingNote || note.trim().length === 0} className="w-full">
          {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Note
        </Button>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            disabled={isActionRunning}
            onClick={() =>
              runSimpleAction(
                "APPROVE_MOVE_TO_BUFFER",
                "Operator approved run movement into reconciliation buffer."
              )
            }
          >
            {isActionRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Approve Move to Buffer
          </Button>

          <Button
            variant="outline"
            disabled={isActionRunning}
            onClick={() =>
              runSimpleAction("DISCARD_RUN", "Operator discarded run during investigation review.")
            }
          >
            {isActionRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Discard Run
          </Button>
        </div>

        {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      </CardContent>
    </Card>
  );
}
