"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Presentation } from "@/lib/db/schema";
import {
  ExternalLink,
  Loader2,
  Presentation as PresentationIcon,
  Sparkles,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PresentationRow = Presentation & {
  ideas?: { id: string; title: string | null }[];
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PresentationsSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
          <Skeleton className="h-5 w-[50%] rounded-md" />
          <Skeleton className="mt-3 h-4 w-24 rounded-md" />
          <Skeleton className="mt-4 h-8 w-28 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

function isCampaignDeck(item: PresentationRow) {
  if (item.documentIds && item.documentIds.length > 1) return true;
  if (item.collectionId && !item.documentId) return true;
  if (item.ideas && item.ideas.length > 1) return true;
  return false;
}

export default function PresentationsManager() {
  const params = useParams<{ workspace: string; campaignId: string }>();
  const [items, setItems] = useState<PresentationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPresentations = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setIsLoading(true);
        const res = await fetch(
          `/api/campaign/${params.campaignId}/presentations?workspace=${params.workspace}`
        );
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to load presentations");
        }
        setItems(result.presentations ?? []);
      } catch (error) {
        if (!opts?.silent) {
          toast.error(
            (error as Error).message || "Failed to load presentations"
          );
        }
      } finally {
        if (!opts?.silent) setIsLoading(false);
      }
    },
    [params.campaignId, params.workspace]
  );

  useEffect(() => {
    void fetchPresentations();
  }, [fetchPresentations]);

  useEffect(() => {
    const hasGenerating = items.some((p) => p.status === "generating");

    if (hasGenerating) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          void fetchPresentations({ silent: true });
        }, 10000);
      }
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [items, fetchPresentations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Presentations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View Gamma decks for this campaign — per-idea presentations and
          multi-idea campaign decks.
        </p>
      </div>

      {isLoading ? (
        <PresentationsSkeleton />
      ) : items.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h4 className="text-lg font-medium tracking-tight">
              No presentations yet
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Open an idea and use Generate Presentation, or select ideas on the
              Ideas tab and use Generate Deck. They will show up here.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const campaignDeck = isCampaignDeck(item);
            const ideaCount = item.ideas?.length ?? item.documentIds?.length ?? 0;

            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start gap-2">
                  <PresentationIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium tracking-tight">
                      {item.title || "Untitled presentation"}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {campaignDeck
                        ? `Campaign deck${ideaCount > 0 ? ` · ${ideaCount} ideas` : ""}`
                        : "Idea presentation"}{" "}
                      · {item.status} · {formatDate(item.createdAt)}
                    </p>
                    {item.ideas && item.ideas.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {item.ideas
                          .map((i) => i.title || "Untitled idea")
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                {item.status === "generating" ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating…
                  </p>
                ) : item.gammaUrl && item.status === "completed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-fit gap-2"
                    onClick={() =>
                      window.open(
                        item.gammaUrl!,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    Open in Gamma
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {item.error || "No viewable link yet"}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
