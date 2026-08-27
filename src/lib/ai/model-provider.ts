import { google } from "@ai-sdk/google";

export function getAiModel() {
  return google("gemini-2.5-flash");
}
