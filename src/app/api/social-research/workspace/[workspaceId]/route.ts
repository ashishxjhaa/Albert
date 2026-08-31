import { conductSocialMediaResearch } from "@/lib/ai/social-research";
import { tavilySearch } from "@/lib/ai/tavily";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import {
  socialMediaPosts,
  socialResearchSessions,
  workspaces,
} from "@/lib/db/schema";
import { checkAndIncrementUsage } from "@/lib/db/user";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.user, session.user.id),
          isNull(workspaces.deletedAt)
        )
      )
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const sessions = await db
      .select({
        session: socialResearchSessions,
        postsCount: sql<number>`count(${socialMediaPosts.id})`.as("posts_count"),
      })
      .from(socialResearchSessions)
      .leftJoin(
        socialMediaPosts,
        eq(socialMediaPosts.sessionId, socialResearchSessions.id)
      )
      .where(
        and(
          eq(socialResearchSessions.workspaceId, workspaceId),
          isNull(socialResearchSessions.deletedAt)
        )
      )
      .groupBy(socialResearchSessions.id)
      .orderBy(desc(socialResearchSessions.createdAt));

    return NextResponse.json({ data: sessions, error: null });
  } catch (error) {
    console.error("Error fetching research sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  brandName: z.string().min(1).optional(),
  campaignId: z.string().uuid().optional(),
});

async function createTavilySnapshot(params: {
  workspaceId: string;
  campaignId?: string | null;
  brandName: string;
  instagramHandle: string | null;
  youtubeChannel: string | null;
  linkedinPage: string | null;
  fallbackNote?: string;
}) {
  const {
    workspaceId,
    campaignId,
    brandName,
    instagramHandle,
    youtubeChannel,
    linkedinPage,
    fallbackNote,
  } = params;

  let analysis =
    `Brand research snapshot for ${brandName}.\n\n` +
    "Web research was limited — add TAVILY_API_KEY for richer results.";
  let insights: Record<string, unknown> = {
    whatWorked: [],
    whatDidntWork: [],
    keyInsights: [`Workspace brand: ${brandName}`],
  };

  if (fallbackNote) {
    analysis = `${fallbackNote}\n\n${analysis}`;
  }

  try {
    const search = await tavilySearch(
      `${brandName} brand marketing campaigns audience`,
      "basic",
      5
    );
    if (search) {
      analysis = [
        fallbackNote ? `${fallbackNote}\n` : "",
        `Brand research for ${brandName}`,
        search.answer ? `\nSummary:\n${search.answer}` : "",
        "\nSources:",
        ...search.results.map((r) => `- ${r.title}: ${r.content}`),
      ]
        .filter(Boolean)
        .join("\n");
      insights = {
        whatWorked: search.results.slice(0, 2).map((r) => r.title),
        whatDidntWork: [],
        keyInsights: search.answer
          ? [search.answer]
          : search.results.map((r) => r.title),
      };
    }
  } catch (error) {
    console.error("Research Tavily failed:", error);
  }

  const [created] = await db
    .insert(socialResearchSessions)
    .values({
      workspaceId,
      campaignId: campaignId || null,
      brandName,
      instagramHandle,
      youtubeChannel,
      linkedinPage,
      totalPosts: "0",
      platformsAnalyzed: [],
      analysis,
      insights,
      metadata: { source: "lean_tavily" },
    })
    .returning();

  return created;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.user, session.user.id),
          isNull(workspaces.deletedAt)
        )
      )
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "research"
    );
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: "Research limit reached",
          message: `You have used all ${usageCheck.limit} research sessions available on this account.`,
          used: usageCheck.used,
          limit: usageCheck.limit,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = createSchema.parse(body);
    const brandName =
      validated.brandName?.trim() ||
      workspace.brandName ||
      workspace.name ||
      "Brand";

    const hasApifyToken = Boolean(process.env.APIFY_API_TOKEN);
    const hasSocialHandles = Boolean(
      workspace.instagramHandle || workspace.youtubeChannel
    );

    if (hasApifyToken && hasSocialHandles) {
      try {
        const result = await conductSocialMediaResearch({
          brandName,
          instagramHandle: workspace.instagramHandle,
          youtubeChannel: workspace.youtubeChannel,
          linkedinPage: workspace.linkedinPage,
          workspaceId,
          campaignId: validated.campaignId,
        });

        if (result.posts.length > 0) {
          const [created] = await db
            .select()
            .from(socialResearchSessions)
            .where(eq(socialResearchSessions.id, result.sessionId))
            .limit(1);

          return NextResponse.json(
            { data: created, error: null },
            { status: 201 }
          );
        }

        // Apify ran but returned no posts — fall through to Tavily
        // (session with 0 posts was already saved; soft-delete preference: use Tavily instead)
        // Soft-delete empty Apify session so list stays clean
        await db
          .update(socialResearchSessions)
          .set({ deletedAt: new Date() })
          .where(eq(socialResearchSessions.id, result.sessionId));

        const created = await createTavilySnapshot({
          workspaceId,
          campaignId: validated.campaignId,
          brandName,
          instagramHandle: workspace.instagramHandle,
          youtubeChannel: workspace.youtubeChannel,
          linkedinPage: workspace.linkedinPage,
          fallbackNote:
            "Apify returned no posts for the configured social handles — falling back to web snapshot.",
        });

        return NextResponse.json({ data: created, error: null }, { status: 201 });
      } catch (error) {
        console.error("Apify research failed, falling back to Tavily:", error);
        const created = await createTavilySnapshot({
          workspaceId,
          campaignId: validated.campaignId,
          brandName,
          instagramHandle: workspace.instagramHandle,
          youtubeChannel: workspace.youtubeChannel,
          linkedinPage: workspace.linkedinPage,
          fallbackNote:
            "Apify research failed — falling back to web snapshot.",
        });
        return NextResponse.json({ data: created, error: null }, { status: 201 });
      }
    }

    const fallbackNote = !hasApifyToken
      ? "Add APIFY_API_TOKEN for Instagram/YouTube scraping. Using web snapshot instead."
      : "Add Instagram or YouTube handles in Settings for social scraping. Using web snapshot instead.";

    const created = await createTavilySnapshot({
      workspaceId,
      campaignId: validated.campaignId,
      brandName,
      instagramHandle: workspace.instagramHandle,
      youtubeChannel: workspace.youtubeChannel,
      linkedinPage: workspace.linkedinPage,
      fallbackNote,
    });

    return NextResponse.json({ data: created, error: null }, { status: 201 });
  } catch (error) {
    console.error("Error creating research session:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
