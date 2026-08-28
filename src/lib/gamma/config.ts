/**
 * Gamma API Configuration
 *
 * Centralized configuration for Gamma API integration
 */

import { CreateGammaRequest, PollingConfig, Dimensions } from './types';

// ============================================================================
// API Configuration
// ============================================================================

/**
 * Gamma API base URL
 */
export const GAMMA_API_BASE_URL = 'https://public-api.gamma.app';

/**
 * Gamma API version
 */
export const GAMMA_API_VERSION = 'v1.0';

/**
 * Gamma API endpoints
 */
export const GAMMA_ENDPOINTS = {
  GENERATIONS: `${GAMMA_API_BASE_URL}/${GAMMA_API_VERSION}/generations`,
  THEMES: `${GAMMA_API_BASE_URL}/${GAMMA_API_VERSION}/themes`,
  FOLDERS: `${GAMMA_API_BASE_URL}/${GAMMA_API_VERSION}/folders`,
} as const;

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default polling configuration
 */
export const DEFAULT_POLLING_CONFIG: Required<PollingConfig> = {
  maxAttempts: 24, // 2 minutes with 5s interval
  interval: 5000, // 5 seconds between polls
  timeout: 120000, // 2 minutes total timeout
};

/**
 * Default number of slides for presentations
 */
export const DEFAULT_NUM_SLIDES = {
  singleIdea: 8, // For individual campaign idea
  campaign: 12, // For full campaign deck
  pitch: 15, // For detailed pitch deck
} as const;

/**
 * Default dimensions by format
 */
export const DEFAULT_DIMENSIONS: Record<string, Dimensions> = {
  presentation: '16x9',
  document: 'letter',
  social: '4x5',
  webpage: 'fluid',
} as const;

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Campaign presentation preset
 * Optimized for marketing campaign pitches
 */
export const CAMPAIGN_PRESET: Partial<CreateGammaRequest> = {
  format: 'presentation',
  textMode: 'generate',
  numCards: DEFAULT_NUM_SLIDES.singleIdea,
  cardSplit: 'auto',
  textOptions: {
    amount: 'detailed',
    tone: 'professional and persuasive',
    audience: 'marketing executives and brand clients',
    language: 'en',
  },
  imageOptions: {
    source: 'aiGenerated',
    model: 'dall-e-3',
    style: 'professional and modern corporate aesthetic',
  },
  cardOptions: {
    dimensions: '16x9',
  },
  sharingOptions: {
    workspaceAccess: 'view',
    externalAccess: 'view',
  },
};

/**
 * Full campaign deck preset
 * For comprehensive multi-idea campaign presentations
 */
export const CAMPAIGN_DECK_PRESET: Partial<CreateGammaRequest> = {
  format: 'presentation',
  textMode: 'generate',
  numCards: DEFAULT_NUM_SLIDES.campaign,
  cardSplit: 'auto',
  textOptions: {
    amount: 'medium',
    tone: 'professional and engaging',
    audience: 'marketing executives, brand managers, and decision makers',
    language: 'en',
  },
  imageOptions: {
    source: 'aiGenerated',
    model: 'dall-e-3',
    style: 'clean, professional marketing visuals with bold colors',
  },
  cardOptions: {
    dimensions: '16x9',
  },
  sharingOptions: {
    workspaceAccess: 'edit',
    externalAccess: 'view',
  },
};

/**
 * Pitch deck preset
 * For investor or executive presentations
 */
export const PITCH_DECK_PRESET: Partial<CreateGammaRequest> = {
  format: 'presentation',
  textMode: 'generate',
  numCards: DEFAULT_NUM_SLIDES.pitch,
  cardSplit: 'auto',
  textOptions: {
    amount: 'extensive',
    tone: 'professional, confident, and data-driven',
    audience: 'executives, investors, and senior stakeholders',
    language: 'en',
  },
  imageOptions: {
    source: 'aiGenerated',
    model: 'dall-e-3',
    style: 'sophisticated business graphics with charts and data visualization',
  },
  cardOptions: {
    dimensions: '16x9',
  },
  sharingOptions: {
    workspaceAccess: 'edit',
    externalAccess: 'noAccess',
  },
};

