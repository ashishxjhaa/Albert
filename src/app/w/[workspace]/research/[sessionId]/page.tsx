"use client";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SocialMediaPost, SocialResearchSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ResearchSessionPage() {
  const params = useParams<{ workspace: string; sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SocialResearchSession | null>(null);
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/social-research/session/${params.sessionId}`
        );
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to load session");
        if (!cancelled) {
          setSession(result.data.session);
          setPosts(result.data.posts ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error((error as Error).message);
          router.replace(`/w/${params.workspace}/research`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.sessionId, params.workspace, router]);

  const insights = session?.insights as
    | { keyInsights?: string[]; whatWorked?: string[]; whatDidntWork?: string[] }
    | null;

  return (
    <div className="space-y-6">
      <Link
        href={`/w/${params.workspace}/research`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-8 -ml-2 w-fit gap-1.5 text-muted-foreground"
        )}
      >
        <ArrowLeft className="size-4" />
        Back to research
      </Link>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-[40%] rounded-md" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      ) : session ? (
        <article className="space-y-6">
          <header>
            <h1 className="text-2xl font-medium tracking-tight">
              {session.brandName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Research session
            </p>
          </header>

          {session.analysis ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-medium tracking-tight">Analysis</h2>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                {session.analysis}
              </pre>
            </section>
          ) : null}

          {insights?.keyInsights && insights.keyInsights.length > 0 ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-medium tracking-tight">
                Key insights
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {insights.keyInsights.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {posts.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium tracking-tight">
                Posts ({posts.length})
              </h2>
              <ul className="space-y-2">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="rounded-lg border border-neutral-200 bg-white p-3 text-sm"
                  >
                    <p className="text-xs text-muted-foreground">
                      {post.platform}
                    </p>
                    <p className="mt-1">{post.caption || "No caption"}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
