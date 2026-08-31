import "server-only";

import { getAiModel } from "@/lib/ai/model-provider";
import { db } from "@/lib/db/drizzle";
import { socialMediaPosts, socialResearchSessions } from "@/lib/db/schema";
import { ApifyClient } from "apify-client";
import { generateText } from "ai";

function getApifyClient(): ApifyClient | null {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return null;
  return new ApifyClient({ token });
}

export type ScrapedSocialPost = {
  platform: "instagram" | "youtube";
  caption?: string;
  transcript?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  engagement?: number;
  url?: string;
  timestamp?: string;
};

export type SocialResearchResult = {
  posts: ScrapedSocialPost[];
  insights: {
    totalPosts: number;
    avgEngagement: number;
    topPerformingPosts: ScrapedSocialPost[];
    lowPerformingPosts: ScrapedSocialPost[];
  };
  analysis: string;
  sessionId: string;
};

const DEFAULT_POST_LIMIT = 20;

/**
 * Scrape Instagram posts using Apify (apify/instagram-scraper)
 */
export async function scrapeInstagramPosts(
  handle: string,
  postsLimit: number = DEFAULT_POST_LIMIT
): Promise<ScrapedSocialPost[]> {
  const apifyClient = getApifyClient();
  if (!apifyClient) {
    console.warn("Apify client not initialized - APIFY_API_TOKEN missing");
    return [];
  }

  try {
    const cleanHandle = handle.replace("@", "");

    const run = await apifyClient.actor("apify/instagram-scraper").call({
      search: cleanHandle,
      resultsLimit: postsLimit,
      resultsType: "posts",
      searchType: "user",
      searchLimit: 1,
    });

    if (!run.defaultDatasetId) return [];

    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    return items.map((item) => {
      const row = item as Record<string, unknown>;
      const likesCount = Number(row.likesCount || 0);
      const commentsCount = Number(row.commentsCount || 0);

      return {
        platform: "instagram" as const,
        caption: String(row.caption || ""),
        viewCount: Number(row.videoViewCount || 0),
        likeCount: likesCount,
        commentCount: commentsCount,
        engagement: likesCount + commentsCount,
        url: String(row.url || ""),
        timestamp: String(row.timestamp || ""),
      };
    });
  } catch (error) {
    console.error("Instagram scraping failed:", error);
    return [];
  }
}

/**
 * Scrape YouTube videos using Apify (streamers/youtube-scraper)
 */
export async function scrapeYouTubePosts(
  channelHandle: string,
  videosLimit: number = DEFAULT_POST_LIMIT
): Promise<ScrapedSocialPost[]> {
  const apifyClient = getApifyClient();
  if (!apifyClient) {
    console.warn("Apify client not initialized - APIFY_API_TOKEN missing");
    return [];
  }

  try {
    const channelUrl = channelHandle.startsWith("http")
      ? channelHandle
      : `https://www.youtube.com/@${channelHandle.replace("@", "")}`;

    const run = await apifyClient.actor("streamers/youtube-scraper").call({
      startUrls: [{ url: channelUrl }],
      maxResults: videosLimit,
      maxResultsShorts: 0,
      maxResultStreams: 0,
    });

    if (!run.defaultDatasetId) return [];

    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    return items.map((item) => {
      const row = item as Record<string, unknown>;
      const viewCount = Number(row.viewCount || 0);
      const likeCount = Number(row.likes || 0);
      const commentCount = Number(row.commentsCount || 0);
      const engagement =
        viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;

      return {
        platform: "youtube" as const,
        caption: String(row.title || ""),
        transcript: String(row.text || row.description || ""),
        viewCount,
        likeCount,
        commentCount,
        engagement,
        url: String(row.url || ""),
        timestamp: String(row.date || ""),
      };
    });
  } catch (error) {
    console.error("YouTube scraping failed:", error);
    return [];
  }
}

