"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Document } from "@/lib/db/schema";
import { Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type IdeaRow = { idea: Document; campaign: Collection };

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function snippet(idea: Document) {
  const raw = idea.content || idea.markdown || "";
  return raw
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

export default function AllIdeasPage() {
  const params = useParams<{ workspace: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<IdeaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workspace/${params.workspace}/ideas`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load ideas");
      setRows(result.data ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load ideas");
    } finally {
      setIsLoading(false);
    }
  }, [params.workspace]);

  useEffect(() => {
    void fetchIdeas();
  }, [fetchIdeas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">All Ideas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ideas across every campaign in this workspace
        </p>
      </div>

      {isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <Skeleton className="h-5 w-[55%] rounded-md" />
              <Skeleton className="mt-3 h-4 w-full rounded-md" />
              <Skeleton className="mt-2 h-3 w-32 rounded-md" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h4 className="text-lg font-medium tracking-tight">No ideas yet</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a campaign and generate or quick-add ideas to see them here.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ idea, campaign }) => {
            const text = snippet(idea);
            return (
              <li key={idea.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/w/${params.workspace}/c/${campaign.id}/ideas/${idea.id}`
                    )
                  }
                  className="flex w-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50"
                >
                  <h3 className="font-medium tracking-tight">
                    {idea.title || "Untitled idea"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {campaign.campaignName || "Untitled campaign"} ·{" "}
                    {formatDate(idea.createdAt)}
                  </p>
                  {text ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {text}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
