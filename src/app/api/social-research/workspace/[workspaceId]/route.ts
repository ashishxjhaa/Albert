import { tavilySearch } from "@/lib/ai/tavily";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import {
  socialMediaPosts,
  socialResearchSessions,
  workspaces,
} from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    const body = await req.json().catch(() => ({}));
    const validated = createSchema.parse(body);
    const brandName =
      validated.brandName?.trim() ||
      workspace.brandName ||
      workspace.name ||
      "Brand";

    let analysis =
      `Brand research snapshot for ${brandName}.\n\n` +
      "Web research was limited — add TAVILY_API_KEY for richer results.";
    let insights: Record<string, unknown> = {
      whatWorked: [],
      whatDidntWork: [],
      keyInsights: [`Workspace brand: ${brandName}`],
    };

    try {
      const search = await tavilySearch(
        `${brandName} brand marketing campaigns audience`,
        "basic",
        5
      );
      if (search) {
        analysis = [
          `Brand research for ${brandName}`,
          search.answer ? `\nSummary:\n${search.answer}` : "",
          "\nSources:",
          ...search.results.map((r) => `- ${r.title}: ${r.content}`),
        ].join("\n");
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
        campaignId: validated.campaignId || null,
        brandName,
        instagramHandle: workspace.instagramHandle,
        youtubeChannel: workspace.youtubeChannel,
        linkedinPage: workspace.linkedinPage,
        totalPosts: "0",
        platformsAnalyzed: [],
        analysis,
        insights,
        metadata: { source: "lean_tavily" },
      })
      .returning();

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
