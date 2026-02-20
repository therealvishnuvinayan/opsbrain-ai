"use client";

import { useState } from "react";
import { PlugZap } from "lucide-react";

import { ConnectorsList } from "@/features/knowledge/components/connectors-list";
import { useKnowledgeStore } from "@/features/knowledge/store";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function KnowledgeConnectorsView() {
  const { connectors, isHydrated, setConnectorStatus } = useKnowledgeStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const pushFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => {
      setFeedback((current) => (current === message ? null : current));
    }, 2200);
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Connectors</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Connect enterprise systems and continuously ingest operational knowledge streams.
        </p>
      </section>

      {feedback ? (
        <Alert className="border-white/20 bg-white/[0.03]">
          <AlertDescription className="inline-flex items-center gap-2">
            <PlugZap className="h-4 w-4 text-primary" />
            {feedback}
          </AlertDescription>
        </Alert>
      ) : null}

      <ConnectorsList
        connectors={connectors}
        isLoading={!isHydrated}
        onConnect={(connectorId) => {
          setConnectorStatus(connectorId, "CONNECTED");
          pushFeedback("Connector synced successfully.");
        }}
        onConfigure={(connectorId) => {
          setConnectorStatus(connectorId, "CONNECTED");
          pushFeedback("Connector configuration saved (demo).");
        }}
      />
    </div>
  );
}
