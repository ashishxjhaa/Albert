import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { collections, documents, workspaces } from "@/lib/db/schema";
import { getSlug } from "@/lib/utils";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCollectionSchema = z.object({
  campaignName: z.string().min(1, "Campaign name is required"),
  brief: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional(),
  tone: z.string().optional(),
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createCollectionSchema.parse(body);

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, validatedData.workspaceId),
          eq(workspaces.user, session.user.id),
          isNull(workspaces.deletedAt)
        )
      )
      .limit(1);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [newCollection] = await db
      .insert(collections)
      .values({
        campaignName: validatedData.campaignName,
        slug: getSlug(validatedData.campaignName),
        brief: validatedData.brief || null,
        targetAudience: validatedData.targetAudience || null,
        industry: validatedData.industry || null,
        tone: validatedData.tone || null,
        workspaceId: validatedData.workspaceId,
        authorId: session.user.id,
        tags: [],
      })
      .returning();

    return NextResponse.json(
      {
        message: "Campaign created successfully",
        data: newCollection,
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating collection:", error);

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = new URL(req.url).searchParams.get("workspace");
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

    const collectionsWithCounts = await db
      .select({
        collection: collections,
        documents_count: sql<number>`count(${documents.id})`.as(
          "documents_count"
        ),
      })
      .from(collections)
      .leftJoin(documents, eq(documents.collectionId, collections.id))
      .where(
        and(
          eq(collections.workspaceId, workspace),
          isNull(collections.deletedAt)
        )
      )
      .groupBy(collections.id);

    return NextResponse.json(
      {
        message: "Collections fetched successfully",
        data: collectionsWithCounts,
        error: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
