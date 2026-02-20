"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import type {
  AddSourceInput,
  Connector,
  KnowledgeCollection,
  KnowledgeSource,
  KnowledgeSourceType,
} from "@/features/knowledge/types";
import { sourceTypeLabel } from "@/features/knowledge/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SourceTab = "UPLOAD" | "URL" | "NOTE" | "CONNECTOR";

interface AddSourceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddSourceInput) => void;
  collections: KnowledgeCollection[];
  connectors: Connector[];
  initialSource?: KnowledgeSource | null;
}

const sourceTabs: SourceTab[] = ["UPLOAD", "URL", "NOTE", "CONNECTOR"];

function inferPreviewChunks(content: string, sourceName: string) {
  const normalized = content.trim();

  if (!normalized) {
    return [
      `Knowledge chunk for ${sourceName}.`,
      "Operational metadata indexed for retrieval and grounding.",
      "Use Ask in source details to query this artifact.",
    ];
  }

  const sentences = normalized
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (sentences.length === 0) {
    return [normalized.slice(0, 120)];
  }

  return sentences;
}

function defaultState(source?: KnowledgeSource | null) {
  return {
    tab: (source?.type ?? "UPLOAD") as SourceTab,
    name: source?.name ?? "",
    owner: source?.owner ?? "opslead@opsbrain.ai",
    url: source?.url ?? "",
    textBody: source?.previewChunks.join("\n") ?? "",
    connectorId: source?.connectorId ?? "",
    access: source?.access ?? "INTERNAL",
    tagText: source?.tags.join(", ") ?? "",
    selectedCollections: source?.collections ?? [],
  };
}

export function AddSourceModal({
  open,
  onClose,
  onSubmit,
  collections,
  connectors,
  initialSource,
}: AddSourceModalProps) {
  const [formState, setFormState] = useState(defaultState(initialSource));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(defaultState(initialSource));
  }, [initialSource, open]);

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

  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === formState.connectorId),
    [connectors, formState.connectorId]
  );

  if (!open) {
    return null;
  }

  const submit = async () => {
    if (!formState.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const previewChunks = inferPreviewChunks(formState.textBody, formState.name.trim());

      const payload: AddSourceInput = {
        name: formState.name.trim(),
        type: formState.tab,
        collections: formState.selectedCollections,
        access: formState.access as AddSourceInput["access"],
        owner: formState.owner.trim() || "opslead@opsbrain.ai",
        tags: formState.tagText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        sizeBytes:
          formState.tab === "UPLOAD"
            ? Math.max(128_000, previewChunks.join(" ").length * 34)
            : Math.max(48_000, previewChunks.join(" ").length * 18),
        previewChunks,
        url: formState.tab === "URL" ? formState.url.trim() : undefined,
        connectorId: formState.tab === "CONNECTOR" ? formState.connectorId : undefined,
      };

      onSubmit(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialSource ? "Edit source" : "Add source";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-950/90 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Add enterprise knowledge for retrieval, investigation context, and policy grounding.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close source modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {sourceTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  setFormState((current) => ({
                    ...current,
                    tab,
                  }))
                }
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  formState.tab === tab
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground"
                )}
              >
                {sourceTypeLabel(tab)}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="source-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Source name
              </label>
              <Input
                id="source-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Supplier mapping handbook"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="source-owner" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Owner
              </label>
              <Input
                id="source-owner"
                value={formState.owner}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    owner: event.target.value,
                  }))
                }
                placeholder="opslead@opsbrain.ai"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="source-access" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Access
              </label>
              <Select
                id="source-access"
                value={formState.access}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    access: event.target.value as typeof current.access,
                  }))
                }
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="RESTRICTED">Restricted</option>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="source-tags" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tags
              </label>
              <Input
                id="source-tags"
                value={formState.tagText}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    tagText: event.target.value,
                  }))
                }
                placeholder="supplier, policy, risk"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Collections
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {collections.map((collection) => {
                const checked = formState.selectedCollections.includes(collection.id);

                return (
                  <label
                    key={collection.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span>{collection.name}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setFormState((current) => ({
                          ...current,
                          selectedCollections: event.target.checked
                            ? [...current.selectedCollections, collection.id]
                            : current.selectedCollections.filter((id) => id !== collection.id),
                        }));
                      }}
                      className="h-4 w-4 rounded border-white/30 bg-transparent"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {formState.tab === "URL" ? (
            <div className="space-y-1.5">
              <label htmlFor="source-url" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Web URL
              </label>
              <Input
                id="source-url"
                value={formState.url}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="https://docs.internal/runbook"
              />
            </div>
          ) : null}

          {formState.tab === "CONNECTOR" ? (
            <div className="space-y-1.5">
              <label htmlFor="source-connector" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connector
              </label>
              <Select
                id="source-connector"
                value={formState.connectorId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    connectorId: event.target.value,
                  }))
                }
              >
                <option value="">Select connector</option>
                {connectors.map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
              </Select>
              {selectedConnector ? (
                <Badge variant="neutral" className="mt-1">
                  {selectedConnector.description}
                </Badge>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="source-body" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formState.tab === "UPLOAD"
                ? "Upload summary"
                : formState.tab === "NOTE"
                  ? "Note text"
                  : "Source content seed"}
            </label>
            <Textarea
              id="source-body"
              value={formState.textBody}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  textBody: event.target.value,
                }))
              }
              rows={6}
              placeholder="Paste key operational text that should be indexed."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSubmitting || !formState.name.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initialSource ? "Save changes" : "Add source"}
          </Button>
        </div>
      </div>
    </div>
  );
}
