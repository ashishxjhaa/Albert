import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { workspaces, type Vendor } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(100, "Name too long")
    .optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  brandName: z.string().max(255, "Brand name too long").optional(),
  industry: z.string().max(100, "Industry too long").optional(),
  vendor: z
    .enum(["zee5", "dainik_bhaskar", "star_india", "generic"])
    .optional(),
  brandGuidelines: z.string().max(2000, "Guidelines too long").optional(),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  brandColors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
  instagramHandle: z.string().max(255, "Instagram handle too long").optional(),
  youtubeChannel: z.string().max(255, "YouTube channel too long").optional(),
  linkedinPage: z.string().max(255, "LinkedIn page too long").optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

async function loadOwnedWorkspace(workspaceId: string, userId: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.user, userId),
        isNull(workspaces.deletedAt)
      )
    )
    .limit(1);

  if (!workspace) return null;
  return workspace;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const workspace = await loadOwnedWorkspace(id, session.user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Get workspace error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const workspace = await loadOwnedWorkspace(id, session.user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = updateWorkspaceSchema.parse(body);

    const updateData: Partial<typeof workspaces.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (validated.name !== undefined) {
      updateData.name = validated.name;
    }
    if (validated.website !== undefined) {
      updateData.website = validated.website || null;
    }
    if (validated.brandName !== undefined) {
      updateData.brandName = validated.brandName || null;
    }
    if (validated.industry !== undefined) {
      updateData.industry = validated.industry || null;
    }
    if (validated.vendor !== undefined) {
      updateData.vendor = validated.vendor as Vendor;
    }
    if (validated.brandGuidelines !== undefined) {
      updateData.brandGuidelines = validated.brandGuidelines || null;
    }
    if (validated.logoUrl !== undefined) {
      updateData.logoUrl = validated.logoUrl || null;
    }
    if (validated.brandColors !== undefined) {
      updateData.brandColors = validated.brandColors;
    }
    if (validated.instagramHandle !== undefined) {
      updateData.instagramHandle = validated.instagramHandle || null;
    }
    if (validated.youtubeChannel !== undefined) {
      updateData.youtubeChannel = validated.youtubeChannel || null;
    }
    if (validated.linkedinPage !== undefined) {
      updateData.linkedinPage = validated.linkedinPage || null;
    }

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      workspace: updatedWorkspace,
    });
  } catch (error) {
    console.error("Update workspace error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    );
  }
}