function calculateInsights(posts: ScrapedSocialPost[]) {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      avgEngagement: 0,
      topPerformingPosts: [] as ScrapedSocialPost[],
      lowPerformingPosts: [] as ScrapedSocialPost[],
    };
  }

  const totalEngagement = posts.reduce(
    (sum, post) => sum + (post.engagement || 0),
    0
  );
  const avgEngagement = totalEngagement / posts.length;
  const sortedPosts = [...posts].sort(
    (a, b) => (b.engagement || 0) - (a.engagement || 0)
  );

  return {
    totalPosts: posts.length,
    avgEngagement,
    topPerformingPosts: sortedPosts.slice(0, 5),
    lowPerformingPosts: sortedPosts.slice(-5).reverse(),
  };
}

export async function analyzeSocialMediaPerformance(
  posts: ScrapedSocialPost[],
  brandName: string
): Promise<string> {
  if (posts.length === 0) {
    return "No social media data available for analysis.";
  }

  const insights = calculateInsights(posts);
  const model = getAiModel();

  const topPostsData = insights.topPerformingPosts
    .map(
      (post, idx) => `
${idx + 1}. Platform: ${post.platform.toUpperCase()}
   Caption: ${post.caption?.substring(0, 200) || "N/A"}
   Metrics: ${post.viewCount || "N/A"} views, ${post.likeCount || 0} likes, ${post.commentCount || 0} comments
   Engagement: ${post.engagement?.toFixed(2) || "0"}
   URL: ${post.url || "N/A"}
`
    )
    .join("\n");

  const lowPostsData = insights.lowPerformingPosts
    .map(
      (post, idx) => `
${idx + 1}. Platform: ${post.platform.toUpperCase()}
   Caption: ${post.caption?.substring(0, 200) || "N/A"}
   Metrics: ${post.viewCount || "N/A"} views, ${post.likeCount || 0} likes, ${post.commentCount || 0} comments
   Engagement: ${post.engagement?.toFixed(2) || "0"}
`
    )
    .join("\n");

  try {
    const result = await generateText({
      model,
      prompt: `You are a social media strategist analyzing ${brandName}'s recent social media performance.

**SOCIAL MEDIA DATA ANALYSIS**

Total Posts Analyzed: ${insights.totalPosts}
Average Engagement: ${insights.avgEngagement.toFixed(2)}

**TOP PERFORMING POSTS:**
${topPostsData}

**LOW PERFORMING POSTS:**
${lowPostsData}

**YOUR TASK:**
Analyze this data and provide insights in the following format:

1. **What Worked** (3-5 bullet points):
   - Identify common themes, content types, or messaging in high-performing posts
   - Look for patterns in captions, visual style, topics, emotional tone
   - Consider timing, format (video/image/carousel), and engagement patterns

2. **What Didn't Work** (3-5 bullet points):
   - Identify what low-performing content had in common
   - Point out missed opportunities or ineffective approaches

3. **Key Creative Insights** (2-3 strategic recommendations):
   - Based on the data, what should future campaigns focus on?
   - What content themes or formats should be prioritized?
   - What audience preferences are evident from engagement patterns?

**CRITICAL - NO COMPETITOR REFERENCES:**
- NEVER mention other brands or competitors by name
- NEVER use examples from other companies (e.g., "like Brand X does")
- Focus ONLY on ${brandName}'s performance and data
- Use generic industry references if needed: "industry trends", "best practices", "successful content strategies"

Be specific, data-driven, and actionable. Focus on creative and strategic insights, not just metrics.`,
    });

    return result.text;
  } catch (error) {
    console.error("Social media analysis failed:", error);
    return "Failed to generate social media analysis.";
  }
}

type StructuredInsights = {
  whatWorked: string[];
  whatDidntWork: string[];
  keyInsights: string[];
};

