/**
 * Generate Gamma Presentation for Campaign
 *
 * POST /api/campaign/[collectionId]/generate-gamma-presentation
 * Body: { documentIds: string[], additionalNotes?: string }
 *
 * GET /api/campaign/[collectionId]/generate-gamma-presentation?presentationId=...
 * Poll status for a specific campaign deck presentation
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import {
  collections,
  documents,
  presentations,
  workspaces,
} from "@/lib/db/schema";
import { GammaError, extractGammaUrls, gamma } from "@/lib/gamma";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const generateDeckSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
  additionalNotes: z.string().optional(),
});

type RouteParams = { params: Promise<{ collectionId: string }> };

async function loadOwnedCampaign(collectionId: string, userId: string) {
  const [campaign] = await db
    .select()
    .from(collections)
    .where(
      and(eq(collections.id, collectionId), isNull(collections.deletedAt))
    )
    .limit(1);

  if (!campaign) return { error: "Campaign not found" as const, status: 404 };

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, campaign.workspaceId),
        eq(workspaces.user, userId),
        isNull(workspaces.deletedAt)
      )
    )
    .limit(1);

  if (!workspace) return { error: "Forbidden" as const, status: 403 };

  return { campaign, workspace };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GAMMA_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing GAMMA_API_KEY in environment. Add it to .env.local to generate presentations.",
        },
        { status: 500 }
      );
    }

    const { collectionId } = await params;
    const owned = await loadOwnedCampaign(collectionId, session.user.id);
    if ("error" in owned && owned.error) {
      return NextResponse.json(
        { error: owned.error },
        { status: owned.status }
      );
    }

    const { campaign, workspace } = owned as {
      campaign: typeof collections.$inferSelect;
      workspace: typeof workspaces.$inferSelect;
    };

    const body = await req.json().catch(() => ({}));
    const { documentIds, additionalNotes } = generateDeckSchema.parse(body);

    const selectedIdeas = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.collectionId, collectionId),
          inArray(documents.id, documentIds),
          isNull(documents.deletedAt)
        )
      );

    if (selectedIdeas.length === 0) {
      return NextResponse.json(
        { error: "Selected ideas not found" },
        { status: 404 }
      );
    }

    const brandColors = workspace.brandColors as
      | { primary?: string; secondary?: string; accent?: string }
      | null;

    const brandName =
      workspace.brandName || workspace.name || "Brand Name";
    const campaignName = campaign.campaignName || "Campaign";

    const campaignOverview = `
# Campaign Overview

**Campaign Name:** ${campaignName}

${campaign.brief ? `**Brief:** ${campaign.brief}\n` : ""}

## Key Details

${campaign.targetAudience ? `- **Target Audience:** ${campaign.targetAudience}` : ""}
${campaign.industry || workspace.industry ? `- **Industry:** ${campaign.industry || workspace.industry}` : ""}
${campaign.tone ? `- **Tone:** ${campaign.tone}` : ""}
${campaign.budgetEstimate ? `- **Budget:** ${campaign.budgetEstimate}` : ""}
${campaign.timelineWeeks ? `- **Timeline:** ${campaign.timelineWeeks} weeks` : ""}

## Brand Information

${brandName ? `- **Brand:** ${brandName}` : ""}
${workspace.industry ? `- **Industry:** ${workspace.industry}` : ""}
${workspace.website ? `- **Website:** ${workspace.website}` : ""}
${workspace.brandGuidelines ? `\n**Brand Guidelines:**\n${workspace.brandGuidelines}` : ""}

---

## Campaign Ideas

This presentation showcases ${selectedIdeas.length} creative ${selectedIdeas.length === 1 ? "idea" : "ideas"} developed for this campaign.

${additionalNotes ? `\n## Additional Notes\n\n${additionalNotes}` : ""}
    `.trim();

    const [presentationRecord] = await db
      .insert(presentations)
      .values({
        title: campaignName,
        gammaId: "",
        gammaUrl: "",
        status: "generating",
        documentId: null,
        collectionId,
        documentIds: selectedIdeas.map((d) => d.id),
        workspaceId: campaign.workspaceId,
        authorId: session.user.id,
        additionalNotes: additionalNotes || null,
        config: {
          brandName,
          industry: workspace.industry || campaign.industry,
          brandColors,
          ideasCount: selectedIdeas.length,
        },
      })
      .returning();

    try {
      const gammaResult = await gamma.createCampaignDeck({
        campaignTitle: campaignName,
        ideas: selectedIdeas.map((idea) => ({
          title: idea.title || "Untitled Idea",
          content: idea.content || idea.markdown || "",
        })),
        brandName: brandName || undefined,
        industry: workspace.industry || campaign.industry || undefined,
        brandGuidelines: workspace.brandGuidelines || undefined,
        brandColors: brandColors
          ? {
              primary: brandColors.primary,
              secondary: brandColors.secondary,
              accent: brandColors.accent,
            }
          : undefined,
        logoUrl: workspace.logoUrl || undefined,
        additionalNotes: campaignOverview,
        tone: campaign.tone || undefined,
        audience: campaign.targetAudience || undefined,
        numSlides: Math.min(8 + selectedIdeas.length * 2, 20),
      });

      const { docId, viewUrl, embedUrl } = extractGammaUrls({
        url: gammaResult.url,
        embedUrl: gammaResult.embedUrl,
        generationId: gammaResult.generationId,
        ...(gammaResult.data || {}),
      });

      const status =
        gammaResult.status === "completed"
          ? "completed"
          : gammaResult.success
            ? "completed"
            : gammaResult.status === "failed" || gammaResult.status === "error"
              ? "failed"
              : "generating";

      await db
        .update(presentations)
        .set({
          gammaId: gammaResult.generationId || presentationRecord.gammaId,
          gammaUrl: viewUrl || gammaResult.url || "",
          gammaEmbedUrl: embedUrl || gammaResult.embedUrl || null,
          gammaDocId: docId || null,
          status,
          error: gammaResult.error || null,
          generatedAt: status === "completed" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, presentationRecord.id));

      return NextResponse.json({
        success: gammaResult.success || status === "generating",
        presentation: {
          id: presentationRecord.id,
          gammaId: gammaResult.generationId,
          url: viewUrl || gammaResult.url,
          embedUrl: embedUrl || gammaResult.embedUrl,
          status,
        },
        error: gammaResult.error,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";

      await db
        .update(presentations)
        .set({
          status: "failed",
          error: message,
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, presentationRecord.id));

      throw error;
    }
  } catch (error) {
    console.error("Generate campaign deck error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof GammaError) {
      return NextResponse.json(
        { error: error.message, statusCode: error.statusCode },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate campaign deck",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId } = await params;
    const presentationId = req.nextUrl.searchParams.get("presentationId");

    if (!presentationId) {
      return NextResponse.json(
        { error: "presentationId query parameter is required" },
        { status: 400 }
      );
    }

    const owned = await loadOwnedCampaign(collectionId, session.user.id);
    if ("error" in owned && owned.error) {
      return NextResponse.json(
        { error: owned.error },
        { status: owned.status }
      );
    }

    const [presentation] = await db
      .select()
      .from(presentations)
      .where(
        and(
          eq(presentations.id, presentationId),
          eq(presentations.collectionId, collectionId),
          isNull(presentations.deletedAt)
        )
      )
      .limit(1);

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    if (
      presentation.status === "generating" &&
      presentation.gammaId &&
      process.env.GAMMA_API_KEY
    ) {
      try {
        const statusData = await gamma.getStatus(presentation.gammaId);

        if (
          statusData.status === "completed" ||
          statusData.status === "failed"
        ) {
          const { docId, embedUrl, viewUrl } = extractGammaUrls({
            url: statusData.url,
            gammaUrl: statusData.gammaUrl,
            embedUrl: statusData.embedUrl,
            docId: statusData.docId,
            generationId: presentation.gammaId,
          });

          await db
            .update(presentations)
            .set({
              gammaUrl: viewUrl || statusData.url || presentation.gammaUrl,
              gammaEmbedUrl: embedUrl || presentation.gammaEmbedUrl,
              gammaDocId: docId || presentation.gammaDocId,
              status: statusData.status,
              generatedAt:
                statusData.status === "completed" ? new Date() : null,
              updatedAt: new Date(),
            })
            .where(eq(presentations.id, presentation.id));

          return NextResponse.json({
            presentation: {
              id: presentation.id,
              gammaId: presentation.gammaId,
              url: viewUrl || statusData.url,
              embedUrl,
              status: statusData.status,
            },
          });
        }
      } catch (error) {
        console.error("Status check failed:", error);
      }
    }

    return NextResponse.json({
      presentation: {
        id: presentation.id,
        gammaId: presentation.gammaId,
        url: presentation.gammaUrl,
        embedUrl: presentation.gammaEmbedUrl,
        status: presentation.status,
      },
    });
  } catch (error) {
    console.error("Get campaign deck status error:", error);

    if (error instanceof GammaError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get presentation status" },
      { status: 500 }
    );
  }
}
