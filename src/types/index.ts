// VideoSystem Type Definitions

// ===== Role & Plan Types =====
export type UserRole = 'su' | 'admin' | 'user';

export type UserPlan = 'guest' | 'trial' | 'standard' | 'premium' | 'custom';

// Default plan nickname mapping (can be overridden via Firestore)
export const DEFAULT_PLAN_NICKNAMES: Record<UserPlan, string> = {
    guest: 'novice',
    trial: 'aspirant',
    standard: 'hobbyist',
    premium: 'semi-pro',
    custom: 'professional',
};
export interface ProjectEstimate {
    actionTotal: number;
    durationTotal: number;
    multiplier: number;
    plan: UserPlan;
}

// ===== Billing & Transaction Types =====

export interface CreditTransaction {
    id: string;
    userId: string;
    type: 'deduction' | 'purchase' | 'grant' | 'refund' | 'admin-topup' | 'plan-bonus';
    amount: number;           // Always positive; sign inferred from type
    balanceAfter: number;     // Snapshot of balance post-transaction
    action?: string;          // e.g. 'script-generation', 'media-synthesis', 'render', 'plan-upgrade'
    projectId?: string;
    metadata?: Record<string, any>;  // quality tier, Stripe session ID, admin userId, etc.
    createdAt: Date;
}

export interface PlanChangeRecord {
    id: string;
    userId: string;
    previousPlan: UserPlan;
    newPlan: UserPlan;
    changeType: 'upgrade' | 'downgrade' | 'admin-override' | 'trial-start' | 'trial-expire' | 'cancellation';
    stripeSubscriptionId?: string;
    previousPriceUsd?: number;
    newPriceUsd?: number;
    proratedAmount?: number;     // Credit/charge from mid-cycle change
    initiatedBy: string;         // userId of who made the change (self or admin)
    effectiveAt: Date;
    createdAt: Date;
}

export interface PlanFeatureSet {
    maxProjects: number;         // -1 = unlimited
    maxRendersPerMonth: number;  // -1 = unlimited
    voiceCloning: boolean;
    commercialRights: boolean;
    priorityRendering: boolean;
    watermarkFree: boolean;
    stagingMode: boolean;
    apiAccess: boolean;
}

export interface PlanLimits {
    maxStorageGb: number;
    maxVideoDurationMinutes: number;
    concurrentRenders: number;
}

export interface PlanDefinition {
    id: UserPlan;                // 'guest' | 'trial' | 'standard' | 'premium' | 'custom'
    displayName: string;         // e.g. 'Hobbyist', 'Semi-Pro'
    priceUsd: number;            // Monthly price (0 for guest/trial)
    stripePriceId?: string;      // Stripe recurring price ID
    creditMultiplier: number;    // Discount multiplier (1.0 = no discount)
    bonusCreditsOnPurchase: number;  // One-time bonus credits when subscribing
    features: PlanFeatureSet;
    limits: PlanLimits;
    isPublic: boolean;           // Whether shown on pricing page (custom = false)
}

export interface PricingConfig {
    actionModel: {
        scriptGeneration: number;
        mediaSynthesis: number;
        ttsSection: number;
        render: number;
    };
    creditPacks: Array<{
        id: string;
        credits: number;
        priceUsd: number;
        stripePriceId: string;
    }>;
    plans: PlanDefinition[];
}

// Plan nickname interface for CRUD operations
export interface PlanNickname {
    id: string; // Same as plan type (guest, trial, etc.)
    plan: UserPlan;
    nickname: string;
    isDefault: boolean;
    updatedAt: Date;
}

// ===== User Types =====
export interface User {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
    createdAt: Date;
    settings: UserSettings;
    // Role & Plan fields
    roles: UserRole[];
    plan: UserPlan;
    planNickname?: string | null; // Custom override, defaults to DEFAULT_PLAN_NICKNAMES[plan]
    // Billing & Credits
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripeDefaultPaymentMethod?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing' | 'none';
    creditBalance: number;
    // Plan lifecycle
    planStartedAt?: Date;
    planExpiresAt?: Date;
    previousPlan?: UserPlan;
    // Auto-refill
    autoRefill?: {
        enabled: boolean;
        threshold: number;      // Trigger when balance falls below this
        packSize: number;       // Credits to purchase
        stripePriceId: string;  // Stripe price for auto-refill
    };
    youtubeTokens?: {
        accessToken: string;
        refreshToken: string;
        expiryDate: number;
    };
    youtubeChannelInfo?: {
        id: string;
        title: string;
        thumbnailUrl: string;
    };
}

