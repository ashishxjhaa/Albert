/**
 * Gamma API Service
 *
 * Production-ready service for creating presentations using Gamma API
 * Supports single ideas, campaign decks, and custom presentations
 *
 * @example
 * ```typescript
 * const gamma = new GammaService();
 *
 * // Create a single idea presentation
 * const result = await gamma.createPresentation({
 *   title: "Campaign Title",
 *   content: "Campaign details...",
 *   brandName: "Sony Liv",
 *   brandColors: { primary: "#0066CC" }
 * });
 *
 * // Create a campaign deck with multiple ideas
 * const deckResult = await gamma.createCampaignDeck({
 *   campaignTitle: "Q2 Marketing Campaign",
 *   ideas: [
 *     { title: "Idea 1", content: "..." },
 *     { title: "Idea 2", content: "..." }
 *   ],
 *   brandName: "Sony Liv"
 * });
 * ```
 */

import {
  CreateGammaRequest,
  CreateGammaResponse,
  GammaStatusResponse,
  GammaErrorResponse,
  PollingConfig,
  PollingResult,
  GammaResult,
  CreatePresentationOptions,
  CreateCampaignDeckOptions,
  GenerationStatus,
} from './types';

import {
  GAMMA_ENDPOINTS,
  DEFAULT_POLLING_CONFIG,
  CAMPAIGN_PRESET,
  CAMPAIGN_DECK_PRESET,
  ERROR_MESSAGES,
  INDUSTRY_INSTRUCTIONS,
  MEDIA_ASSET_INSTRUCTIONS,
} from './config';

import { extractGammaUrls } from './utils';

/**
 * Custom error class for Gamma API errors
 */
export class GammaError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'GammaError';
  }
}

/**
 * Gamma API Service
 *
 * Handles all interactions with Gamma API for presentation generation
 */
export class GammaService {
  private apiKey: string;

  /**
   * Initialize Gamma service
   * @param apiKey - Gamma API key (defaults to env variable)
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GAMMA_API_KEY || '';

    if (!this.apiKey) {
      throw new GammaError(ERROR_MESSAGES.NO_API_KEY, 401);
    }
  }

  // =========================================================================
  // Core API Methods
  // =========================================================================

  /**
   * Create a gamma (low-level API method)
   *
   * @param request - Complete Gamma API request
   * @returns Generation ID
   */
  async createGamma(request: CreateGammaRequest): Promise<CreateGammaResponse> {
    try {
      const response = await fetch(GAMMA_ENDPOINTS.GENERATIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: CreateGammaResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof GammaError) {
        throw error;
      }
      throw new GammaError(
        ERROR_MESSAGES.NETWORK_ERROR,
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get gamma generation status
   *
   * @param generationId - The generation ID
   * @returns Current status and details
   */
  async getStatus(generationId: string): Promise<GammaStatusResponse> {
    try {
      const response = await fetch(`${GAMMA_ENDPOINTS.GENERATIONS}/${generationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: GammaStatusResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof GammaError) {
        throw error;
      }
      throw new GammaError(
        ERROR_MESSAGES.NETWORK_ERROR,
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Poll for gamma generation completion
   *
   * @param generationId - The generation ID
   * @param config - Polling configuration
   * @returns Polling result with final status
   */
  async pollForCompletion(
    generationId: string,
    config: PollingConfig = {}
  ): Promise<PollingResult> {
    const {
      maxAttempts = DEFAULT_POLLING_CONFIG.maxAttempts,
      interval = DEFAULT_POLLING_CONFIG.interval,
      timeout = DEFAULT_POLLING_CONFIG.timeout,
    } = config;

    const startTime = Date.now();
    let attempts = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts++;

      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new GammaError(ERROR_MESSAGES.POLLING_TIMEOUT, 408);
      }

      try {
        const statusData = await this.getStatus(generationId);

        // Log the full response for debugging
        console.log('[Gamma Service] Status response:', JSON.stringify(statusData, null, 2));

        // Check if generation is complete
        if (statusData.status === 'completed' || statusData.url || statusData.webUrl) {
          // Extract URLs using utility function
          const { viewUrl, embedUrl, docId } = extractGammaUrls({
            ...statusData,
            generationId,
          });

          console.log('[Gamma Service] Extracted URLs:', {
            viewUrl,
            embedUrl,
            docId,
            originalResponse: statusData,
          });

          return {
            status: 'completed',
            url: viewUrl || `https://gamma.app/docs/${generationId}`,
            embedUrl: embedUrl || undefined,
            data: statusData,
            attempts,
            duration: Date.now() - startTime,
          };
        }

        // Check if generation failed
        if (statusData.status === 'failed' || statusData.status === 'error' || statusData.error) {
          return {
            status: 'failed',
            error: statusData.error || ERROR_MESSAGES.GENERATION_FAILED,
            data: statusData,
            attempts,
            duration: Date.now() - startTime,
          };
        }

        // Still processing, wait before next attempt
        if (attempt < maxAttempts - 1) {
          await this.sleep(interval);
        }
      } catch (error) {
        // If it's the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw error;
        }

        // Wait before retrying
        await this.sleep(interval);
      }
    }

    // Timeout - generation took too long
    throw new GammaError(ERROR_MESSAGES.POLLING_TIMEOUT, 408);
  }

