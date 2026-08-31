"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SocialResearchSession } from "@/lib/db/schema";
import { Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type SessionRow = {
  session: SocialResearchSession;
  postsCount: number | string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResearchPage() {
  const params = useParams<{ workspace: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/social-research/workspace/${params.workspace}`
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load research");
      setRows(result.data ?? []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load research");
    } finally {
      setIsLoading(false);
    }
  }, [params.workspace]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const runResearch = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(
        `/api/social-research/workspace/${params.workspace}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Research failed");
      toast.success("Research session created");
      await fetchSessions();
      if (result.data?.id) {
        router.push(`/w/${params.workspace}/research/${result.data.id}`);
      }
    } catch (error) {
      toast.error((error as Error).message || "Research failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Research</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Social research via Apify when Instagram/YouTube handles and{" "}
            <code className="text-xs">APIFY_API_TOKEN</code> are set; otherwise a
            web snapshot.
          </p>
        </div>
        <Button
          className="h-9 hover:bg-[#e64e00]"
          onClick={() => void runResearch()}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          {isRunning ? "Running..." : "Run Research"}
        </Button>
      </div>

      {isLoading ? (
        <ul className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <Skeleton className="h-5 w-[40%] rounded-md" />
              <Skeleton className="mt-2 h-4 w-[70%] rounded-md" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-4">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-primary" />
            </div>
            <h4 className="text-lg font-medium tracking-tight">
              No research yet
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Add Instagram or YouTube handles in{" "}
              <Link
                href={`/w/${params.workspace}/settings`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Settings
              </Link>{" "}
              for Apify social scraping. Without handles or an Apify token, Run
              Research saves a web snapshot instead.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ session, postsCount }) => {
            const platforms = session.platformsAnalyzed ?? [];
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/w/${params.workspace}/research/${session.id}`
                    )
                  }
                  className="flex w-full flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50"
                >
                  <h3 className="font-medium tracking-tight">
                    {session.brandName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.createdAt)} · {postsCount ?? 0} posts
                    {platforms.length > 0
                      ? ` · ${platforms.join(", ")}`
                      : ""}
                  </p>
                  {session.analysis ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {session.analysis}
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