export interface UserSettings {
    defaultMode: 'DEV' | 'STAGING' | 'PRODUCTION';
    notifications: boolean;
    autoSave: boolean;
    youtubeConnected: boolean;
}

// ===== Topic & SEO Types =====
export interface Topic {
    id: string;
    userId: string;
    title: string;
    description: string;
    broadCategory: string;
    keywords: string[];
    seoScore: number;
    competitionLevel: 'low' | 'medium' | 'high';
    searchVolume: number;
    trendData?: TrendData;
    createdAt: Date;
    updatedAt: Date;
}

export interface TrendData {
    currentInterest: number; // 0-100
    averageInterest: number;
    peakInterest: number;
    isRising: boolean;
    relatedQueries: string[];
}

export interface TopicSuggestion {
    title: string;
    description: string;
    seoScore: number;
    reasoning: string;
    keywords: string[];
    estimatedViews: string;
}

// ===== Project Types =====
export type ProjectStatus =
    | 'draft'
    | 'researching'
    | 'scripting'
    | 'generating_media'
    | 'assembling'
    | 'rendering'
    | 'ready'
    | 'review'
    | 'publishing'
    | 'published'
    | 'archived'
    | 'failed';

export interface Project {
    id: string;
    userId: string;
    title: string;
    description: string;
    broadCategory?: string;
    topicId: string;
    status: ProjectStatus;
    research: ResearchData;
    currentScriptId?: string;
    videoId?: string;
    youtubeId?: string;
    youtubeUrl?: string;
    downloadUrl?: string;
    renderProgress?: number; // 0-100
    renderMessage?: string; // e.g., "Rendering Scene 5/15..."
    mediaProgress?: number; // 0-100
    mediaMessage?: string; // e.g., "Synthesizing scene 3/10..."
    publishProgress?: number; // 0-100
    publishMessage?: string; // e.g., "Uploading to YouTube (45%)..."
    estimatedDuration?: number; // in minutes
    estimatedCredits?: number;
    creditsDeducted: number;
    backgroundMusicUrl?: string;
    backgroundMusicVolume?: number; // 0.0 to 1.0 (default 0.2)
    ambianceUrl?: string;
    ambianceVolume?: number; // 0.0 to 1.0 (default 0.1)
    ambianceLabel?: string;
    narrationVolume?: number; // 0.0 to 1.0 (default 1.0)
    globalSfxVolume?: number; // 0.0 to 1.0 (default 0.4)
    videoVolume?: number; // 0.0 to 1.0 (default 0.8)
    subtitlesEnabled?: boolean;
    subtitleStyle?: 'minimal' | 'classic' | 'bold';
    subtitleFont?: string;
    targetDuration?: number; // target script duration in minutes
    targetPacing?: number; // target words per minute
    thumbnailUrl?: string;
    seoMetadata?: {
        selectedTitle?: string;
        titles: string[];
        description: string;
        tags: string[];
    };
    voiceProfile?: 'standard' | 'soft' | 'deep' | 'whisper';
    ttsEngine?: 'google-cloud' | 'eleven-labs' | 'openai' | 'murf';
    audioSettings?: {
        autoDucking: boolean;
        masterVolume: number;
    };
    savedRenders?: SavedRender[];
    translations?: { language: string; scriptId: string }[];
    activeDubbingSessionId?: string;
    cancelledDubbingSessionId?: string;
    visualStyle?: VisualStyle;
    visualSnapshots?: VisualSnapshot[];
    shorts?: ViralClip[];
    performanceProfile?: {
        mode: 'standard' | 'turbo';
        concurrency: number; // 1-10
        imageSynthesisDelay: number; // ms
        parallelSynthesis: boolean;
    };
    aspectRatio?: '16:9' | '9:16' | '1:1';
    palette?: string;
    motionIntensity?: 'static' | 'subtle' | 'dynamic' | 'cinematic';
    atmosphericCues?: string;
    synthesisEngine?: 'nanobanana-2' | 'nanobanana-pro' | 'stock-api' | 'manual-upload';
    imagesPerSection?: number;
    optimizationStrategy?: 'thematic' | 'even';
    _cancelUpload?: boolean; // Internal flag to signal upload cancellation
    createdAt: Date;
    updatedAt: Date;
}

