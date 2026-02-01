// VideoSystem Type Definitions

// ===== User Types =====
export interface User {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    settings: UserSettings;
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
    | 'archived';

export interface Project {
    id: string;
    userId: string;
    title: string;
    description: string;
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
    estimatedDuration: number; // in minutes
    estimatedCost: number;
    backgroundMusicUrl?: string;
    backgroundMusicVolume?: number; // 0.0 to 1.0 (default 0.2)
    ambianceUrl?: string;
    ambianceVolume?: number; // 0.0 to 1.0 (default 0.1)
    ambianceLabel?: string;
    narrationVolume?: number; // 0.0 to 1.0 (default 1.0)
    globalSfxVolume?: number; // 0.0 to 1.0 (default 0.4)
    subtitlesEnabled?: boolean;
    subtitleStyle?: 'minimal' | 'classic' | 'bold';
    subtitleFont?: string;
    thumbnailUrl?: string;
    seoMetadata?: {
        selectedTitle?: string;
        titles: string[];
        description: string;
        tags: string[];
    };
    voiceProfile?: 'standard' | 'soft' | 'deep' | 'whisper';
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
    _cancelUpload?: boolean; // Internal flag to signal upload cancellation
    createdAt: Date;
    updatedAt: Date;
}

export type VisualStyle = 'cinematic' | 'anime' | 'cyberpunk' | 'oil-painting' | 'national-geographic' | 'studio-ghibli' | 'vaporwave' | 'watercolor' | 'sketch';

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
    outline: string[];
    completionPercentage: number;
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
    status?: 'pending' | 'generating' | 'ready' | 'failed';
    generatedAssetId?: string;
    transitionType?: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration?: number; // in milliseconds
    sfxUrl?: string;
    sfxVolume?: number;
    sfxOffset?: number; // delay in milliseconds from scene start
    sfxLabel?: string;
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
    service: 'vertex-ai' | 'google-tts' | 'cloud-run' | 'render' | 'storage';
    operation: 'script-generation' | 'image-generation' | 'video-generation' | 'speech-synthesis' | 'rendering';
    model: string;
    inputCount: number; // characters or tokens
    outputCount?: number; // characters or tokens
    estimatedCost: number;
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
