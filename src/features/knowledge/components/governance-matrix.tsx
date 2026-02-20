"use client";

import type {
  GovernanceMatrix,
  GovernanceRole,
  KnowledgeCollection,
  KnowledgeSource,
} from "@/features/knowledge/types";
import { accessBadgeVariant } from "@/features/knowledge/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface GovernanceMatrixProps {
  collections: KnowledgeCollection[];
  sources: KnowledgeSource[];
  governance: GovernanceMatrix;
  isLoading?: boolean;
  onToggle: (collectionId: string, role: GovernanceRole) => void;
}

const roles: GovernanceRole[] = ["Admin", "Ops", "Finance", "Viewer"];

export function GovernanceMatrix({
  collections,
  sources,
  governance,
  isLoading = false,
  onToggle,
}: GovernanceMatrixProps) {
  const restrictedSources = sources.filter((source) => source.access === "RESTRICTED");

  if (isLoading) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Collection Access Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create collections to define role-based access.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left">Collection</th>
                    {roles.map((role) => (
                      <th key={role} className="px-3 py-2 text-center">
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {collections.map((collection) => (
                    <tr key={collection.id} className="border-b border-white/5">
                      <td className="px-3 py-3">
                        <p className="font-medium">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">{collection.defaultAccess}</p>
                      </td>
                      {roles.map((role) => (
                        <td key={`${collection.id}-${role}`} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(governance[collection.id]?.[role])}
                            onChange={() => onToggle(collection.id, role)}
                            aria-label={`${role} access for ${collection.name}`}
                            className="h-4 w-4 rounded border-white/30 bg-transparent"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Restricted Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {restrictedSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No restricted sources configured.</p>
          ) : (
            restrictedSources.map((source) => (
              <div
                key={source.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{source.name}</p>
                  <Badge variant={accessBadgeVariant(source.access)}>{source.access}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Owner: {source.owner}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {source.tags.map((tag) => (
                    <Badge key={tag} variant="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
