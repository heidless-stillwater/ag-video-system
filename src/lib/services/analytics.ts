import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getConfig, EnvironmentMode } from '../config/environment';

export interface UsageLog {
    service: 'vertex-ai' | 'google-tts' | 'cloud-run' | 'render' | 'storage' | 'research-discovery' | 'eleven-labs-placeholder' | 'openai-placeholder' | 'murf-placeholder';
    operation: 'script-generation' | 'image-generation' | 'video-generation' | 'speech-synthesis' | 'rendering' | 'research-deep-dive';
    model: string;
    inputCount: number; // characters or tokens
    outputCount?: number; // characters or tokens
    creditsDeducted: number;
    executionTimeMs: number;
    projectId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    timestamp?: any;
}

export interface ProjectBudget {
    spent: number;
    projectedRemaining: number;
    projectedTotal: number;
}

export function calculateProjectBudget(charCount: number, logs: UsageLog[]): ProjectBudget {
    const spent = logs.reduce((sum, log) => sum + (log.creditsDeducted || 0), 0);
    // Rough estimate for remaining: ~2 credits for average script
    const projectedRemaining = spent > 4 ? 0 : Math.max(0, 5 - spent);
    return {
        spent,
        projectedRemaining,
        projectedTotal: spent + projectedRemaining
    };
}

export const analyticsService = {
    /**
     * Logs an API usage event to Firestore for cost tracking.
     * Silently fails in generic try/catch to avoid blocking main app flow.
     */
    async logUsage(log: Omit<UsageLog, 'creditsDeducted'>, envMode: EnvironmentMode = 'DEV'): Promise<void> {
        // Don't log in DEV to save Firestore writes, unless explicitly debugging
        if (envMode === 'DEV' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGGING) {
            console.log('[Analytics] Usage logged (DEV - not saved):', log);
            return;
        }

        try {
            const config = getConfig(envMode);

            // Credit calculation logic
            let credits = 0;
            const CREDIT_PRICES = {
                'script-generation': 1,
                'image-generation': 0.1, // per image
                'speech-synthesis': 0.05, // per 1k chars
                'rendering': 2,
                'research-deep-dive': 0.5,
                'default': 0.1
            };

            if (log.operation === 'script-generation') {
                credits = CREDIT_PRICES['script-generation'];
            } else if (log.operation === 'image-generation') {
                credits = CREDIT_PRICES['image-generation'];
            } else if (log.operation === 'speech-synthesis') {
                credits = (log.inputCount / 1000) * CREDIT_PRICES['speech-synthesis'];
            } else if (log.operation === 'rendering') {
                credits = CREDIT_PRICES['rendering'];
            } else if (log.operation === 'research-deep-dive') {
                credits = CREDIT_PRICES['research-deep-dive'];
            } else {
                credits = CREDIT_PRICES.default;
            }

            const finalLog = {
                ...log,
                creditsDeducted: Number(credits.toFixed(2)),
                timestamp: serverTimestamp(),
                environment: envMode
            };

            await addDoc(collection(db, 'analytics_logs'), finalLog);

            // PROACTIVE: If projectId is present, we could trigger a live update here
            // but usually Firestore listeners handle this via the separate logs collection

        } catch (error) {
            console.warn('[Analytics] Failed to save log:', error);
            // Non-blocking
        }
    }
};
