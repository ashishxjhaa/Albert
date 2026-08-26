import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";

// Import custom unrag schema with prefixed table names
import { ragDocuments, ragChunks, ragEmbeddings } from "../unrag-custom";

// Removed: industryEnum, toneEnum, targetAudienceEnum - now using text fields for flexibility
export const zee5AssetEnum = pgEnum('zee5_asset', ['news', 'reality_show', 'web_series', 'banner_ads']);
export const campaignOutcomeEnum = pgEnum('campaign_outcome', ['sold', 'rejected', 'pending']);
export const vendorEnum = pgEnum('vendor', ['zee5', 'dainik_bhaskar', 'star_india', 'generic']);

export const authProviderEnum = pgEnum('auth_provider', ['google', 'github', 'credentials']);
export const aiProviderEnum = pgEnum('ai_provider', ['openai', 'gemini']);

export type AuthProvider = typeof authProviderEnum.enumValues[number];
export type Vendor = typeof vendorEnum.enumValues[number];
export type AiProvider = typeof aiProviderEnum.enumValues[number];
// Removed: TargetAudience, Industry, Tone types - now using string for flexibility
export type Zee5Asset = typeof zee5AssetEnum.enumValues[number];
export type CampaignOutcome = typeof campaignOutcomeEnum.enumValues[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 100 }),
  image: varchar("image"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  authProvider: authProviderEnum("auth_provider").notNull().default("credentials"),
  aiProvider: aiProviderEnum("ai_provider").notNull().default("gemini"),
  // Usage limits — null means unlimited (regular users). Set a number for demo/restricted accounts.
  researchLimit: integer("research_limit"),
  researchCount: integer("research_count").notNull().default(0),
  presentationLimit: integer("presentation_limit"),
  presentationCount: integer("presentation_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  image: text("image"),
  // Brand/Client fields
  brandName: text("brand_name"),
  website: text("website"),
  logoUrl: text("logo_url"),
  brandColors: json("brand_colors"), // Store primary, secondary colors
  brandGuidelines: text("brand_guidelines"),
  industry: text("industry"),
  vendor: vendorEnum("vendor").default("generic"),
  // Social Media handles for research
  instagramHandle: text("instagram_handle"),
  youtubeChannel: text("youtube_channel"),
  linkedinPage: text("linkedin_page"),
  user: uuid("user")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title"),
  content: text("content"),
  tags: text("tags").array().default([]),
  markdown: text("markdown"),
  isFavorite: boolean("is_favorite").default(false),
  // Legacy Gamma fields (deprecated - use presentations table instead)
  gammaUrl: text("gamma_url"),
  gammaEmbedUrl: text("gamma_embed_url"),
  gammaId: text("gamma_id"),
  presentationStatus: varchar("presentation_status", { length: 50 }).default("none"), // none, generating, completed, failed
  metadata: json("metadata"),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  collectionId: uuid("collection_id").references(() => collections.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  campaignName: text("name"),
  slug: text("slug"),
   // Campaign fields
  targetAudience: text("target_audience"),
  brief: text("brief"),
  industry: text("industry"),
  tone: text("tone"),
  brandProfile: text("brand_profile"),
  // Albert-specific fields
  zee5Assets: zee5AssetEnum("zee5_assets").array().default([]),
  outcome: campaignOutcomeEnum("outcome").default("pending"),
  budgetEstimate: varchar("budget_estimate"),
  timelineWeeks: varchar("timeline_weeks"),
  clientRating: varchar("client_rating"), // 1-5 rating
  tags: text("tags").array().default([]),
  // Legacy Gamma fields (deprecated - use presentations table instead)
  gammaUrl: text("gamma_url"),
  gammaEmbedUrl: text("gamma_embed_url"),
  gammaId: text("gamma_id"),
  metadata: json("metadata"),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Presentations table - stores all Gamma presentations
export const presentations = pgTable("presentations", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),

  // Gamma API data
  gammaId: text("gamma_id").notNull(), // Generation ID from Gamma API
  gammaUrl: text("gamma_url").notNull(), // View URL
  gammaEmbedUrl: text("gamma_embed_url"), // Embed URL for iframes
  gammaDocId: text("gamma_doc_id"), // Actual document ID (different from generation ID)

  // Status tracking
  status: varchar("status", { length: 50 }).notNull().default("generating"), // generating, completed, failed
  error: text("error"), // Error message if failed

  // Relationships - can link to either a document (idea) OR collection (campaign deck)
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }), // For single idea presentations
  collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "cascade" }), // For campaign deck presentations
  documentIds: uuid("document_ids").array(), // For campaign decks - track which ideas are included

  // Metadata
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Configuration used for generation
  config: json("config"), // Stores the options used to generate (numSlides, tone, etc.)
  additionalNotes: text("additional_notes"), // User's custom notes

  // Timestamps
  generatedAt: timestamp("generated_at"), // When generation completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  workspace: many(workspaces),
  collections: many(collections),
  presentations: many(presentations),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.authorId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [documents.collectionId],
    references: [collections.id],
  }),
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),
  presentations: many(presentations),
}));

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  user: one(users, {
    fields: [workspaces?.user],
    references: [users.id],
  }),
  collections: many(collections),
  presentations: many(presentations),
}));

