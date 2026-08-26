import {
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const vector = (name: string, dimensions?: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType: () => (dimensions ? `vector(${dimensions})` : "vector"),
    toDriver: (value) => {
      const content = Array.isArray(value) ? value : [];
      return `[${content.join(",")}]`;
    },
  })(name);

// Custom unrag schema with prefixed table names to avoid conflicts
export const ragDocuments = pgTable("rag_documents", {
  id: uuid("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: false }).defaultNow(),
});

export const ragChunks = pgTable("rag_chunks", {
  id: uuid("id").primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => ragDocuments.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(),
  index: integer("idx").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: false }).defaultNow(),
});

export const ragEmbeddings = pgTable(
  "rag_embeddings",
  {
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => ragChunks.id, { onDelete: "cascade" }),
    embedding: vector("embedding"),
    embeddingDimension: integer("embedding_dimension"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: false }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chunkId] }),
  })
);

export const customUnragSchema = {
  ragDocuments,
  ragChunks,
  ragEmbeddings,
};

export type RagDocument = typeof ragDocuments.$inferSelect;
export type NewRagDocument = typeof ragDocuments.$inferInsert;
export type RagChunk = typeof ragChunks.$inferSelect;
export type NewRagChunk = typeof ragChunks.$inferInsert;
export type RagEmbedding = typeof ragEmbeddings.$inferSelect;
export type NewRagEmbedding = typeof ragEmbeddings.$inferInsert;