  // =========================================================================
  // High-Level Convenience Methods
  // =========================================================================

  /**
   * Create a presentation for a single campaign idea
   *
   * Simplified method with smart defaults for campaign presentations
   *
   * @param options - Presentation options
   * @returns Result with generation ID and URL (if polling completes)
   */
  async createPresentation(
    options: CreatePresentationOptions,
    shouldPoll: boolean = true
  ): Promise<GammaResult> {
    const {
      title,
      content,
      brandName,
      industry,
      brandGuidelines,
      brandColors,
      logoUrl,
      additionalNotes,
      numSlides,
      tone,
      audience,
      imageStyle,
      themeId,
      dimensions,
    } = options;

    // Build input text with brand context
    const brandContext = this.buildBrandContext({
      brandName,
      industry,
      brandGuidelines,
      brandColors,
    });

    const inputText = `${brandContext}

# ${title}

${content}

${additionalNotes ? `\n## Additional Notes\n${additionalNotes}` : ''}`;

    // Build additional instructions
    const instructions = this.buildInstructions({
      brandName,
      industry,
      type: 'campaign',
      logoUrl,
    });

    // Create request with campaign preset
    const request: CreateGammaRequest = {
      ...CAMPAIGN_PRESET,
      textMode: CAMPAIGN_PRESET.textMode || "generate",
      inputText,
      themeId,
      numCards: numSlides || CAMPAIGN_PRESET.numCards,
      additionalInstructions: instructions,
      textOptions: {
        ...CAMPAIGN_PRESET.textOptions,
        tone: tone || CAMPAIGN_PRESET.textOptions?.tone,
        audience: audience || CAMPAIGN_PRESET.textOptions?.audience,
      },
      imageOptions: {
        ...CAMPAIGN_PRESET.imageOptions,
        style: imageStyle || CAMPAIGN_PRESET.imageOptions?.style,
      },
      cardOptions: {
        ...CAMPAIGN_PRESET.cardOptions,
        dimensions: dimensions || CAMPAIGN_PRESET.cardOptions?.dimensions,
        headerFooter: logoUrl
          ? {
              topRight: {
                type: 'image',
                source: 'custom',
                src: logoUrl,
                size: 'md',
              },
              hideFromFirstCard: true,
            }
          : undefined,
      },
    };

    try {
      // Create gamma
      const createResponse = await this.createGamma(request);
      const generationId = createResponse.generationId || createResponse.id!;

      // Poll for completion if requested
      if (shouldPoll) {
        const pollResult = await this.pollForCompletion(generationId);

        return {
          success: pollResult.status === 'completed',
          generationId,
          url: pollResult.url,
          embedUrl: pollResult.embedUrl,
          status: pollResult.status,
          error: pollResult.error,
          data: pollResult.data,
        };
      }

      // Return without polling
      return {
        success: true,
        generationId,
        status: 'processing',
      };
    } catch (error) {
      if (error instanceof GammaError) {
        return {
          success: false,
          generationId: '',
          status: 'failed',
          error: error.message,
        };
      }

      return {
        success: false,
        generationId: '',
        status: 'failed',
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Create a campaign deck with multiple ideas
   *
   * Combines multiple campaign ideas into a comprehensive presentation
   *
   * @param options - Campaign deck options
   * @returns Result with generation ID and URL (if polling completes)
   */
  async createCampaignDeck(
    options: CreateCampaignDeckOptions,
    shouldPoll: boolean = true
  ): Promise<GammaResult> {
    const {
      campaignTitle,
      ideas,
      brandName,
      industry,
      brandGuidelines,
      brandColors,
      logoUrl,
      additionalNotes,
      numSlides,
      tone,
      audience,
      imageStyle,
    } = options;

    // Build input text with all ideas
    const brandContext = this.buildBrandContext({
      brandName,
      industry,
      brandGuidelines,
      brandColors,
    });

    const ideasContent = ideas
      .map(
        (idea, index) => `
## Idea ${index + 1}: ${idea.title}

${idea.content}
`
      )
      .join('\n');

    const inputText = `${brandContext}

# ${campaignTitle}

${ideasContent}

${additionalNotes ? `\n## Additional Notes\n${additionalNotes}` : ''}`;

    // Build additional instructions
    const instructions = this.buildInstructions({
      brandName,
      industry,
      type: 'deck',
      logoUrl,
      ideaCount: ideas.length,
    });

    // Create request with campaign deck preset
    const request: CreateGammaRequest = {
      ...CAMPAIGN_DECK_PRESET,
      textMode: CAMPAIGN_DECK_PRESET.textMode || "generate",
      inputText,
      numCards: numSlides || CAMPAIGN_DECK_PRESET.numCards,
      additionalInstructions: instructions,
      textOptions: {
        ...CAMPAIGN_DECK_PRESET.textOptions,
        tone: tone || CAMPAIGN_DECK_PRESET.textOptions?.tone,
        audience: audience || CAMPAIGN_DECK_PRESET.textOptions?.audience,
      },
      imageOptions: {
        ...CAMPAIGN_DECK_PRESET.imageOptions,
        style: imageStyle || CAMPAIGN_DECK_PRESET.imageOptions?.style,
      },
      cardOptions: {
        ...CAMPAIGN_DECK_PRESET.cardOptions,
        headerFooter: logoUrl
          ? {
              topRight: {
                type: 'image',
                source: 'custom',
                src: logoUrl,
                size: 'md',
              },
              bottomRight: {
                type: 'cardNumber',
              },
              hideFromFirstCard: true,
            }
          : undefined,
      },
    };

    try {
      const createResponse = await this.createGamma(request);
      const generationId = createResponse.generationId || createResponse.id!;

      if (shouldPoll) {
        const pollResult = await this.pollForCompletion(generationId);

        return {
          success: pollResult.status === 'completed',
          generationId,
          url: pollResult.url,
          embedUrl: pollResult.embedUrl,
          status: pollResult.status,
          error: pollResult.error,
          data: pollResult.data,
        };
      }

      return {
        success: true,
        generationId,
        status: 'processing',
      };
    } catch (error) {
      if (error instanceof GammaError) {
        return {
          success: false,
          generationId: '',
          status: 'failed',
          error: error.message,
        };
      }

      return {
        success: false,
        generationId: '',
        status: 'failed',
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
      };
    }
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Build brand context string
   */
  private buildBrandContext(params: {
    brandName?: string;
    industry?: string;
    brandGuidelines?: string;
    brandColors?: { primary?: string; secondary?: string; accent?: string };
  }): string {
    const { brandName, industry, brandGuidelines, brandColors } = params;

    let context = '';

    if (brandName) {
      context += `**Brand:** ${brandName}\n`;
    }

    if (industry) {
      context += `**Industry:** ${industry}\n`;
    }

    if (brandColors?.primary) {
      context += `**Brand Colors:** Primary: ${brandColors.primary}`;
      if (brandColors.secondary) {
        context += `, Secondary: ${brandColors.secondary}`;
      }
      if (brandColors.accent) {
        context += `, Accent: ${brandColors.accent}`;
      }
      context += '\n';
    }

    if (brandGuidelines) {
      context += `**Brand Guidelines:** ${brandGuidelines}\n`;
    }

    return context ? `${context}\n---\n` : '';
  }

  /**
   * Build additional instructions based on context
   */
  private buildInstructions(params: {
    brandName?: string;
    industry?: string;
    type: 'campaign' | 'deck';
    logoUrl?: string;
    ideaCount?: number;
  }): string {
    const { brandName, industry, type, logoUrl, ideaCount } = params;

    let instructions = '';

    // Base instructions
    if (type === 'campaign') {
      instructions =
        'Create a professional marketing campaign presentation. Include: ' +
        '1) Engaging title slide, 2) Campaign overview, 3) Target audience insights, ' +
        '4) Key messaging and creative concept, 5) Execution strategy across platforms, ' +
        '6) Media mix and touchpoints, 7) Timeline and milestones, 8) Success metrics and KPIs. ' +
        'Use professional marketing terminology and make it client-ready.';
    } else {
      instructions =
        `Create a comprehensive campaign deck featuring ${ideaCount || 'multiple'} distinct campaign ideas. ` +
        'Structure: 1) Executive summary with campaign overview, 2) Individual sections for each campaign idea ' +
        'with concept, execution, and expected impact, 3) Comparative analysis highlighting unique strengths, ' +
        '4) Recommended approach with rationale, 5) Next steps and call to action. ' +
        'Maintain professional tone throughout and ensure each idea is clearly differentiated.';
    }

    // Add brand-specific instructions
    if (brandName) {
      instructions += ` All content must align with ${brandName}'s brand identity and positioning.`;
    }

    // Add industry-specific guidance
    if (industry && industry.toLowerCase() in INDUSTRY_INSTRUCTIONS) {
      const industryKey = industry.toLowerCase() as keyof typeof INDUSTRY_INSTRUCTIONS;
      instructions += ` Industry context: ${INDUSTRY_INSTRUCTIONS[industryKey]}`;
    }

    // Add media asset instructions for known vendors
    const vendorKey = brandName?.toLowerCase().replace(/\s+/g, '_') as keyof typeof MEDIA_ASSET_INSTRUCTIONS;
    if (vendorKey && vendorKey in MEDIA_ASSET_INSTRUCTIONS) {
      instructions += ` Media assets: ${MEDIA_ASSET_INSTRUCTIONS[vendorKey]}`;
    }

    // Logo instructions
    if (logoUrl) {
      instructions += ' Include brand logo in header (top-right) on all slides except the title slide.';
    }

    return instructions;
  }

  /**
   * Handle API error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: GammaErrorResponse | undefined;

    try {
      const text = await response.text();
      errorData = text ? JSON.parse(text) : undefined;
    } catch {
      // Ignore parse errors
    }

    const message = errorData?.message || this.getErrorMessageForStatus(response.status);

    throw new GammaError(message, response.status, errorData);
  }

  /**
   * Get error message for HTTP status code
   */
  private getErrorMessageForStatus(status: number): string {
    switch (status) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 400:
        return ERROR_MESSAGES.INVALID_INPUT;
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT;
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.GENERATION_FAILED;
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let _gamma: GammaService | null = null;

/**
 * Default Gamma service instance (lazy — only constructed when first used)
 */
export const gamma = new Proxy({} as GammaService, {
  get(_target, prop, receiver) {
    if (!_gamma) {
      _gamma = new GammaService();
    }
    const value = Reflect.get(_gamma, prop, receiver);
    return typeof value === "function" ? value.bind(_gamma) : value;
  },
});

/**
 * Create a new Gamma service instance
 *
 * @param apiKey - Optional custom API key
 * @returns New Gamma service instance
 */
export function createGammaService(apiKey?: string): GammaService {
  return new GammaService(apiKey);
}
