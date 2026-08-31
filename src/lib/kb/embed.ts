import { google } from "@ai-sdk/google";
import { embed } from "ai";

const MAX_CHARS = 8000;

/**
 * Embed text with Google gemini-embedding-001.
 * Returns null if API keys are missing or the call fails (callers fall back to ILIKE).
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.GOOGLE_API_KEY
  ) {
    return null;
  }

  const value = text.trim().slice(0, MAX_CHARS);
  if (!value) return null;

  try {
    const result = await embed({
      model: google.textEmbedding("gemini-embedding-001"),
      value,
    });
    return result.embedding;
  } catch (error) {
    console.error("Embedding failed:", error);
    return null;
  }
}
