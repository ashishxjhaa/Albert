/**
 * Gamma API Utilities
 *
 * Helper functions for working with Gamma API
 */

import { GenerationStatus } from './types';

/**
 * Check if generation is in a final state
 */
export function isGenerationComplete(status: GenerationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'error';
}

/**
 * Check if generation was successful
 */
export function isGenerationSuccessful(status: GenerationStatus): boolean {
  return status === 'completed';
}

/**
 * Check if generation failed
 */
export function isGenerationFailed(status: GenerationStatus): boolean {
  return status === 'failed' || status === 'error';
}

/**
 * Check if generation is still processing
 */
export function isGenerationProcessing(status: GenerationStatus): boolean {
  return (
    status === 'pending' ||
    status === 'processing' ||
    status === 'generating'
  );
}

/**
 * Validate input text length (approximate token count)
 *
 * Note: This is a rough approximation. Actual token count may vary.
 */
export function validateInputText(text: string): {
  valid: boolean;
  estimatedTokens: number;
  error?: string;
} {
  const estimatedTokens = Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 chars

  if (estimatedTokens < 1) {
    return {
      valid: false,
      estimatedTokens,
      error: 'Input text is too short',
    };
  }

  if (estimatedTokens > 100000) {
    return {
      valid: false,
      estimatedTokens,
      error: 'Input text exceeds 100,000 token limit',
    };
  }

  return {
    valid: true,
    estimatedTokens,
  };
}

/**
 * Format brand colors for Gamma API
 */
export function formatBrandColors(colors: {
  primary?: string;
  secondary?: string;
  accent?: string;
}): string {
  const parts: string[] = [];

  if (colors.primary) {
    parts.push(`primary color ${colors.primary}`);
  }

  if (colors.secondary) {
    parts.push(`secondary color ${colors.secondary}`);
  }

  if (colors.accent) {
    parts.push(`accent color ${colors.accent}`);
  }

  return parts.length > 0 ? parts.join(', ') : '';
}

/**
 * Extract generation ID from URL or response
 */
export function extractGenerationId(
  input: string | { generationId?: string; id?: string }
): string | null {
  if (typeof input === 'string') {
    // Try to extract from URL
    const match = input.match(/\/docs\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  }

  return input.generationId || input.id || null;
}

/**
 * Build Gamma presentation URL from generation ID or doc ID
 */
export function buildGammaUrl(id: string): string {
  return `https://gamma.app/docs/${id}`;
}

/**
 * Build Gamma embed URL from doc ID
 */
export function buildGammaEmbedUrl(docId: string): string {
  return `https://gamma.app/embed/${docId}`;
}

/**
 * Extract doc ID from Gamma URL
 * Handles various URL formats:
 * - https://gamma.app/docs/Title-4h4xcqc58avcxr7?mode=doc
 * - https://gamma.app/docs/4h4xcqc58avcxr7
 * - https://gamma.app/embed/4h4xcqc58avcxr7
 */
export function extractDocIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // For /docs/ URLs, the doc ID is the last segment or part after last dash
    if (pathname.includes('/docs/')) {
      const docsPart = pathname.split('/docs/')[1];
      if (!docsPart) return null;

      // Remove query params if present
      const cleanPath = docsPart.split('?')[0];

      // Check if it contains a title (has dashes and alphanumeric at end)
      // Format: Title-text-here-docId
      const match = cleanPath.match(/[a-z0-9]{17}$/i);
      if (match) {
        return match[0];
      }

      // Otherwise, it might just be the doc ID
      return cleanPath;
    }

    // For /embed/ URLs, doc ID is the path segment
    if (pathname.includes('/embed/')) {
      const embedPart = pathname.split('/embed/')[1];
      return embedPart ? embedPart.split('?')[0] : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract URLs from Gamma API response
 */
export function extractGammaUrls(response: {
  url?: string;
  gammaUrl?: string;
  webUrl?: string;
  embedUrl?: string;
  docId?: string;
  generationId?: string;
}): {
  viewUrl: string | null;
  embedUrl: string | null;
  docId: string | null;
} {
  // Try to extract doc ID from various sources
  let docId = response.docId || null;

  // Determine the best URL to use (gammaUrl is most common from Gamma API)
  const primaryUrl = response.gammaUrl || response.url || response.webUrl;

  // If we have a URL but no docId, try to extract it
  if (!docId && primaryUrl) {
    docId = extractDocIdFromUrl(primaryUrl);
  }

  // Determine view URL - prioritize gammaUrl since that's what Gamma returns
  const viewUrl =
    response.gammaUrl ||
    response.url ||
    response.webUrl ||
    (docId ? buildGammaUrl(docId) : null) ||
    (response.generationId ? buildGammaUrl(response.generationId) : null);

  // Determine embed URL
  const embedUrl =
    response.embedUrl ||
    (docId ? buildGammaEmbedUrl(docId) : null);

  return {
    viewUrl,
    embedUrl,
    docId,
  };
}

/**
 * Estimate presentation generation time
 *
 * Based on number of slides and complexity
 */
export function estimateGenerationTime(numSlides: number): {
  minSeconds: number;
  maxSeconds: number;
  message: string;
} {
  // Base time: ~5-10 seconds per slide with AI image generation
  const minSeconds = numSlides * 5;
  const maxSeconds = numSlides * 15;

  let message = '';
  if (maxSeconds < 60) {
    message = `Estimated time: ${minSeconds}-${maxSeconds} seconds`;
  } else {
    const minMinutes = Math.floor(minSeconds / 60);
    const maxMinutes = Math.ceil(maxSeconds / 60);
    message = `Estimated time: ${minMinutes}-${maxMinutes} minute${maxMinutes > 1 ? 's' : ''}`;
  }

  return {
    minSeconds,
    maxSeconds,
    message,
  };
}

/**
 * Sanitize input text for Gamma API
 *
 * Removes problematic characters and formats text
 */
export function sanitizeInputText(text: string): string {
  return (
    text
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove excessive blank lines (more than 2 consecutive)
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim
      .trim()
  );
}

/**
 * Build slide structure hint for Gamma
 *
 * Helps Gamma understand desired presentation structure
 */
export function buildSlideStructureHint(slides: string[]): string {
  return slides.map((title, index) => `${index + 1}. ${title}`).join('\n');
}

/**
 * Calculate polling interval based on number of slides
 *
 * More slides = longer intervals to reduce API calls
 */
export function calculatePollingInterval(numSlides: number): number {
  if (numSlides <= 5) return 3000; // 3 seconds
  if (numSlides <= 10) return 5000; // 5 seconds
  if (numSlides <= 20) return 7000; // 7 seconds
  return 10000; // 10 seconds
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(status: GenerationStatus): string {
  switch (status) {
    case 'pending':
      return 'Your presentation is queued for generation...';
    case 'processing':
      return 'Processing your content...';
    case 'generating':
      return 'Creating your presentation with AI...';
    case 'completed':
      return 'Your presentation is ready!';
    case 'failed':
      return 'Presentation generation failed';
    case 'error':
      return 'An error occurred during generation';
    default:
      return 'Unknown status';
  }
}

/**
 * Parse Gamma error response
 */
export function parseGammaError(error: any): {
  message: string;
  statusCode?: number;
  details?: any;
} {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error?.message) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details || error.errors,
    };
  }

  return {
    message: 'An unexpected error occurred',
    details: error,
  };
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        [400, 401, 403].includes(error.statusCode as number)
      ) {
        throw error;
      }

      // Don't sleep on last attempt
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${
    remainingSeconds !== 1 ? 's' : ''
  }`;
}
