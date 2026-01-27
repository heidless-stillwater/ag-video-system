import { db as dbAdmin } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { EnvironmentMode } from '../config/environment';

export interface UsageLog {
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
}

export const analyticsServerService = {
    /**
     * Logs an API usage event to Firestore for cost tracking using Admin SDK.
     * Bypasses security rules to ensure background logs are always saved.
     */
    async logUsage(log: Omit<UsageLog, 'estimatedCost'>, envMode: EnvironmentMode = 'DEV'): Promise<void> {
        // Don't log in DEV to save Firestore writes, unless explicitly debugging
        if (envMode === 'DEV' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGGING) {
            console.log('[Analytics Server] Usage logged (DEV - not saved):', log.service, log.operation);
            return;
        }

        try {
            // Pricing estimation logic
            let cost = 0;
            const pricing = {
                geminiFlash: 0.000015, // per 1k chars
                geminiPro: 0.00025,    // per 1k chars
                standardTTS: 0.000004, // per char
                wavenetTTS: 0.000016,  // per char
                cloudRun: 0.00002,     // per vCPU-second
                default: 0
            };

            if (log.service === 'vertex-ai') {
                if (log.model.includes('flash')) {
                    cost = (log.inputCount / 1000) * pricing.geminiFlash;
                } else if (log.model.includes('pro')) {
                    cost = (log.inputCount / 1000) * pricing.geminiPro;
                }
            } else if (log.service === 'google-tts') {
                const isWavenet = log.model.includes('Neural2') || log.model.includes('Studio') || log.model.includes('Wavenet');
                cost = log.inputCount * (isWavenet ? pricing.wavenetTTS : pricing.standardTTS);
            } else if (log.service === 'cloud-run' || log.service === 'render') {
                cost = log.inputCount * pricing.cloudRun;
            }

            const finalLog = {
                ...log,
                estimatedCost: Number(cost.toFixed(6)),
                timestamp: FieldValue.serverTimestamp(),
                environment: envMode,
                loggedVia: 'server-admin'
            };

            await dbAdmin.collection('analytics_logs').add(finalLog);
            console.log(`[Analytics Server] Successfully saved log for ${log.service}`);

        } catch (error) {
            console.warn('[Analytics Server] Failed to save log:', error);
        }
    }
};
