import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import {
  socialMediaPosts,
  socialResearchSessions,
  workspaces,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const [row] = await db
      .select()
      .from(socialResearchSessions)
      .where(
        and(
          eq(socialResearchSessions.id, sessionId),
          isNull(socialResearchSessions.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, row.workspaceId),
          eq(workspaces.user, session.user.id),
          isNull(workspaces.deletedAt)
        )
      )
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const posts = await db
      .select()
      .from(socialMediaPosts)
      .where(eq(socialMediaPosts.sessionId, sessionId));

    return NextResponse.json({
      data: { session: row, posts },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching research session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