export type VisualStyle = 'cinematic' | 'anime' | 'cyberpunk' | 'oil-painting' | 'national-geographic' | 'studio-ghibli' | 'vaporwave' | 'watercolor' | 'sketch' | 'noir' | 'minimalist' | 'dreamy' | 'techno';

export interface VisualSnapshot {
    id: string;
    timestamp: Date;
    label: string;
    style: VisualStyle;
    cues: Record<string, string>; // Map of cueId to imageUrl
}

export interface SavedRender {
    id: string;
    url: string;
    timestamp: Date;
    label: string;
}

export interface ResearchData {
    sources: ResearchSource[];
    facts: Fact[];
    quotes?: Quote[];
    outline: string[];
    persona?: string;
    completionPercentage: number;
    logs?: string[];
    lastError?: string;
}

export interface ResearchSource {
    id: string;
    url: string;
    title: string;
    type: 'wikipedia' | 'article' | 'academic' | 'video' | 'book';
    credibilityScore: number; // 0-100
    extractedContent: string;
    citations: string[];
}

export interface Fact {
    id: string;
    statement: string;
    sourceIds: string[];
    confidence: number; // 0-100
    verified: boolean;
}

export interface Quote {
    author: string;
    text: string;
}

// ===== Script Types =====
export interface Script {
    id: string;
    projectId: string;
    version: number;
    title: string;
    sections: ScriptSection[];
    totalWordCount: number;
    estimatedDuration: number; // in minutes
    sleepFriendlinessScore: number; // 0-100
    languageCode?: string; // e.g., 'en-US', 'es-ES', 'fr-FR'
    voiceProfile?: 'standard' | 'soft' | 'deep' | 'whisper';
    isTranslation?: boolean;
    sourceScriptId?: string; // Original script ID if this is a translation
    createdAt: Date;
    updatedAt: Date;
    thumbnailUrl?: string;
}

export interface ScriptSection {
    id: string;
    title: string;
    content: string;
    order: number;
    wordCount: number;
    estimatedDuration: number; // in seconds
    audioUrl?: string | null;
    audioStatus?: 'pending' | 'generating' | 'ready' | 'failed';
    notes?: string;
    visualCues?: VisualCue[];
}

export interface VisualCue {
    id: string;
    timestamp: number; // in seconds from section start
    type: 'image' | 'video' | 'transition';
    description: string;
    url?: string;
    videoUrl?: string | null; // High-fidelity video URL for render
    sourceDuration?: number | null; // Total duration of the source video clip
    status?: 'pending' | 'generating' | 'ready' | 'failed';
    generatedAssetId?: string;
    transitionType?: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration?: number; // in milliseconds
    fadeOutDuration?: number;   // Crossfade out: duration in milliseconds
    sfxUrl?: string;
    sfxVolume?: number;
    sfxOffset?: number; // delay in milliseconds from scene start
    sfxLabel?: string;
    // --- NLE Timeline Fields ---
    inPoint?: number;           // Trim: start offset within source media (seconds)
    outPoint?: number;          // Trim: end offset within source media (seconds)
    overrideDuration?: number;  // Manual duration override (seconds); takes precedence over calculated gap
    trackId?: 'video' | 'broll' | 'audio'; // Which track this cue belongs to
    volume?: number;            // Volume level (0.0 to 1.0)
}

// ===== Media Asset Types =====
export type MediaAssetType = 'image' | 'video' | 'audio' | 'music';
export type MediaAssetStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface MediaAsset {
    id: string;
    projectId: string;
    type: MediaAssetType;
    status: MediaAssetStatus;
    url?: string;
    storagePath?: string;
    prompt?: string;
    duration?: number; // for audio/video, in seconds
    metadata: Record<string, unknown>;
    createdAt: Date;
}

