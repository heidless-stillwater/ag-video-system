import { db as dbAdmin } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { EnvironmentMode } from '../config/environment';

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
}

export const analyticsServerService = {
    /**
     * Logs an API usage event to Firestore for cost tracking using Admin SDK.
     * Bypasses security rules to ensure background logs are always saved.
     */
    async logUsage(log: Omit<UsageLog, 'creditsDeducted'>, envMode: EnvironmentMode = 'DEV'): Promise<void> {
        // Don't log in DEV to save Firestore writes, unless explicitly debugging
        if (envMode === 'DEV' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGGING) {
            console.log('[Analytics Server] Usage logged (DEV - not saved):', log.service, log.operation);
            return;
        }

        try {
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
                timestamp: FieldValue.serverTimestamp(),
                environment: envMode,
                loggedVia: 'server-admin'
            };

            await dbAdmin.collection('analytics_logs').add(finalLog);
            console.log(`[Analytics Server] Successfully saved log for ${log.service} (${credits} credits)`);

            // Deduct credits from project if projectId is provided
            if (log.projectId && credits > 0) {
                await dbAdmin.collection('projects').doc(log.projectId).update({
                    creditsDeducted: FieldValue.increment(credits),
                    updatedAt: FieldValue.serverTimestamp()
                });
                console.log(`[Analytics Server] Deducted ${credits} from project ${log.projectId}`);
            }


        } catch (error) {
            console.warn('[Analytics Server] Failed to save log:', error);
        }
    }
};
