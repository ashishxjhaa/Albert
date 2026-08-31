import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { collections, documents, workspaces } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

const updateCampaignSchema = z.object({
  workspaceId: z.string().uuid(),
  campaignName: z.string().min(1).max(200).optional(),
  brief: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional(),
  tone: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId } = await params;
    const body = await req.json();
    const validated = updateCampaignSchema.parse(body);

    const [workspaceData] = await db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, validated.workspaceId),
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
          eq(collections.workspaceId, validated.workspaceId),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);

    if (!collection) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updateData: Partial<typeof collections.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validated.campaignName !== undefined) {
      updateData.campaignName = validated.campaignName.trim();
    }
    if (validated.brief !== undefined) {
      updateData.brief = validated.brief.trim() || null;
    }
    if (validated.targetAudience !== undefined) {
      updateData.targetAudience = validated.targetAudience.trim() || null;
    }
    if (validated.industry !== undefined) {
      updateData.industry = validated.industry.trim() || null;
    }
    if (validated.tone !== undefined) {
      updateData.tone = validated.tone.trim() || null;
    }

    const [updated] = await db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, collectionId))
      .returning();

    return NextResponse.json({
      message: "Campaign updated successfully",
      data: updated,
      error: null,
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
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
