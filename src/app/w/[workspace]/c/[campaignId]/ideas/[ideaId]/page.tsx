"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

/** Drop a leading #/## title so it doesn't repeat the page heading. */
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

function IdeaDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading idea">
      <Skeleton className="h-8 w-[50%] rounded-md" />
      <Skeleton className="h-4 w-28 rounded-md" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[90%] rounded-md" />
        <Skeleton className="h-4 w-[80%] rounded-md" />
        <Skeleton className="mt-4 h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[85%] rounded-md" />
      </div>
    </div>
  );
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function IdeaDetailPage() {
  const params = useParams<{
    workspace: string;
    campaignId: string;
    ideaId: string;
  }>();
  const router = useRouter();
  const [idea, setIdea] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ideasHref = `/w/${params.workspace}/c/${params.campaignId}/ideas`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/document/${params.ideaId}?workspace=${params.workspace}`
        );
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to load idea");
        }
        if (!cancelled) {
          setIdea(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error((error as Error).message || "Failed to load idea");
          router.replace(ideasHref);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.ideaId, params.workspace, ideasHref, router]);

  const body = bodyMarkdown(
    idea?.markdown || idea?.content || "",
    idea?.title
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
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
      </div>

      {isLoading ? (
        <IdeaDetailSkeleton />
      ) : idea ? (
        <article className="space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-medium tracking-tight">
              {idea.title || "Untitled idea"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(idea.createdAt)}
            </p>
          </header>
          <div className="max-w-3xl text-[15px] leading-relaxed text-foreground/90 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-medium [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-medium [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:leading-relaxed">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </article>
      ) : (
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
      )}
    </div>
  );
}
