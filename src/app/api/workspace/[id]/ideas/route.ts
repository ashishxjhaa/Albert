import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { collections, documents, workspaces } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

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

    const ideasWithCampaigns = await db
      .select({
        idea: documents,
        campaign: collections,
      })
      .from(documents)
      .innerJoin(collections, eq(documents.collectionId, collections.id))
      .where(
        and(
          eq(documents.workspaceId, workspaceId),
          isNull(documents.deletedAt),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({
      message: "Ideas fetched successfully",
      data: ideasWithCampaigns,
      error: null,
    });
  } catch (error) {
    console.error("Error fetching workspace ideas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
