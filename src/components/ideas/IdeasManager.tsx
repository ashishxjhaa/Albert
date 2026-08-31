"use client";

import CreateIdeaModal from "@/components/ideas/CreateIdeaModal";
import CampaignModal from "@/components/dialogs/CreateCampaignModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Collection, Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Presentation, Sparkles, Wand2 } from "lucide-react";
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
  const [isEditCampaignOpen, setIsEditCampaignOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [isDeckDialogOpen, setIsDeckDialogOpen] = useState(false);
  const [deckNotes, setDeckNotes] = useState("");

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

  const toggleIdeaSelection = (ideaId: string) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else {
        next.add(ideaId);
      }
      return next;
    });
  };

  const startDeckPolling = (presentationId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/campaign/${campaignId}/generate-gamma-presentation?presentationId=${presentationId}`
        );
        const data = await response.json();

        if (!data.presentation) return;

        if (data.presentation.status === "completed") {
          setIsGeneratingDeck(false);
          toast.success("Campaign deck is ready!");
          if (data.presentation.url) {
            window.open(
              data.presentation.url,
              "_blank",
              "noopener,noreferrer"
            );
          }
          return;
        }
        if (data.presentation.status === "failed") {
          setIsGeneratingDeck(false);
          toast.error("Campaign deck generation failed");
          return;
        }
        if (data.presentation.status === "generating") {
          setTimeout(poll, 10000);
        }
      } catch (error) {
        console.error("Deck polling error:", error);
        setIsGeneratingDeck(false);
      }
    };

    setTimeout(poll, 5000);
  };

  const handleGenerateDeck = async () => {
    const selectedIds = Array.from(selectedIdeas);
    if (selectedIds.length === 0) {
      toast.error("Please select at least one idea");
      return;
    }

    setIsGeneratingDeck(true);

    try {
      const response = await fetch(
        `/api/campaign/${campaignId}/generate-gamma-presentation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentIds: selectedIds,
            additionalNotes: deckNotes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate campaign deck");
      }

      if (data.success) {
        setIsDeckDialogOpen(false);
        setDeckNotes("");
        setSelectedIdeas(new Set());

        if (data.presentation?.status === "completed") {
          toast.success("Campaign deck generated successfully!");
          if (data.presentation.url) {
            window.open(
              data.presentation.url,
              "_blank",
              "noopener,noreferrer"
            );
          }
          setIsGeneratingDeck(false);
        } else if (
          data.presentation?.status === "generating" ||
          data.presentation?.status === "processing"
        ) {
          toast.success(
            "Campaign deck is being generated… Check the Presentations tab."
          );
          if (data.presentation.id) {
            startDeckPolling(data.presentation.id);
          } else {
            setIsGeneratingDeck(false);
          }
        } else {
          setIsGeneratingDeck(false);
        }
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      console.error("Campaign deck generation error:", error);
      setIsGeneratingDeck(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate campaign deck"
      );
    }
  };

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
            onClick={() => setIsEditCampaignOpen(true)}
            disabled={!campaign || isGenerating || isGeneratingDeck}
          >
            <Pencil className="size-4" />
            Edit campaign
          </Button>
          <Button
            variant="outline"
            className="h-9"
            onClick={() => setIsCreateOpen(true)}
            disabled={isGenerating || isGeneratingDeck}
          >
            <Plus className="size-4" />
            Quick Add
          </Button>
          <Button
            className="h-9 hover:bg-[#e64e00]"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || isGeneratingDeck}
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

      {selectedIdeas.size > 0 ? (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-medium">
            {selectedIdeas.size} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setSelectedIdeas(new Set())}
              disabled={isGeneratingDeck}
            >
              Clear
            </Button>
            <Button
              size="sm"
              className="h-9 gap-2 hover:bg-[#e64e00]"
              onClick={() => setIsDeckDialogOpen(true)}
              disabled={isGenerating || isGeneratingDeck}
            >
              {isGeneratingDeck ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Presentation className="size-4" />
              )}
              {isGeneratingDeck
                ? "Generating Deck..."
                : `Generate Deck (${selectedIdeas.size})`}
            </Button>
          </div>
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
            const isSelected = selectedIdeas.has(idea.id);
            return (
              <li key={idea.id}>
                <div
                  className={cn(
                    "relative flex w-full flex-col gap-2 rounded-xl border bg-white p-4 text-left transition-colors",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleIdeaSelection(idea.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                      aria-label={`Select ${idea.title || "idea"}`}
                      disabled={isGeneratingDeck}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/w/${workspace}/c/${campaignId}/ideas/${idea.id}`
                        )
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <h3 className="font-medium tracking-tight">
                        {idea.title || "Untitled idea"}
                      </h3>
                      {snippet ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {snippet}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(idea.createdAt)}
                      </p>
                    </button>
                  </div>
                </div>
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

      <CampaignModal
        isOpen={isEditCampaignOpen}
        onClose={() => setIsEditCampaignOpen(false)}
        campaign={campaign}
        onSaved={(updated) => {
          if (updated) setCampaign(updated);
          else void fetchIdeas();
        }}
      />

      <Dialog open={isDeckDialogOpen} onOpenChange={setIsDeckDialogOpen}>
        <DialogContent className="max-w-md bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Campaign Deck</DialogTitle>
            <DialogDescription>
              Create a Gamma presentation combining {selectedIdeas.size} selected{" "}
              {selectedIdeas.size === 1 ? "idea" : "ideas"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="deck-notes"
                placeholder="Tone, slide focus, or extra context..."
                value={deckNotes}
                onChange={(e) => setDeckNotes(e.target.value)}
                rows={3}
                className="border-neutral-300"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeckDialogOpen(false)}
                disabled={isGeneratingDeck}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleGenerateDeck()}
                disabled={isGeneratingDeck}
                className="gap-2 hover:bg-[#e64e00]"
              >
                {isGeneratingDeck ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
