"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import type {
  CreateCollectionInput,
  KnowledgeCollection,
  UpdateCollectionInput,
} from "@/features/knowledge/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CreateCollectionModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateCollectionInput) => void;
  onUpdate: (input: UpdateCollectionInput) => void;
  initialCollection?: KnowledgeCollection | null;
}

function defaults(collection?: KnowledgeCollection | null) {
  return {
    name: collection?.name ?? "",
    description: collection?.description ?? "",
    owners: collection?.owners.join(", ") ?? "",
    defaultAccess: collection?.defaultAccess ?? "INTERNAL",
  };
}

export function CreateCollectionModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  initialCollection,
}: CreateCollectionModalProps) {
  const [state, setState] = useState(defaults(initialCollection));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setState(defaults(initialCollection));
  }, [initialCollection, open]);

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

  if (!open) {
    return null;
  }

  const submit = async () => {
    if (!state.name.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: state.name.trim(),
        description: state.description.trim(),
        owners: state.owners
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        defaultAccess: state.defaultAccess as CreateCollectionInput["defaultAccess"],
      };

      if (initialCollection) {
        onUpdate({ id: initialCollection.id, ...payload });
      } else {
        onCreate(payload);
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-950/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">
              {initialCollection ? "Edit collection" : "Create collection"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Group operational sources into governance-aware knowledge spaces.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close collection modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 p-5">
          <div className="space-y-1.5">
            <label htmlFor="collection-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <Input
              id="collection-name"
              value={state.name}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Supplier Onboarding"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="collection-description" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <Textarea
              id="collection-description"
              rows={4}
              value={state.description}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Define what this collection contains and who should use it."
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="collection-owners" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Owners
            </label>
            <Input
              id="collection-owners"
              value={state.owners}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  owners: event.target.value,
                }))
              }
              placeholder="opslead@opsbrain.ai, risk@opsbrain.ai"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="collection-access" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Default access
            </label>
            <Select
              id="collection-access"
              value={state.defaultAccess}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  defaultAccess: event.target.value as typeof current.defaultAccess,
                }))
              }
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="RESTRICTED">Restricted</option>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving || !state.name.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initialCollection ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
