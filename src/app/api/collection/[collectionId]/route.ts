import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { collections, documents, workspaces } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId } = await params;
    const workspace = req.nextUrl.searchParams.get("workspace");

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace parameter required" },
        { status: 400 }
      );
    }

    const [workspaceData] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, workspace),
          eq(workspaces.user, session.user.id),
          isNull(workspaces.deletedAt)
        )
      )
      .limit(1);

    if (!workspaceData) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 }
      );
    }

    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.workspaceId, workspace),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);

    if (!collection) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaignDocuments = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.collectionId, collectionId),
          eq(documents.workspaceId, workspace),
          isNull(documents.deletedAt)
        )
      )
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({
      message: "Campaign details fetched successfully",
      data: {
        collection,
        documents: campaignDocuments,
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
