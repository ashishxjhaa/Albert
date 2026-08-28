/**
 * Gamma API Integration
 *
 * Production-ready Gamma API service for creating professional presentations
 *
 * @example
 * ```typescript
 * import { gamma, GammaService } from '@/lib/gamma';
 *
 * // Use singleton instance
 * const result = await gamma.createPresentation({
 *   title: "My Campaign",
 *   content: "Campaign details...",
 *   brandName: "Sony Liv"
 * });
 *
 * // Or create custom instance
 * const customGamma = new GammaService(myApiKey);
 * ```
 */

// Service
export { GammaService, GammaError, gamma, createGammaService } from './gamma-service';

// Types
export type {
  // Request types
  TextMode,
  Format,
  CardSplit,
  ExportFormat,
  TextAmount,
  ImageSource,
  ImageModel,
  Dimensions,
  HeaderFooterType,
  HeaderFooterImageSource,
  HeaderFooterImageSize,
  WorkspaceAccess,
  ExternalAccess,
  EmailAccess,
  HeaderFooterContent,
  HeaderFooter,
  TextOptions,
  ImageOptions,
  CardOptions,
  EmailOptions,
  SharingOptions,
  CreateGammaRequest,
  // Response types
  GenerationStatus,
  CreateGammaResponse,
  GammaStatusResponse,
  GammaErrorResponse,
  // Service types
  PollingConfig,
  PollingResult,
  GammaResult,
  CreatePresentationOptions,
  CreateCampaignDeckOptions,
} from './types';

// Configuration
export {
  GAMMA_API_BASE_URL,
  GAMMA_API_VERSION,
  GAMMA_ENDPOINTS,
  DEFAULT_POLLING_CONFIG,
  DEFAULT_NUM_SLIDES,
  DEFAULT_DIMENSIONS,
  CAMPAIGN_PRESET,
  CAMPAIGN_DECK_PRESET,
  PITCH_DECK_PRESET,
  SOCIAL_MEDIA_PRESET,
  TOKEN_LIMITS,
  CARD_LIMITS_PRO,
  CARD_LIMITS_ULTRA,
  CHAR_LIMITS,
  INDUSTRY_INSTRUCTIONS,
  MEDIA_ASSET_INSTRUCTIONS,
  ERROR_MESSAGES,
} from './config';

// Utils
export {
  isGenerationComplete,
  isGenerationSuccessful,
  isGenerationFailed,
  isGenerationProcessing,
  validateInputText,
  formatBrandColors,
  extractGenerationId,
  buildGammaUrl,
  buildGammaEmbedUrl,
  extractDocIdFromUrl,
  extractGammaUrls,
  estimateGenerationTime,
  sanitizeInputText,
  buildSlideStructureHint,
  calculatePollingInterval,
  getStatusMessage,
  parseGammaError,
  retryWithBackoff,
  isValidImageUrl,
  formatDuration,
} from './utils';
