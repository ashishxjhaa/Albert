import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { collections, documents, workspaces } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createIdeaSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  collectionId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  content: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createIdeaSchema.parse(body);

    const [workspace] = await db
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

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, validated.collectionId),
          eq(collections.workspaceId, validated.workspaceId),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);

    if (!collection) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const content =
      validated.content?.trim() ||
      `**Summary:** ${validated.title}\n\n**Concept:** Start expanding on this idea.\n\n**Call to Action:** TBD`;
    const markdown = validated.content?.trim()
      ? `# ${validated.title}\n\n${validated.content.trim()}`
      : `# ${validated.title}\n\n${content}`;

    const [newDocument] = await db
      .insert(documents)
      .values({
        title: validated.title,
        content,
        markdown,
        collectionId: validated.collectionId,
        workspaceId: validated.workspaceId,
        authorId: session.user.id,
        tags: [],
      })
      .returning();

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);

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