function parseInsightsFromAnalysis(analysis: string): StructuredInsights {
  const insights: StructuredInsights = {
    whatWorked: [],
    whatDidntWork: [],
    keyInsights: [],
  };

  try {
    const whatWorkedMatch = analysis.match(
      /What Worked.*?:([\s\S]*?)(?=What Didn't Work|Key Creative Insights|$)/i
    );
    const whatDidntWorkMatch = analysis.match(
      /What Didn't Work.*?:([\s\S]*?)(?=Key Creative Insights|$)/i
    );
    const keyInsightsMatch = analysis.match(
      /Key Creative Insights.*?:([\s\S]*?)$/i
    );

    const extractBullets = (block: string) =>
      block
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().substring(1).trim())
        .filter(Boolean);

    if (whatWorkedMatch) {
      insights.whatWorked = extractBullets(whatWorkedMatch[1]);
    }
    if (whatDidntWorkMatch) {
      insights.whatDidntWork = extractBullets(whatDidntWorkMatch[1]);
    }
    if (keyInsightsMatch) {
      insights.keyInsights = extractBullets(keyInsightsMatch[1]);
    }
  } catch (error) {
    console.error("Failed to parse insights:", error);
  }

  return insights;
}

/**
 * Conduct social media research via Apify, analyze with LLM, and persist session + posts.
 */
export async function conductSocialMediaResearch(params: {
  brandName: string;
  instagramHandle: string | null;
  youtubeChannel: string | null;
  linkedinPage?: string | null;
  workspaceId: string;
  campaignId?: string | null;
}): Promise<SocialResearchResult> {
  const {
    brandName,
    instagramHandle,
    youtubeChannel,
    linkedinPage = null,
    workspaceId,
    campaignId,
  } = params;

  const allPosts: ScrapedSocialPost[] = [];
  const platformsAnalyzed: Array<"instagram" | "youtube"> = [];

  if (instagramHandle) {
    const instagramPosts = await scrapeInstagramPosts(
      instagramHandle,
      DEFAULT_POST_LIMIT
    );
    allPosts.push(...instagramPosts);
    if (instagramPosts.length > 0) {
      platformsAnalyzed.push("instagram");
    }
  }

  if (youtubeChannel) {
    const youtubePosts = await scrapeYouTubePosts(
      youtubeChannel,
      DEFAULT_POST_LIMIT
    );
    allPosts.push(...youtubePosts);
    if (youtubePosts.length > 0) {
      platformsAnalyzed.push("youtube");
    }
  }

  const insights = calculateInsights(allPosts);
  const analysis =
    allPosts.length > 0
      ? await analyzeSocialMediaPerformance(allPosts, brandName)
      : `No social media posts were returned for ${brandName}. Check Instagram/YouTube handles in Settings or Apify actor availability.`;

  const structuredInsights = parseInsightsFromAnalysis(analysis);

  const [session] = await db
    .insert(socialResearchSessions)
    .values({
      workspaceId,
      campaignId: campaignId || null,
      brandName,
      instagramHandle,
      youtubeChannel,
      linkedinPage,
      totalPosts: String(allPosts.length),
      platformsAnalyzed,
      avgEngagement: String(insights.avgEngagement.toFixed(2)),
      analysis,
      insights: structuredInsights,
      metadata: {
        source: "apify",
        topPerformingCount: insights.topPerformingPosts.length,
        lowPerformingCount: insights.lowPerformingPosts.length,
        scrapeTimestamp: new Date().toISOString(),
      },
      createdAt: new Date(),
    })
    .returning();

  if (allPosts.length > 0) {
    await db.insert(socialMediaPosts).values(
      allPosts.map((post) => ({
        sessionId: session.id,
        platform: post.platform,
        caption: post.caption || null,
        url: post.url || null,
        postTimestamp: (() => {
          if (!post.timestamp) return null;
          const d = new Date(post.timestamp);
          return Number.isNaN(d.getTime()) ? null : d;
        })(),
        viewCount:
          post.viewCount !== undefined ? String(post.viewCount) : null,
        likeCount:
          post.likeCount !== undefined ? String(post.likeCount) : null,
        commentCount:
          post.commentCount !== undefined ? String(post.commentCount) : null,
        engagementRate:
          post.engagement !== undefined ? String(post.engagement) : null,
        metadata: {
          transcript: post.transcript,
        },
        createdAt: new Date(),
      }))
    );
  }

  return {
    posts: allPosts,
    insights,
    analysis,
    sessionId: session.id,
  };
}
