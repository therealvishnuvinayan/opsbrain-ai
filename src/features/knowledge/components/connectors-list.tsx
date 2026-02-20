"use client";

import { CheckCircle2, Link2, PlugZap } from "lucide-react";

import type { Connector } from "@/features/knowledge/types";
import { connectorStatusBadgeVariant, formatDateTime } from "@/features/knowledge/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectorsListProps {
  connectors: Connector[];
  isLoading?: boolean;
  onConnect: (connectorId: string) => void;
  onConfigure: (connectorId: string) => void;
}

export function ConnectorsList({
  connectors,
  isLoading = false,
  onConnect,
  onConfigure,
}: ConnectorsListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={`connector-skeleton-${index}`} className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {connectors.map((connector) => (
        <Card key={connector.id} className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <PlugZap className="h-4 w-4 text-primary" />
                {connector.name}
              </CardTitle>
              <Badge variant={connectorStatusBadgeVariant(connector.status)}>
                {connector.status === "NOT_CONNECTED" ? "Not connected" : connector.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{connector.description}</p>
          </CardHeader>

          <CardContent className="space-y-3">
            {connector.lastSyncAt ? (
              <p className="text-xs text-muted-foreground">
                Last sync: {formatDateTime(connector.lastSyncAt)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No sync activity yet.</p>
            )}

            {connector.status === "COMING_SOON" ? (
              <Button disabled className="w-full" variant="outline">
                Coming soon
              </Button>
            ) : connector.status === "CONNECTED" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => onConfigure(connector.id)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Configure
                </Button>
                <Button onClick={() => onConnect(connector.id)}>
                  <Link2 className="h-4 w-4" />
                  Sync now
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => onConnect(connector.id)}>
                <Link2 className="h-4 w-4" />
                Connect
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
