import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { workspaces } from "@/lib/db/schema";
import { embedText } from "@/lib/kb/embed";
import { ragChunks, ragDocuments, ragEmbeddings } from "@/lib/unrag-custom";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
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
  return workspace ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspace");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace parameter required" },
        { status: 400 }
      );
    }

    const workspace = await assertWorkspaceAccess(
      workspaceId,
      session.user.id
    );
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const documents = await db
      .select({
        id: ragDocuments.id,
        sourceId: ragDocuments.sourceId,
        content: sql<string>`substring(${ragDocuments.content}, 1, 200)`.as(
          "preview"
        ),
        metadata: ragDocuments.metadata,
        createdAt: ragDocuments.createdAt,
        chunkCount: sql<number>`count(${ragChunks.id})`.as("chunkCount"),
      })
      .from(ragDocuments)
      .leftJoin(ragChunks, eq(ragDocuments.id, ragChunks.documentId))
      .where(
        and(
          sql`${ragDocuments.metadata}->>'userId' = ${session.user.id}`,
          sql`${ragDocuments.metadata}->>'workspaceId' = ${workspaceId}`
        )
      )
      .groupBy(
        ragDocuments.id,
        ragDocuments.sourceId,
        ragDocuments.content,
        ragDocuments.metadata,
        ragDocuments.createdAt
      )
      .orderBy(sql`${ragDocuments.createdAt} DESC`);

    return NextResponse.json({
      success: true,
      documents: documents.map((doc) => ({
        ...doc,
        metadata: doc.metadata || {},
        chunkCount: Number(doc.chunkCount) || 0,
      })),
      total: documents.length,
    });
  } catch (error) {
    console.error("KB documents list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

const ingestSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = ingestSchema.parse(body);

    const workspace = await assertWorkspaceAccess(
      validated.workspaceId,
      session.user.id
    );
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const docId = crypto.randomUUID();
    const chunkId = crypto.randomUUID();
    const sourceId = `manual:${validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)}:${Date.now()}`;

    await db.insert(ragDocuments).values({
      id: docId,
      sourceId,
      content: validated.content,
      metadata: {
        userId: session.user.id,
        workspaceId: validated.workspaceId,
        title: validated.title,
        source: "manual_paste",
      },
    });

    await db.insert(ragChunks).values({
      id: chunkId,
      documentId: docId,
      sourceId,
      index: 0,
      content: validated.content,
      tokenCount: Math.ceil(validated.content.length / 4),
      metadata: {
        userId: session.user.id,
        workspaceId: validated.workspaceId,
        title: validated.title,
      },
    });

    const embedding = await embedText(validated.content);
    if (embedding) {
      await db.insert(ragEmbeddings).values({
        chunkId,
        embedding,
        embeddingDimension: embedding.length,
      });
    }

    return NextResponse.json(
      {
        success: true,
        document: { id: docId, sourceId, title: validated.title },
        embedded: Boolean(embedding),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("KB ingest error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to ingest document" },
      { status: 500 }
    );
  }
}