// ===== Media Library Types =====
export type MediaSource = 'video-system' | 'prompt-tool' | 'manual-upload';

export interface MediaLibraryEntry {
    id: string;
    userId: string;
    type: MediaAssetType;
    source: MediaSource;
    url: string;
    thumbnailUrl?: string;
    prompt?: string;
    projectId?: string; // Optional: link to original project
    sectionId?: string; // Optional: link to original section
    metadata: {
        width?: number;
        height?: number;
        aspectRatio?: string;
        style?: string;
        engine?: string;
        [key: string]: any;
    };
    tags: string[];
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ===== Video Types =====
export type VideoStatus =
    | 'draft'
    | 'assembling'
    | 'processing'
    | 'ready'
    | 'uploading'
    | 'published'
    | 'failed';

export interface Video {
    id: string;
    projectId: string;
    status: VideoStatus;
    storagePath?: string;
    downloadUrl?: string;
    youtubeId?: string;
    youtubeUrl?: string;
    duration: number; // in seconds
    resolution: '720p' | '1080p' | '4k';
    fileSize?: number; // in bytes
    metadata: VideoMetadata;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface VideoMetadata {
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl?: string;
    category: string;
    visibility: 'public' | 'unlisted' | 'private';
    scheduledPublishTime?: Date;
}

// ===== Analytics Types =====
export interface UsageLog {
    id?: string;
    service: 'vertex-ai' | 'google-tts' | 'cloud-run' | 'render' | 'storage' | 'eleven-labs-placeholder' | 'openai-placeholder' | 'murf-placeholder';
    operation: 'script-generation' | 'image-generation' | 'video-generation' | 'speech-synthesis' | 'rendering';
    model: string;
    inputCount: number; // characters or tokens
    outputCount?: number; // characters or tokens
    creditsDeducted: number;
    executionTimeMs: number;
    projectId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
    environment: 'DEV' | 'STAGING' | 'PRODUCTION';
}

export interface VideoAnalytics {
    videoId: string;
    youtubeId: string;
    views: number;
    watchTimeMinutes: number;
    averageViewDuration: number;
    averageViewPercentage: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
    subscribersGained: number;
    impressions: number;
    clickThroughRate: number;
    lastUpdated: Date;
}

// ===== Sleep Content Guidelines =====
export interface SleepContentGuidelines {
    pacing: {
        wordsPerMinute: number; // Target: 120-140
        pauseBetweenSections: number; // in seconds
    };
    voice: {
        pitch: 'low' | 'medium';
        speakingRate: number; // 0.8-1.0
        volumeConsistency: boolean;
    };
    visuals: {
        transitionSpeed: 'slow' | 'medium';
        colorPalette: 'muted' | 'warm' | 'cool';
        avoidFlashing: boolean;
    };
    music: {
        bpmRange: [number, number]; // [60, 80]
        genre: 'ambient' | 'classical' | 'nature';
        volumeLevel: number; // 0.1-0.3 relative to voice
    };
}

export const DEFAULT_SLEEP_GUIDELINES: SleepContentGuidelines = {
    pacing: {
        wordsPerMinute: 130,
        pauseBetweenSections: 3,
    },
    voice: {
        pitch: 'low',
        speakingRate: 0.85,
        volumeConsistency: true,
    },
    visuals: {
        transitionSpeed: 'slow',
        colorPalette: 'muted',
        avoidFlashing: true,
    },
    music: {
        bpmRange: [60, 80],
        genre: 'ambient',
        volumeLevel: 0.2,
    },
};

// ===== Social Growth Engine (Shorts) Types =====
export interface ViralCandidate {
    title: string;
    description: string;
    startSceneIndex: number;
    endSceneIndex: number;
    estimatedDuration: number;
    viralScore: number; // 0-100
    reasoning: string;
    hookType: 'fact' | 'question' | 'mystery' | 'cinematic';
}

export interface ViralClip extends ViralCandidate {
    id: string;
    projectId: string;
    status: 'pending' | 'rendering' | 'ready' | 'failed';
    downloadUrl?: string;
    renderProgress?: number;
    createdAt: Date;
}
