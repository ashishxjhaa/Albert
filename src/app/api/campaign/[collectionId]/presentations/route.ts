import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import {
  collections,
  documents,
  presentations,
  workspaces,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
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
    const workspaceId = req.nextUrl.searchParams.get("workspace");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

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

    const [campaign] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.workspaceId, workspaceId),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const ideaDocs = await db
      .select({ id: documents.id, title: documents.title })
      .from(documents)
      .where(
        and(
          eq(documents.collectionId, collectionId),
          eq(documents.workspaceId, workspaceId),
          isNull(documents.deletedAt)
        )
      );

    const ideaIds = ideaDocs.map((d) => d.id);

    const campaignLinked = await db
      .select()
      .from(presentations)
      .where(
        and(
          eq(presentations.collectionId, collectionId),
          isNull(presentations.deletedAt)
        )
      )
      .orderBy(desc(presentations.createdAt));

    const ideaLinked =
      ideaIds.length > 0
        ? await db
            .select()
            .from(presentations)
            .where(
              and(
                inArray(presentations.documentId, ideaIds),
                isNull(presentations.deletedAt)
              )
            )
            .orderBy(desc(presentations.createdAt))
        : [];

    const byId = new Map<string, (typeof campaignLinked)[number]>();
    for (const p of [...campaignLinked, ...ideaLinked]) {
      byId.set(p.id, p);
    }

    const merged = [...byId.values()].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const ideaTitleById = new Map(ideaDocs.map((d) => [d.id, d.title]));

    const presentationsWithMeta = merged.map((presentation) => {
      const ideas: { id: string; title: string | null }[] = [];
      if (presentation.documentIds?.length) {
        for (const id of presentation.documentIds) {
          ideas.push({ id, title: ideaTitleById.get(id) ?? null });
        }
      } else if (presentation.documentId) {
        ideas.push({
          id: presentation.documentId,
          title: ideaTitleById.get(presentation.documentId) ?? null,
        });
      }
      return { ...presentation, ideas };
    });

    return NextResponse.json({
      success: true,
      presentations: presentationsWithMeta,
      count: presentationsWithMeta.length,
    });
  } catch (error) {
    console.error("Error fetching campaign presentations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
