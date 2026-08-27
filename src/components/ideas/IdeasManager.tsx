"use client";

import CreateIdeaModal from "@/components/ideas/CreateIdeaModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Document } from "@/lib/db/schema";
import { Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type IdeasManagerProps = {
  workspace: string;
  campaignId: string;
};

type IdeaCard = Pick<
  Document,
  "id" | "title" | "content" | "markdown" | "createdAt"
>;

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function IdeasGridSkeleton() {
  return (
    <ul
      className="grid gap-3 sm:grid-cols-2"
      aria-busy="true"
      aria-label="Loading ideas"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border border-neutral-200 bg-white p-4"
        >
          <Skeleton className="h-5 w-[55%] rounded-md" />
          <Skeleton className="mt-3 h-4 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-[75%] rounded-md" />
          <Skeleton className="mt-4 h-3 w-24 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

function snippetFromIdea(idea: IdeaCard) {
  const raw = idea.content || idea.markdown || "";
  return raw
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

export default function IdeasManager({
  workspace,
  campaignId,
}: IdeasManagerProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Collection | null>(null);
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/collection/${campaignId}?workspace=${workspace}`
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to load ideas");
      }
      setCampaign(result.data.collection);
      setIdeas(result.data.documents ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load ideas");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, workspace]);

  useEffect(() => {
    void fetchIdeas();
  }, [fetchIdeas]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationStatus("Starting generation...");

    try {
      const response = await fetch(`/api/campaign/${campaignId}/generate`, {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to generate ideas"
        );
      }

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let createdCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;

          try {
            const payload = JSON.parse(line.slice(6)) as {
              type: string;
              data: Record<string, unknown>;
            };

            if (payload.type === "status" && typeof payload.data.message === "string") {
              setGenerationStatus(payload.data.message);
            }
            if (payload.type === "ideaCreated") {
              createdCount += 1;
              const newIdea: IdeaCard = {
                id: payload.data.id as string,
                title: (payload.data.title as string) || "Untitled Idea",
                content: (payload.data.content as string) || null,
                markdown: (payload.data.markdown as string) || null,
                createdAt: new Date(
                  (payload.data.createdAt as string) || Date.now()
                ),
              };
              setIdeas((prev) => [newIdea, ...prev]);
            }
            if (payload.type === "error") {
              throw new Error(
                (payload.data.message as string) || "Generation failed"
              );
            }
            if (payload.type === "done") {
              setGenerationStatus("Ideas generated successfully!");
              toast.success(
                createdCount > 0
                  ? `Generated ${createdCount} idea(s)`
                  : "Generation complete"
              );
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      await fetchIdeas();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate ideas"
      );
      setGenerationStatus(null);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStatus(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            {campaign?.campaignName || "Campaign Ideas"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated and custom ideas for this campaign
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setIsCreateOpen(true)}
            disabled={isGenerating}
          >
            <Plus className="size-4" />
            Quick Add
          </Button>
          <Button
            className="h-9 hover:bg-[#e64e00]"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {isGenerating ? "Generating..." : "Generate Ideas"}
          </Button>
        </div>
      </div>

      {generationStatus ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-muted-foreground">
          {generationStatus}
        </div>
      ) : null}

      {isLoading ? (
        <IdeasGridSkeleton />
      ) : ideas.length === 0 ? (
        <div className="flex h-[50vh] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h4 className="text-lg font-medium tracking-tight">No ideas yet</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate AI-powered concepts from your brief, or quick-add your
              own idea to get started.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                className="h-9"
                onClick={() => setIsCreateOpen(true)}
              >
                Quick Add
              </Button>
              <Button
                className="h-9 hover:bg-[#e64e00]"
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                Generate Ideas
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ideas.map((idea) => {
            const snippet = snippetFromIdea(idea);
            return (
              <li key={idea.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/w/${workspace}/c/${campaignId}/ideas/${idea.id}`
                    )
                  }
                  className="flex w-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50"
                >
                  <h3 className="font-medium tracking-tight">
                    {idea.title || "Untitled idea"}
                  </h3>
                  {snippet ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {snippet}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(idea.createdAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CreateIdeaModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        campaignId={campaignId}
        workspaceId={workspace}
        onCreated={fetchIdeas}
      />
    </div>
  );
}
