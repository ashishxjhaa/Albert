import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { workspaces } from "@/lib/db/schema";
import { searchWorkspaceKb } from "@/lib/kb/search";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().min(1),
  workspaceId: z.string().uuid(),
  topK: z.number().int().positive().optional().default(8),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { query, workspaceId, topK } = searchSchema.parse(body);

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

    const results = await searchWorkspaceKb({
      userId: session.user.id,
      workspaceId,
      query,
      topK,
    });

    return NextResponse.json({
      success: true,
      query,
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("KB search error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
