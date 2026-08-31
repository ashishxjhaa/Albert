import { getAiModel } from "@/lib/ai/model-provider";
import { tavilySearch } from "@/lib/ai/tavily";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import {
  collections,
  documents,
  socialResearchSessions,
  workspaces,
} from "@/lib/db/schema";
import { searchWorkspaceKb } from "@/lib/kb/search";
import { generateText } from "ai";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

type ParsedIdea = {
  title: string;
  content: string;
  markdown: string;
};

function parseIdeas(generatedIdeasMarkdown: string): ParsedIdea[] {
  return generatedIdeasMarkdown
    .split("---")
    .filter(Boolean)
    .map((ideaString) => {
      const cleanMarkdown = ideaString.trim();
      const titleMatch =
        cleanMarkdown.match(/^##\s*(.*)/m) ||
        cleanMarkdown.match(/^#\s*(.*)/m) ||
        cleanMarkdown.match(/\*\*Title:?\*\*\s*(.*)/);
      const summaryMatch = cleanMarkdown.match(/\*\*Summary:\*\*\s*(.*)/);
      const conceptMatch = cleanMarkdown.match(
        /\*\*Concept:\*\*\s*([\s\S]*?)(?=\*\*Call to Action:\*\*|\Z)/
      );
      const callToActionMatch = cleanMarkdown.match(
        /\*\*Call to Action:\*\*\s*(.*)/
      );

      let title = titleMatch ? titleMatch[1].trim() : "Untitled Idea";
      title = title.replace(/\*\*/g, "").replace(/^:/, "").trim();

      const summary = summaryMatch ? summaryMatch[1].trim() : "";
      const concept = conceptMatch ? conceptMatch[1].trim() : "";
      const callToAction = callToActionMatch
        ? callToActionMatch[1].trim()
        : "";

      return {
        title,
        content: `**Summary:** ${summary}\n\n**Concept:** ${concept}\n\n**Call to Action:** ${callToAction}`,
        markdown: cleanMarkdown,
        hasContent: Boolean(
          concept || (summary && title !== "Untitled Idea")
        ),
      };
    })
    .filter((idea) => idea.hasContent)
    .map(({ title, content, markdown }) => ({ title, content, markdown }));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collectionId } = await params;

  const [campaign] = await db
    .select()
    .from(collections)
    .where(
      and(eq(collections.id, collectionId), isNull(collections.deletedAt))
    )
    .limit(1);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, campaign.workspaceId),
        eq(workspaces.user, session.user.id),
        isNull(workspaces.deletedAt)
      )
    )
    .limit(1);

  if (!workspace) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.GOOGLE_API_KEY
  ) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY) in environment",
      },
      { status: 500 }
    );
  }

  const userId = session.user.id;
  const model = getAiModel();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      };

      try {
        send("status", { message: "Starting campaign generation..." });
        send("thought", {
          message:
            "Gathering brand context and campaign brief to shape creative ideas.",
        });

        const brandName =
          workspace.brandName || workspace.name || "the brand";
        const website = workspace.website;
        const industry =
          campaign.industry || workspace.industry || "N/A";
        const brandColors = workspace.brandColors as
          | { primary?: string; secondary?: string; accent?: string }
          | null;

        let searchAnswer: string | null = null;
        let rawSearchResults = "";
        let kbExcerpts = "";
        let researchInsights = "";

        send("status", { message: "Researching brand (optional web search)..." });
        try {
          const searchQuery = [
            brandName,
            campaign.industry,
            campaign.brief ? "campaign" : null,
          ]
            .filter(Boolean)
            .join(" ");

          const search = await tavilySearch(searchQuery, "basic", 5);
          if (search) {
            searchAnswer = search.answer;
            rawSearchResults = search.results
              .map((r) => `- ${r.title}: ${r.content}`)
              .join("\n");
            send("status", {
              message: `Found ${search.results.length} research results.`,
            });
          } else {
            send("status", {
              message: "No Tavily key — continuing with campaign brief only.",
            });
          }
        } catch (error) {
          console.error("Tavily research failed:", error);
          send("status", {
            message: "Web research skipped — continuing with brief.",
          });
        }

        send("status", { message: "Searching knowledge base..." });
        try {
          const briefSnippet = (campaign.brief || "").trim().slice(0, 80);
          const kbQuery =
            [
              brandName,
              campaign.industry,
              campaign.targetAudience,
              briefSnippet || null,
            ]
              .filter(Boolean)
              .join(" ")
              .trim() || "campaign marketing";

          const kbHits = await searchWorkspaceKb({
            userId,
            workspaceId: campaign.workspaceId,
            query: kbQuery,
            topK: 5,
          });

          if (kbHits.length > 0) {
            kbExcerpts = kbHits
              .map((hit, i) => {
                const text = hit.content.slice(0, 500);
                return `${i + 1}. [${hit.sourceId}]\n${text}`;
              })
              .join("\n\n");
            send("status", {
              message: `Found ${kbHits.length} knowledge base match(es).`,
            });
          } else {
            send("status", {
              message: "No KB matches — continuing.",
            });
          }
        } catch (error) {
          console.error("KB search failed:", error);
          send("status", {
            message: "Knowledge base search skipped — continuing.",
          });
        }

        send("status", { message: "Loading research insights..." });
        try {
          const [campaignResearch] = await db
            .select()
            .from(socialResearchSessions)
            .where(
              and(
                eq(socialResearchSessions.workspaceId, campaign.workspaceId),
                eq(socialResearchSessions.campaignId, collectionId),
                isNull(socialResearchSessions.deletedAt)
              )
            )
            .orderBy(desc(socialResearchSessions.createdAt))
            .limit(1);

          let research = campaignResearch ?? null;

          if (!research) {
            const [workspaceResearch] = await db
              .select()
              .from(socialResearchSessions)
              .where(
                and(
                  eq(
                    socialResearchSessions.workspaceId,
                    campaign.workspaceId
                  ),
                  isNull(socialResearchSessions.deletedAt)
                )
              )
              .orderBy(desc(socialResearchSessions.createdAt))
              .limit(1);
            research = workspaceResearch ?? null;
          }

          if (research) {
            const parts: string[] = [];
            if (research.analysis) {
              parts.push(research.analysis.slice(0, 2000));
            }
            const insights = research.insights as {
              keyInsights?: unknown;
            } | null;
            if (
              insights?.keyInsights &&
              Array.isArray(insights.keyInsights) &&
              insights.keyInsights.length > 0
            ) {
              parts.push(
                `Key insights:\n${insights.keyInsights
                  .map((k) => `- ${String(k)}`)
                  .join("\n")}`
              );
            }
            if (parts.length > 0) {
              researchInsights = parts.join("\n\n");
              send("status", {
                message: `Loaded research for ${research.brandName}.`,
              });
            } else {
              send("status", {
                message: "Research session found but empty — continuing.",
              });
            }
          } else {
            send("status", {
              message: "No research sessions — continuing.",
            });
          }
        } catch (error) {
          console.error("Research load failed:", error);
          send("status", {
            message: "Research insights skipped — continuing.",
          });
        }

        let brandProfileContent = `Brand Name: ${brandName}\n`;
        if (website) brandProfileContent += `Website: ${website}\n`;
        brandProfileContent += `Campaign Brief: ${campaign.brief || "N/A"}\n`;
        brandProfileContent += `Target Audience: ${campaign.targetAudience || "N/A"}\n`;
        brandProfileContent += `Industry: ${industry}\n`;
        brandProfileContent += `Tone: ${campaign.tone || "N/A"}\n`;
        if (workspace.brandGuidelines) {
          brandProfileContent += `Brand Guidelines: ${workspace.brandGuidelines}\n`;
        }
        if (
          brandColors?.primary ||
          brandColors?.secondary ||
          brandColors?.accent
        ) {
          const colorParts = [
            brandColors.primary && `Primary: ${brandColors.primary}`,
            brandColors.secondary && `Secondary: ${brandColors.secondary}`,
            brandColors.accent && `Accent: ${brandColors.accent}`,
          ].filter(Boolean);
          brandProfileContent += `Brand Colors: ${colorParts.join(", ")}\n`;
        }
        brandProfileContent += `\n`;
        if (searchAnswer) {
          brandProfileContent += `Key Web Answer: ${searchAnswer}\n\n`;
        }
        if (rawSearchResults) {
          brandProfileContent += `Relevant Search Results:\n${rawSearchResults}\n\n`;
        }
        if (kbExcerpts) {
          brandProfileContent += `Knowledge Base Excerpts:\n${kbExcerpts}\n\n`;
        }
        if (researchInsights) {
          brandProfileContent += `Research Insights:\n${researchInsights}\n\n`;
        }

        send("status", { message: "Summarizing brand profile..." });

        const brandProfileResult = await generateText({
          model,
          prompt: `You are an expert brand analyst. Summarize the following into a concise brand profile. Focus on core business, audience, messaging, and campaign fit. NEVER name specific competitor brands — use generic references only.

Information:
${brandProfileContent}`,
        });

        const summarizedBrandProfile = brandProfileResult.text;
        send("brandProfileUpdate", { partial: summarizedBrandProfile });

        await db
          .update(collections)
          .set({
            brandProfile: summarizedBrandProfile,
            updatedAt: new Date(),
          })
          .where(eq(collections.id, collectionId));

        const totalIdeas = 6;
        send("status", {
          message: `Generating ${totalIdeas} campaign ideas...`,
        });
        send("thought", {
          message:
            "Creative director mode: mixing digital, offline, and hybrid concepts tailored to the brief.",
        });

        const ideasResult = await generateText({
          model,
          prompt: `You are a creative director. Generate EXACTLY ${totalIdeas} distinct campaign ideas for ${brandName}.

**Requirements:**
- Mix digital-only, offline-only, and hybrid ideas
- Match tone from the brief; be specific about mechanics and creative hook
- NEVER mention competitor brands by name — only reference ${brandName}
- Separate each idea with "---"
- Format EACH idea as:

## [Idea Title]
**Summary:** [One-sentence summary]
**Concept:** [Detailed concept with mechanics and why it fits]
**Call to Action:** [Clear CTA]

Brand Profile Summary:
${summarizedBrandProfile}

Campaign details:
${brandProfileContent}
`,
        });

        send("ideaGenerationUpdate", { partial: ideasResult.text });
        send("status", { message: "Parsing and saving ideas..." });

        const ideasArray = parseIdeas(ideasResult.text);

        if (ideasArray.length === 0) {
          send("error", {
            message:
              "Failed to parse any ideas from AI response. Please try again.",
          });
          throw new Error("No ideas could be parsed from AI response");
        }

        for (const idea of ideasArray) {
          const [newIdea] = await db
            .insert(documents)
            .values({
              title: idea.title,
              content: idea.content,
              markdown: idea.markdown,
              collectionId: campaign.id,
              workspaceId: campaign.workspaceId,
              authorId: userId,
              tags: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          send("ideaCreated", {
            id: newIdea.id,
            title: newIdea.title,
            content: newIdea.content,
            markdown: newIdea.markdown,
            createdAt: newIdea.createdAt,
          });
        }

        send("status", {
          message: `Saved ${ideasArray.length} idea(s) successfully!`,
        });
        send("done", { count: ideasArray.length });
      } catch (error) {
        console.error("Campaign generation stream error:", error);
        send("error", {
          message: `Campaign generation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
