// Environment configuration for VideoSystem
// Supports DEV, STAGING, and PRODUCTION modes for cost optimization

export type EnvironmentMode = 'DEV' | 'STAGING' | 'PRODUCTION';

export interface EnvironmentConfig {
    mode: EnvironmentMode;
    firebase: {
        useEmulators: boolean;
    };
    ai: {
        model: 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'mock';
        maxTokens: number;
    };
    tts: {
        voiceType: 'browser' | 'standard' | 'wavenet';
        speakingRate: number; // 0.8-1.0 for sleep content
    };
    video: {
        enabled: boolean;
        maxDurationMinutes: number;
        resolution: '720p' | '1080p' | '4k';
    };
    storage: {
        useLocalStorage: boolean;
    };
}

const configs: Record<EnvironmentMode, EnvironmentConfig> = {
    DEV: {
        mode: 'DEV',
        firebase: { useEmulators: false },
        ai: { model: 'mock', maxTokens: 1000 },
        tts: { voiceType: 'browser', speakingRate: 0.85 },
        video: { enabled: false, maxDurationMinutes: 5, resolution: '720p' },
        storage: { useLocalStorage: true },
    },
    STAGING: {
        mode: 'STAGING',
        firebase: { useEmulators: false },
        ai: { model: 'gemini-1.5-flash', maxTokens: 8000 },
        tts: { voiceType: 'standard', speakingRate: 0.85 },
        video: { enabled: true, maxDurationMinutes: 5, resolution: '720p' },
        storage: { useLocalStorage: false },
    },
    PRODUCTION: {
        mode: 'PRODUCTION',
        firebase: { useEmulators: false },
        ai: { model: 'gemini-1.5-pro', maxTokens: 32000 },
        tts: { voiceType: 'wavenet', speakingRate: 0.85 },
        video: { enabled: true, maxDurationMinutes: 180, resolution: '1080p' },
        storage: { useLocalStorage: false },
    },
};

export function getEnvironmentMode(): EnvironmentMode {
    const mode = process.env.NEXT_PUBLIC_ENV_MODE as EnvironmentMode;
    return mode && configs[mode] ? mode : 'DEV';
}

export function getConfig(): EnvironmentConfig {
    return configs[getEnvironmentMode()];
}

// Cost estimation utilities
export interface CostEstimate {
    scriptGeneration: number;
    voiceGeneration: number;
    videoAssembly: number;
    storage: number;
    total: number;
}

export function estimateCost(
    scriptCharCount: number,
    durationMinutes: number,
    mode: EnvironmentMode
): CostEstimate {
    const config = configs[mode];

    // Pricing per service (approximate, in USD)
    const pricing = {
        geminiFlash: 0.000015, // per 1k chars
        geminiPro: 0.00025,    // per 1k chars
        standardTTS: 0.000004, // per char
        wavenetTTS: 0.000016,  // per char
        cloudRun: 0.00002,     // per vCPU-second
        storage: 0.02,         // per GB/month
    };

    let scriptCost = 0;
    let voiceCost = 0;
    let videoCost = 0;

    // Script generation cost
    if (config.ai.model === 'gemini-1.5-flash') {
        scriptCost = (scriptCharCount / 1000) * pricing.geminiFlash;
    } else if (config.ai.model === 'gemini-1.5-pro') {
        scriptCost = (scriptCharCount / 1000) * pricing.geminiPro;
    }

    // Voice generation cost
    if (config.tts.voiceType === 'standard') {
        voiceCost = scriptCharCount * pricing.standardTTS;
    } else if (config.tts.voiceType === 'wavenet') {
        voiceCost = scriptCharCount * pricing.wavenetTTS;
    }

    // Video assembly cost (Cloud Run)
    if (config.video.enabled) {
        const vCPUSeconds = durationMinutes * 60 * 2; // 2 vCPUs assumed
        videoCost = vCPUSeconds * pricing.cloudRun;
    }

    // Storage cost (assume 100MB per minute of video)
    const storageCost = (durationMinutes * 100 / 1024) * pricing.storage;

    return {
        scriptGeneration: Math.round(scriptCost * 100) / 100,
        voiceGeneration: Math.round(voiceCost * 100) / 100,
        videoAssembly: Math.round(videoCost * 100) / 100,
        storage: Math.round(storageCost * 100) / 100,
        total: Math.round((scriptCost + voiceCost + videoCost + storageCost) * 100) / 100,
    };
}
