import { db } from "@/lib/db/drizzle";
import { ragChunks, ragEmbeddings } from "@/lib/unrag-custom";
import { and, sql } from "drizzle-orm";
import { embedText } from "./embed";

export type KbSearchHit = {
  id: string;
  content: string;
  sourceId: string;
  metadata: unknown;
  documentId: string | null;
};

async function searchIlike(params: {
  userId: string;
  workspaceId: string;
  query: string;
  topK: number;
}): Promise<KbSearchHit[]> {
  const { userId, workspaceId, query, topK } = params;
  const pattern = `%${query}%`;

  return db
    .select({
      id: ragChunks.id,
      content: ragChunks.content,
      sourceId: ragChunks.sourceId,
      metadata: ragChunks.metadata,
      documentId: ragChunks.documentId,
    })
    .from(ragChunks)
    .where(
      and(
        sql`${ragChunks.metadata}->>'userId' = ${userId}`,
        sql`${ragChunks.metadata}->>'workspaceId' = ${workspaceId}`,
        sql`${ragChunks.content} ILIKE ${pattern}`
      )
    )
    .limit(topK);
}

async function searchVector(params: {
  userId: string;
  workspaceId: string;
  embedding: number[];
  topK: number;
}): Promise<KbSearchHit[]> {
  const { userId, workspaceId, embedding, topK } = params;
  const vectorLiteral = `[${embedding.join(",")}]`;

  const result = await db.execute(sql`
    select
      c.id,
      c.document_id,
      c.source_id,
      c.content,
      c.metadata
    from ${ragChunks} as c
    join ${ragEmbeddings} as e on e.chunk_id = c.id
    where c.metadata->>'userId' = ${userId}
      and c.metadata->>'workspaceId' = ${workspaceId}
    order by e.embedding <=> ${vectorLiteral}::vector
    limit ${topK}
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: Record<string, unknown>[] }).rows ?? []);

  return rows.map((row) => ({
    id: String(row.id),
    content: String(row.content),
    sourceId: String(row.source_id),
    metadata: row.metadata ?? null,
    documentId: row.document_id ? String(row.document_id) : null,
  }));
}

export async function searchWorkspaceKb(params: {
  userId: string;
  workspaceId: string;
  query: string;
  topK?: number;
}): Promise<KbSearchHit[]> {
  const { userId, workspaceId, query, topK = 5 } = params;

  try {
    const embedding = await embedText(query);
    if (embedding) {
      const hits = await searchVector({
        userId,
        workspaceId,
        embedding,
        topK,
      });
      if (hits.length > 0) return hits;
    }
  } catch (error) {
    console.error("Vector KB search failed, falling back to ILIKE:", error);
  }

  return searchIlike({ userId, workspaceId, query, topK });
}
