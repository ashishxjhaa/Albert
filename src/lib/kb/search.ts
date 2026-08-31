import { db } from "@/lib/db/drizzle";
import { ragChunks } from "@/lib/unrag-custom";
import { and, sql } from "drizzle-orm";

export type KbSearchHit = {
  id: string;
  content: string;
  sourceId: string;
  metadata: unknown;
  documentId: string | null;
};

export async function searchWorkspaceKb(params: {
  userId: string;
  workspaceId: string;
  query: string;
  topK?: number;
}): Promise<KbSearchHit[]> {
  const { userId, workspaceId, query, topK = 5 } = params;
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
