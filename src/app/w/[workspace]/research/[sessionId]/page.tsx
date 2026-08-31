"use client";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SocialMediaPost, SocialResearchSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const markdownClassName =
  "max-w-none text-[15px] leading-relaxed text-foreground/90 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-medium [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-medium [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:leading-relaxed";

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
    | {
        keyInsights?: string[];
        whatWorked?: string[];
        whatDidntWork?: string[];
      }
    | null;

  const platforms = session?.platformsAnalyzed ?? [];

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
              {[
                session.totalPosts
                  ? `${session.totalPosts} posts`
                  : null,
                platforms.length > 0 ? platforms.join(", ") : null,
                session.avgEngagement
                  ? `avg engagement ${session.avgEngagement}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Research session"}
            </p>
          </header>

          {session.analysis ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-medium tracking-tight">Analysis</h2>
              <div className={`mt-2 ${markdownClassName}`}>
                <ReactMarkdown>{session.analysis}</ReactMarkdown>
              </div>
            </section>
          ) : null}

          {insights?.whatWorked && insights.whatWorked.length > 0 ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-medium tracking-tight">What worked</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {insights.whatWorked.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {insights?.whatDidntWork && insights.whatDidntWork.length > 0 ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-medium tracking-tight">
                What didn&apos;t work
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {insights.whatDidntWork.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
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
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {post.platform}
                      </p>
                      {post.url ? (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Open
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-3">
                      {post.caption || "No caption"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[
                        post.viewCount ? `${post.viewCount} views` : null,
                        post.likeCount ? `${post.likeCount} likes` : null,
                        post.commentCount
                          ? `${post.commentCount} comments`
                          : null,
                        post.engagementRate
                          ? `eng ${Number(post.engagementRate).toFixed(1)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
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
