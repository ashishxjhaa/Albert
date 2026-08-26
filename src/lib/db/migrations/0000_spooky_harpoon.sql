CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'gemini');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('google', 'github', 'credentials');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('like', 'discard', 'edit', 'expand', 'rate');--> statement-breakpoint
CREATE TYPE "public"."campaign_outcome" AS ENUM('sold', 'rejected', 'pending');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('instagram', 'youtube', 'linkedin', 'twitter');--> statement-breakpoint
CREATE TYPE "public"."vendor" AS ENUM('zee5', 'dainik_bhaskar', 'star_india', 'generic');--> statement-breakpoint
CREATE TYPE "public"."zee5_asset" AS ENUM('news', 'reality_show', 'web_series', 'banner_ads');--> statement-breakpoint
CREATE TABLE "campaign_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"feedback_text" text,
	"rating" varchar,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"slug" text,
	"target_audience" text,
	"brief" text,
	"industry" text,
	"tone" text,
	"brand_profile" text,
	"zee5_assets" "zee5_asset"[] DEFAULT '{}',
	"outcome" "campaign_outcome" DEFAULT 'pending',
	"budget_estimate" varchar,
	"timeline_weeks" varchar,
	"client_rating" varchar,
	"tags" text[] DEFAULT '{}',
	"gamma_url" text,
	"gamma_embed_url" text,
	"gamma_id" text,
	"metadata" json,
	"workspace_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"content" text,
	"tags" text[] DEFAULT '{}',
	"markdown" text,
	"is_favorite" boolean DEFAULT false,
	"gamma_url" text,
	"gamma_embed_url" text,
	"gamma_id" text,
	"presentation_status" varchar(50) DEFAULT 'none',
	"metadata" json,
	"author_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"collection_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"gamma_id" text NOT NULL,
	"gamma_url" text NOT NULL,
	"gamma_embed_url" text,
	"gamma_doc_id" text,
	"status" varchar(50) DEFAULT 'generating' NOT NULL,
	"error" text,
	"document_id" uuid,
	"collection_id" uuid,
	"document_ids" uuid[],
	"workspace_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"config" json,
	"additional_notes" text,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rag_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"idx" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_embeddings" (
	"chunk_id" uuid NOT NULL,
	"embedding" vector,
	"embedding_dimension" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "rag_embeddings_chunk_id_pk" PRIMARY KEY("chunk_id")
);
--> statement-breakpoint
CREATE TABLE "social_media_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"caption" text,
	"url" text,
	"post_timestamp" timestamp,
	"view_count" varchar,
	"like_count" varchar,
	"comment_count" varchar,
	"engagement_rate" varchar,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_research_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid,
	"brand_name" text NOT NULL,
	"instagram_handle" text,
	"youtube_channel" text,
	"linkedin_page" text,
	"total_posts" varchar,
	"platforms_analyzed" "platform"[] DEFAULT '{}',
	"avg_engagement" varchar,
	"analysis" text,
	"insights" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100),
	"image" varchar,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"auth_provider" "auth_provider" DEFAULT 'credentials' NOT NULL,
	"ai_provider" "ai_provider" DEFAULT 'gemini' NOT NULL,
	"research_limit" integer,
	"research_count" integer DEFAULT 0 NOT NULL,
	"presentation_limit" integer,
	"presentation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"image" text,
	"brand_name" text,
	"website" text,
	"logo_url" text,
	"brand_colors" json,
	"brand_guidelines" text,
	"industry" text,
	"vendor" "vendor" DEFAULT 'generic',
	"instagram_handle" text,
	"youtube_channel" text,
	"linkedin_page" text,
	"user" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "campaign_interactions" ADD CONSTRAINT "campaign_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_interactions" ADD CONSTRAINT "campaign_interactions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_rag_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_embeddings" ADD CONSTRAINT "rag_embeddings_chunk_id_rag_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."rag_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_media_posts" ADD CONSTRAINT "social_media_posts_session_id_social_research_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."social_research_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_research_sessions" ADD CONSTRAINT "social_research_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_research_sessions" ADD CONSTRAINT "social_research_sessions_campaign_id_collections_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_users_id_fk" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;