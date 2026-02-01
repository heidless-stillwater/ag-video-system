// Environment configuration for VideoSystem
// Supports DEV, STAGING, and PRODUCTION modes for cost optimization

export type EnvironmentMode = 'DEV' | 'STAGING' | 'STAGING_LIMITED' | 'PRODUCTION';

export interface EnvironmentConfig {
    mode: EnvironmentMode;
    firebase: {
        useEmulators: boolean;
    };
    ai: {
        model: 'gemini-2.0-flash-001' | 'gemini-2.5-pro' | 'mock';
        maxTokens: number;
        limitAI: boolean; // If true, generate only 1 visual cue per section instead of 4
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
        ai: { model: 'mock', maxTokens: 1000, limitAI: false },
        tts: { voiceType: 'browser', speakingRate: 0.85 },
        video: { enabled: false, maxDurationMinutes: 5, resolution: '720p' },
        storage: { useLocalStorage: true },
    },
    STAGING: {
        mode: 'STAGING',
        firebase: { useEmulators: false },
        ai: { model: 'gemini-2.0-flash-001', maxTokens: 8000, limitAI: false },
        tts: { voiceType: 'standard', speakingRate: 0.85 },
        video: { enabled: true, maxDurationMinutes: 5, resolution: '720p' },
        storage: { useLocalStorage: false },
    },
    STAGING_LIMITED: {
        mode: 'STAGING_LIMITED',
        firebase: { useEmulators: false },
        ai: { model: 'gemini-2.0-flash-001', maxTokens: 8000, limitAI: true },
        tts: { voiceType: 'standard', speakingRate: 0.85 },
        video: { enabled: true, maxDurationMinutes: 5, resolution: '720p' },
        storage: { useLocalStorage: false },
    },
    PRODUCTION: {
        mode: 'PRODUCTION',
        firebase: { useEmulators: false },
        ai: { model: 'gemini-2.5-pro', maxTokens: 32000, limitAI: false },
        tts: { voiceType: 'wavenet', speakingRate: 0.85 },
        video: { enabled: true, maxDurationMinutes: 180, resolution: '1080p' },
        storage: { useLocalStorage: false },
    },
};

export function getEnvironmentMode(): EnvironmentMode {
    // 1. Check for explicit override in environment (usually baked during build)
    const envVarMode = process.env.NEXT_PUBLIC_ENV_MODE as EnvironmentMode;

    // 2. Identify if we are in a production runtime (Cloud Run, Vercel, Firebase Functions)
    const isProductionRuntime =
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL === '1' ||
        !!process.env.K_SERVICE || // Cloud Run
        !!process.env.FUNCTION_NAME; // Firebase Functions

    // 3. Fallback logic:
    // - If it's a production runtime, default to PRODUCTION unless specifically forced otherwise
    // - Otherwise, respect the environment variable if valid
    // - Finally, default to DEV

    if (isProductionRuntime) {
        // In production runtime, we only allow STAGING or PRODUCTION
        if (envVarMode === 'STAGING' || envVarMode === 'STAGING_LIMITED') {
            return envVarMode;
        }
        return 'PRODUCTION';
    }

    if (envVarMode && configs[envVarMode]) {
        return envVarMode;
    }

    return 'DEV';
}

export function getConfig(overrideMode?: EnvironmentMode): EnvironmentConfig {
    if (overrideMode && configs[overrideMode]) {
        return configs[overrideMode];
    }
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
    if (config.ai.model === 'gemini-2.0-flash-001') {
        scriptCost = (scriptCharCount / 1000) * pricing.geminiFlash;
    } else if (config.ai.model === 'gemini-2.5-pro') {
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
