import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { documents, workspaces } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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

    const [document] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.workspaceId, workspaceId),
          isNull(documents.deletedAt)
        )
      )
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Idea fetched successfully",
      data: document,
      error: null,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  workspace: z.string().uuid("Invalid workspace ID"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = patchSchema.parse(body);
    const workspaceId = validated.workspace;
    const content = validated.content ?? "";

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

    const [existing] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.workspaceId, workspaceId),
          isNull(documents.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const [updatedDocument] = await db
      .update(documents)
      .set({
        title: validated.title.trim(),
        content,
        markdown: content,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    return NextResponse.json({
      message: "Document updated successfully",
      data: updatedDocument,
      error: null,
    });
  } catch (error) {
    console.error("Error updating document:", error);

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
