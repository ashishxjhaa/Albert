/**
 * Gamma API Type Definitions
 *
 * Complete type definitions for Gamma API v1.0
 * Documentation: https://developers.gamma.app/
 */

// ============================================================================
// Request Types
// ============================================================================

/**
 * How you want your inputText to be modified by Gamma
 */
export type TextMode = 'generate' | 'condense' | 'preserve';

/**
 * The type of artifact you want to create
 */
export type Format = 'presentation' | 'document' | 'webpage' | 'social';

/**
 * How you want your content to be divided up
 */
export type CardSplit = 'auto' | 'inputTextBreaks';

/**
 * Additional file types for saving your gamma
 */
export type ExportFormat = 'pdf' | 'pptx';

/**
 * How much text each card contains
 */
export type TextAmount = 'brief' | 'medium' | 'detailed' | 'extensive';

/**
 * Where you want to source images for your gamma
 */
export type ImageSource =
  | 'aiGenerated'
  | 'pictographic'
  | 'unsplash'
  | 'webAllImages'
  | 'webFreeToUse'
  | 'webFreeToUseCommercially'
  | 'giphy'
  | 'placeholder'
  | 'noImages';

/**
 * AI image generation models supported by Gamma
 * See: https://developers.gamma.app/v1.0/update/reference/image-model-accepted-values
 */
export type ImageModel =
  | 'dall-e-3'
  | 'dall-e-2'
  | 'stable-diffusion'
  | 'midjourney'
  | string; // Allow other models

/**
 * Aspect ratio options based on format
 */
export type Dimensions =
  // Presentation
  | 'fluid'
  | '16x9'
  | '4x3'
  // Document
  | 'pageless'
  | 'letter'
  | 'a4'
  // Social
  | '1x1'
  | '4x5'
  | '9x16';

/**
 * Header/Footer content type
 */
export type HeaderFooterType = 'cardNumber' | 'image' | 'text';

/**
 * Image source for header/footer
 */
export type HeaderFooterImageSource = 'themeLogo' | 'custom';

/**
 * Image size for header/footer
 */
export type HeaderFooterImageSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Workspace access level
 */
export type WorkspaceAccess = 'noAccess' | 'view' | 'comment' | 'edit' | 'fullAccess';

/**
 * External access level
 */
export type ExternalAccess = 'noAccess' | 'view' | 'comment' | 'edit';

/**
 * Email access level
 */
export type EmailAccess = 'view' | 'comment' | 'edit' | 'fullAccess';

/**
 * Header/Footer content configuration
 */
export interface HeaderFooterContent {
  type: HeaderFooterType;
  value?: string; // Required if type = 'text', max 500 chars
  source?: HeaderFooterImageSource; // Required if type = 'image'
  src?: string; // Required if type = 'image' and source = 'custom', max 2048 chars
  size?: HeaderFooterImageSize; // Relevant if type = 'image'
}

/**
 * Header and Footer configuration
 */
export interface HeaderFooter {
  topLeft?: HeaderFooterContent;
  topCenter?: HeaderFooterContent;
  topRight?: HeaderFooterContent;
  bottomLeft?: HeaderFooterContent;
  bottomCenter?: HeaderFooterContent;
  bottomRight?: HeaderFooterContent;
  hideFromFirstCard?: boolean;
  hideFromLastCard?: boolean;
}

/**
 * Text generation options
 */
export interface TextOptions {
  amount?: TextAmount;
  tone?: string; // Max 500 chars
  audience?: string; // Max 500 chars
  language?: string; // Default: 'en', see language accepted values
}

/**
 * Image generation options
 */
export interface ImageOptions {
  source?: ImageSource;
  model?: ImageModel; // Auto-selected if not specified
  style?: string; // Max 500 chars
}

/**
 * Card/Slide options
 */
export interface CardOptions {
  dimensions?: Dimensions;
  headerFooter?: HeaderFooter;
}

