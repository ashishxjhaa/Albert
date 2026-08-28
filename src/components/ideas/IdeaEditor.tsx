"use client";

import PresentationButton from "@/components/ideas/PresentationButton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Collection, Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ArrowLeft, Edit3, Eye, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type IdeaEditorProps = {
  workspace: string;
  campaignId: string;
  ideaId: string;
};

function bodyMarkdown(raw: string, title: string | null | undefined) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^#{1,3}\s+(.+?)\s*\n+/);
  if (!match) return trimmed;

  const heading = match[1].replace(/\*\*/g, "").trim();
  const pageTitle = (title || "").replace(/\*\*/g, "").trim();
  if (
    !pageTitle ||
    heading === pageTitle ||
    heading.includes(pageTitle) ||
    pageTitle.includes(heading)
  ) {
    return trimmed.slice(match[0].length).trim();
  }
  return trimmed;
}

function IdeaEditorSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading idea">
      <Skeleton className="h-8 w-40 rounded-md" />
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <Skeleton className="h-9 w-[60%] rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}

const markdownClassName =
  "max-w-none text-[15px] leading-relaxed text-foreground/90 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-medium [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-medium [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:leading-relaxed";

export default function IdeaEditor({
  workspace,
  campaignId,
  ideaId,
}: IdeaEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ideasHref = `/w/${workspace}/c/${campaignId}/ideas`;

  const forceView = searchParams.get("view") === "true";
  const startEditing = searchParams.get("edit") === "true" && !forceView;

  const [idea, setIdea] = useState<Document | null>(null);
  const [campaign, setCampaign] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(startEditing);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const skipNextAutosave = useRef(true);

  const setModeInUrl = useCallback(
    (mode: "view" | "edit") => {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.delete("edit");
      url.searchParams.set(mode, "true");
      router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
        scroll: false,
      });
    },
    [router]
  );

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ideaRes, campaignRes] = await Promise.all([
        fetch(`/api/document/${ideaId}?workspace=${workspace}`),
        fetch(`/api/collection/${campaignId}?workspace=${workspace}`),
      ]);

      const ideaJson = await ideaRes.json();
      if (!ideaRes.ok) {
        throw new Error(ideaJson.error || "Failed to load idea");
      }

      setIdea(ideaJson.data);
      setTitle(ideaJson.data.title || "");
      setContent(ideaJson.data.content || ideaJson.data.markdown || "");
      skipNextAutosave.current = true;
      setHasUnsavedChanges(false);

      if (campaignRes.ok) {
        const campaignJson = await campaignRes.json();
        setCampaign(campaignJson.data?.collection ?? null);
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to load idea");
      router.replace(ideasHref);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, ideaId, ideasHref, router, workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (forceView) setIsEditing(false);
  }, [forceView]);

  useEffect(() => {
    if (!idea) return;
    const changed =
      title !== (idea.title || "") ||
      content !== (idea.content || idea.markdown || "");
    setHasUnsavedChanges(changed);
  }, [title, content, idea]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/document/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          workspace,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save idea");
      }

      setIdea(result.data);
      setHasUnsavedChanges(false);
      skipNextAutosave.current = true;
      toast.success("Idea saved successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save idea");
    } finally {
      setIsSaving(false);
    }
  }, [content, ideaId, title, workspace]);

  useEffect(() => {
    if (!idea || !isEditing || forceView) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (
        title.trim() &&
        (title !== (idea.title || "") ||
          content !== (idea.content || idea.markdown || ""))
      ) {
        void handleSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, isEditing, idea, forceView, handleSave]);

  const enterEdit = () => {
    setIsEditing(true);
    setModeInUrl("edit");
  };

  const enterView = () => {
    setIsEditing(false);
    setModeInUrl("view");
  };

  if (isLoading) {
    return <IdeaEditorSkeleton />;
  }

  if (!idea) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Idea not found.</p>
        <Button
          variant="outline"
          className="h-9"
          onClick={() => router.push(ideasHref)}
        >
          Back to ideas
        </Button>
      </div>
    );
  }

  const viewBody = bodyMarkdown(content, title);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={ideasHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 -ml-2 w-fit gap-1.5 text-muted-foreground"
          )}
        >
          <ArrowLeft className="size-4" />
          Back to ideas
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          ) : null}
          {isEditing ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={enterView}
            >
              <Eye className="size-4" />
              View
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={enterEdit}
            >
              <Edit3 className="size-4" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            className="h-9 hover:bg-[#e64e00]"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          {isEditing ? (
            <>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Idea title"
                className="h-11 border-neutral-300 text-xl font-medium tracking-tight"
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your idea in markdown..."
                rows={18}
                className="min-h-[420px] border-neutral-300 font-mono text-sm leading-relaxed"
              />
            </>
          ) : (
            <article className="space-y-3">
              <h1 className="text-2xl font-medium tracking-tight">
                {title || "Untitled idea"}
              </h1>
              <div className={markdownClassName}>
                <ReactMarkdown>{viewBody}</ReactMarkdown>
              </div>
            </article>
          )}
        </div>

        <aside className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 h-fit">
          <div>
            <h3 className="text-sm font-medium tracking-tight">Campaign</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {campaign?.campaignName || "—"}
            </p>
          </div>
          {campaign?.brief ? (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Brief
              </h4>
              <p className="mt-1 line-clamp-4 text-sm">{campaign.brief}</p>
            </div>
          ) : null}
          {campaign?.targetAudience ? (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Audience
              </h4>
              <p className="mt-1 text-sm">{campaign.targetAudience}</p>
            </div>
          ) : null}
          {campaign?.industry ? (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Industry
              </h4>
              <p className="mt-1 text-sm">{campaign.industry}</p>
            </div>
          ) : null}
          {campaign?.tone ? (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tone
              </h4>
              <p className="mt-1 text-sm">{campaign.tone}</p>
            </div>
          ) : null}

          <div className="border-t border-neutral-200 pt-4 space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Presentation
            </h4>
            <PresentationButton
              documentId={ideaId}
              documentTitle={title || idea.title || undefined}
              currentPresentationUrl={idea.gammaUrl}
              currentPresentationStatus={idea.presentationStatus}
              onStatusChange={(status, url) => {
                setIdea((prev) =>
                  prev
                    ? {
                        ...prev,
                        presentationStatus: status,
                        gammaUrl: url ?? prev.gammaUrl,
                      }
                    : prev
                );
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
