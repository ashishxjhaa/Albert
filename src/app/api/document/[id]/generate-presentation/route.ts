import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { documents, presentations, workspaces } from "@/lib/db/schema";
import { checkAndIncrementUsage } from "@/lib/db/user";
import { GammaError, extractGammaUrls, gamma } from "@/lib/gamma";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const generatePresentationSchema = z.object({
  additionalNotes: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

async function loadOwnedDocument(documentId: string, userId: string) {
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);

  if (!document) return { error: "Document not found" as const, status: 404 };

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, document.workspaceId),
        eq(workspaces.user, userId),
        isNull(workspaces.deletedAt)
      )
    )
    .limit(1);

  if (!workspace) return { error: "Forbidden" as const, status: 403 };

  return { document, workspace };
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

    const usageCheck = await checkAndIncrementUsage(
      session.user.id,
      "presentation"
    );
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: "Presentation limit reached",
          message: `You have used all ${usageCheck.limit} presentations available on this account.`,
          used: usageCheck.used,
          limit: usageCheck.limit,
        },
        { status: 429 }
      );
    }

    const { id } = await params;
    const owned = await loadOwnedDocument(id, session.user.id);
    if ("error" in owned && owned.error) {
      return NextResponse.json(
        { error: owned.error },
        { status: owned.status }
      );
    }

    const { document, workspace } = owned as {
      document: typeof documents.$inferSelect;
      workspace: typeof workspaces.$inferSelect;
    };

    const body = await req.json().catch(() => ({}));
    const { additionalNotes } = generatePresentationSchema.parse(body);

    const brandColors = workspace.brandColors as
      | { primary?: string; secondary?: string; accent?: string }
      | null;

    const [presentationRecord] = await db
      .insert(presentations)
      .values({
        title: document.title || "Untitled Idea",
        gammaId: "",
        gammaUrl: "",
        status: "generating",
        documentId: id,
        workspaceId: document.workspaceId,
        authorId: session.user.id,
        additionalNotes: additionalNotes || null,
        config: {
          brandName: workspace.brandName,
          industry: workspace.industry,
          brandColors,
        },
      })
      .returning();

    await db
      .update(documents)
      .set({
        presentationStatus: "generating",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id));

    try {
      const result = await gamma.createPresentation({
        title: document.title || "Untitled Idea",
        content: document.content || document.markdown || "",
        brandName: workspace.brandName || workspace.name || undefined,
        industry: workspace.industry || undefined,
        brandGuidelines: workspace.brandGuidelines || undefined,
        brandColors: brandColors
          ? {
              primary: brandColors.primary,
              secondary: brandColors.secondary,
              accent: brandColors.accent,
            }
          : undefined,
        logoUrl: workspace.logoUrl || undefined,
        additionalNotes,
      });

      const { docId, viewUrl, embedUrl } = extractGammaUrls({
        url: result.url,
        embedUrl: result.embedUrl,
        generationId: result.generationId,
      });

      const status = result.success ? "completed" : "failed";

      await db
        .update(presentations)
        .set({
          gammaId: result.generationId || presentationRecord.gammaId,
          gammaUrl: viewUrl || result.url || "",
          gammaEmbedUrl: embedUrl || result.embedUrl || null,
          gammaDocId: docId || null,
          status,
          error: result.error || null,
          generatedAt: result.success ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(presentations.id, presentationRecord.id));

      await db
        .update(documents)
        .set({
          gammaId: result.generationId || null,
          gammaUrl: viewUrl || result.url || null,
          gammaEmbedUrl: embedUrl || result.embedUrl || null,
          presentationStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, id));

      return NextResponse.json({
        success: result.success,
        presentation: {
          id: presentationRecord.id,
          gammaId: result.generationId,
          url: viewUrl || result.url,
          embedUrl: embedUrl || result.embedUrl,
          status: result.status === "completed" ? "completed" : status,
        },
        error: result.error,
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

      await db
        .update(documents)
        .set({
          presentationStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, id));

      throw error;
    }
  } catch (error) {
    console.error("Generate presentation error:", error);

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
            : "Failed to generate presentation",
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

    const { id } = await params;
    const owned = await loadOwnedDocument(id, session.user.id);
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
          eq(presentations.documentId, id),
          isNull(presentations.deletedAt)
        )
      )
      .orderBy(desc(presentations.createdAt))
      .limit(1);

    if (!presentation) {
      return NextResponse.json({ presentation: null });
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

          await db
            .update(documents)
            .set({
              gammaUrl: viewUrl || statusData.url || presentation.gammaUrl,
              gammaEmbedUrl: embedUrl || presentation.gammaEmbedUrl,
              presentationStatus: statusData.status,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, id));

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
    console.error("Get presentation status error:", error);

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