/**
 * Email sharing options
 */
export interface EmailOptions {
  recipients?: string[]; // Email addresses
  access?: EmailAccess;
}

/**
 * Sharing configuration
 */
export interface SharingOptions {
  workspaceAccess?: WorkspaceAccess;
  externalAccess?: ExternalAccess;
  emailOptions?: EmailOptions;
}

/**
 * Main request body for creating a gamma
 */
export interface CreateGammaRequest {
  // Required fields
  inputText: string; // 1-100,000 tokens
  textMode: TextMode;

  // Optional fields
  format?: Format; // Default: 'presentation'
  themeId?: string; // Use List Themes API to get values
  numCards?: number; // Pro: 1-60, Ultra: 1-75, default: 10
  cardSplit?: CardSplit; // Default: 'auto'
  additionalInstructions?: string; // Max 2000 chars
  folderIds?: string[]; // Use List Folders API to get values
  exportAs?: ExportFormat;

  // Advanced options
  textOptions?: TextOptions;
  imageOptions?: ImageOptions;
  cardOptions?: CardOptions;
  sharingOptions?: SharingOptions;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Generation status
 */
export type GenerationStatus =
  | 'pending'
  | 'processing'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'error';

/**
 * Response from creating a gamma (POST /v1.0/generations)
 */
export interface CreateGammaResponse {
  generationId: string;
  id?: string; // Sometimes returned instead of generationId
}

/**
 * Response from checking gamma status (GET /v1.0/generations/{id})
 */
export interface GammaStatusResponse {
  generationId?: string;
  id?: string;
  status: GenerationStatus;
  url?: string; // View URL - Available when completed
  gammaUrl?: string; // Gamma's actual URL field (most common)
  webUrl?: string; // Alternative view URL
  embedUrl?: string; // Embed URL for iframes
  docId?: string; // Actual document ID (different from generation ID)
  error?: string; // Available when failed
  progress?: number; // 0-100
  createdAt?: string;
  completedAt?: string;
  credits?: {
    deducted?: number;
    remaining?: number;
  };
  [key: string]: any; // Allow additional fields
}

/**
 * Error response from Gamma API
 */
export interface GammaErrorResponse {
  message: string;
  statusCode: number;
  errors?: string[];
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Polling configuration
 */
export interface PollingConfig {
  maxAttempts?: number; // Default: 24 (2 minutes with 5s interval)
  interval?: number; // Milliseconds between polls, default: 5000
  timeout?: number; // Total timeout in ms, default: 120000 (2 minutes)
}

/**
 * Polling result
 */
export interface PollingResult {
  status: GenerationStatus;
  url?: string;
  embedUrl?: string;
  error?: string;
  data: GammaStatusResponse;
  attempts: number;
  duration: number; // Time taken in ms
}

/**
 * Simplified presentation creation options
 */
export interface CreatePresentationOptions {
  title: string;
  content: string;
  brandName?: string;
  industry?: string;
  brandGuidelines?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  logoUrl?: string;
  additionalNotes?: string;

  // Advanced options (optional)
  numSlides?: number;
  tone?: string;
  audience?: string;
  imageStyle?: string;
  themeId?: string;
  dimensions?: Dimensions;
}

/**
 * Campaign deck creation options (multiple ideas)
 */
export interface CreateCampaignDeckOptions {
  campaignTitle: string;
  ideas: Array<{
    title: string;
    content: string;
  }>;
  brandName?: string;
  industry?: string;
  brandGuidelines?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  logoUrl?: string;
  additionalNotes?: string;

  // Advanced options
  numSlides?: number;
  tone?: string;
  audience?: string;
  imageStyle?: string;
}

/**
 * Gamma service result
 */
export interface GammaResult {
  success: boolean;
  generationId: string;
  url?: string;
  embedUrl?: string;
  status: GenerationStatus;
  error?: string;
  data?: GammaStatusResponse;
}