/**
 * Social media preset
 * For social media content decks
 */
export const SOCIAL_MEDIA_PRESET: Partial<CreateGammaRequest> = {
  format: 'social',
  textMode: 'condense',
  numCards: 6,
  cardSplit: 'auto',
  textOptions: {
    amount: 'brief',
    tone: 'engaging and conversational',
    audience: 'social media users and digital audiences',
    language: 'en',
  },
  imageOptions: {
    source: 'aiGenerated',
    model: 'dall-e-3',
    style: 'vibrant, eye-catching social media graphics',
  },
  cardOptions: {
    dimensions: '4x5',
  },
  sharingOptions: {
    workspaceAccess: 'view',
    externalAccess: 'view',
  },
};

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Input text token limits
 */
export const TOKEN_LIMITS = {
  min: 1,
  max: 100000,
} as const;

/**
 * Number of cards limits (Pro tier)
 */
export const CARD_LIMITS_PRO = {
  min: 1,
  max: 60,
} as const;

/**
 * Number of cards limits (Ultra tier)
 */
export const CARD_LIMITS_ULTRA = {
  min: 1,
  max: 75,
} as const;

/**
 * Character limits
 */
export const CHAR_LIMITS = {
  additionalInstructions: 2000,
  tone: 500,
  audience: 500,
  imageStyle: 500,
  headerFooterText: 500,
  headerFooterImageSrc: 2048,
} as const;

// ============================================================================
// Campaign-Specific Templates
// ============================================================================

/**
 * Additional instructions templates for different industries
 */
export const INDUSTRY_INSTRUCTIONS = {
  fmcg: 'Focus on consumer appeal, product benefits, and emotional connections. Include lifestyle imagery and relatable scenarios.',
  auto: 'Emphasize innovation, performance metrics, and aspirational lifestyle. Use sleek, modern visuals.',
  bfsi: 'Highlight trust, security, and financial benefits. Use professional, confident tone with data-driven insights.',
  tech: 'Showcase innovation, future-forward thinking, and problem-solving. Use modern, tech-savvy visuals.',
  entertainment: 'Create excitement and anticipation. Use vibrant, engaging visuals with emotional appeal.',
  healthcare: 'Focus on trust, care, and results. Use clean, professional visuals with human touch.',
  education: 'Emphasize growth, learning, and achievement. Use inspiring, motivational visuals.',
  retail: 'Highlight value, variety, and shopping experience. Use attractive product showcases.',
} as const;

/**
 * Media asset templates for different media companies
 */
export const MEDIA_ASSET_INSTRUCTIONS = {
  zee5: 'Leverage Zee5\'s premium content library including web series, reality shows, news segments, and live TV. Emphasize cross-platform reach and engaged audiences.',
  sony_liv: 'Showcase Sony Liv\'s premium sports content, original series, and live events. Highlight premium audience demographics and high engagement.',
  star_india: 'Feature Star India\'s diverse content portfolio across Star Plus, Star Sports, and digital platforms. Emphasize massive reach and cultural relevance.',
  dainik_bhaskar: 'Leverage print and digital news platform authority. Emphasize trusted journalism and regional influence.',
  generic: 'Highlight your media platform\'s unique strengths, audience reach, and engagement capabilities.',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NO_API_KEY: 'Gamma API key is not configured. Please set GAMMA_API_KEY environment variable.',
  INVALID_INPUT: 'Invalid input parameters. Please check your request.',
  GENERATION_FAILED: 'Failed to generate presentation. Please try again.',
  POLLING_TIMEOUT: 'Presentation generation is taking longer than expected. Please check back later.',
  NETWORK_ERROR: 'Network error while communicating with Gamma API.',
  UNAUTHORIZED: 'Unauthorized. Please check your Gamma API key.',
  RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;