export const collectionRelations = relations(collections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [collections.workspaceId],
    references: [workspaces.id],
  }),
  documents: many(documents),
  author: one(users, {
    fields: [collections.authorId],
    references: [users.id],
  }),
  presentations: many(presentations),
}));

export const presentationsRelations = relations(presentations, ({ one }) => ({
  user: one(users, {
    fields: [presentations.authorId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [presentations.workspaceId],
    references: [workspaces.id],
  }),
  document: one(documents, {
    fields: [presentations.documentId],
    references: [documents.id],
  }),
  collection: one(collections, {
    fields: [presentations.collectionId],
    references: [collections.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Presentation = typeof presentations.$inferSelect;
export type NewPresentation = typeof presentations.$inferInsert;


// Campaign interactions table for tracking user feedback (Phase 3)
export const campaignInteractionEnum = pgEnum('interaction_type', ['like', 'discard', 'edit', 'expand', 'rate']);

export const campaignInteractions = pgTable("campaign_interactions", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  interactionType: campaignInteractionEnum("interaction_type").notNull(),
  feedbackText: text("feedback_text"),
  rating: varchar("rating"), // For rate interactions
  metadata: json("metadata"), // Additional context data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaignInteractionsRelations = relations(campaignInteractions, ({ one }) => ({
  user: one(users, {
    fields: [campaignInteractions.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [campaignInteractions.documentId],
    references: [documents.id],
  }),
}));

export type CampaignInteraction = typeof campaignInteractions.$inferSelect;
export type NewCampaignInteraction = typeof campaignInteractions.$inferInsert;

// Social Media Research Tables (for historical tracking)
export const platformEnum = pgEnum('platform', ['instagram', 'youtube', 'linkedin', 'twitter']);

// Research sessions - Each time we analyze social media
export const socialResearchSessions = pgTable("social_research_sessions", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => collections.id, { onDelete: "set null" }), // Optional - can research without campaign
  brandName: text("brand_name").notNull(),
  // Social handles used for this research
  instagramHandle: text("instagram_handle"),
  youtubeChannel: text("youtube_channel"),
  linkedinPage: text("linkedin_page"),
  // Aggregate metrics
  totalPosts: varchar("total_posts"), // Total posts analyzed
  platformsAnalyzed: platformEnum("platforms_analyzed").array().default([]), // Which platforms
  avgEngagement: varchar("avg_engagement"), // Average engagement rate
  // LLM-generated insights
  analysis: text("analysis"), // Full "What Worked vs What Didn't" analysis
  insights: json("insights"), // Structured insights { whatWorked: [], whatDidntWork: [], keyInsights: [] }
  // Metadata
  metadata: json("metadata"), // Any additional data (top posts, trends, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Individual social media posts analyzed
export const socialMediaPosts = pgTable("social_media_posts", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => socialResearchSessions.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  // Post content
  caption: text("caption"),
  url: text("url"),
  postTimestamp: timestamp("post_timestamp"), // When post was published
  // Engagement metrics
  viewCount: varchar("view_count"),
  likeCount: varchar("like_count"),
  commentCount: varchar("comment_count"),
  engagementRate: varchar("engagement_rate"), // Calculated engagement
  // Additional data
  metadata: json("metadata"), // Transcript, hashtags, mentions, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(), // When we saved it
});

// Relations
export const socialResearchSessionsRelations = relations(socialResearchSessions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [socialResearchSessions.workspaceId],
    references: [workspaces.id],
  }),
  campaign: one(collections, {
    fields: [socialResearchSessions.campaignId],
    references: [collections.id],
  }),
  posts: many(socialMediaPosts),
}));

export const socialMediaPostsRelations = relations(socialMediaPosts, ({ one }) => ({
  session: one(socialResearchSessions, {
    fields: [socialMediaPosts.sessionId],
    references: [socialResearchSessions.id],
  }),
}));

// Types
export type SocialResearchSession = typeof socialResearchSessions.$inferSelect;
export type NewSocialResearchSession = typeof socialResearchSessions.$inferInsert;
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type NewSocialMediaPost = typeof socialMediaPosts.$inferInsert;

// Export custom unrag tables
export { ragDocuments, ragChunks, ragEmbeddings };

export type RagDocument = typeof ragDocuments.$inferSelect;
export type NewRagDocument = typeof ragDocuments.$inferInsert;
export type RagChunk = typeof ragChunks.$inferSelect;
export type NewRagChunk = typeof ragChunks.$inferInsert;
export type RagEmbedding = typeof ragEmbeddings.$inferSelect;
export type NewRagEmbedding = typeof ragEmbeddings.$inferInsert;