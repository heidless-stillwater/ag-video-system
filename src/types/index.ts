// VideoSystem Type Definitions

// ===== User Types =====
export interface User {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    settings: UserSettings;
}

export interface UserSettings {
    defaultMode: 'DEV' | 'STAGING' | 'PRODUCTION';
    notifications: boolean;
    autoSave: boolean;
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
    | 'review'
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
    estimatedDuration: number; // in minutes
    estimatedCost: number;
    createdAt: Date;
    updatedAt: Date;
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
    createdAt: Date;
    updatedAt: Date;
}

export interface ScriptSection {
    id: string;
    title: string;
    content: string;
    order: number;
    wordCount: number;
    estimatedDuration: number; // in seconds
    audioUrl?: string;
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
