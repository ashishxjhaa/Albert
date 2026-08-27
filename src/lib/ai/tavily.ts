export type TavilySearchResult = {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  answer: string | null;
};

export async function tavilySearch(
  query: string,
  searchDepth: "basic" | "advanced" = "basic",
  maxResults = 5
): Promise<TavilySearchResult | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
      include_images: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Tavily API error: ${response.status} - ${
        (errorData as { message?: string }).message || response.statusText
      }`
    );
  }

  return (await response.json()) as TavilySearchResult;
}
