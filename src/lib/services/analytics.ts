import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getConfig, estimateCost, EnvironmentMode } from '../config/environment';

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

export const analyticsService = {
    /**
     * Logs an API usage event to Firestore for cost tracking.
     * Silently fails in generic try/catch to avoid blocking main app flow.
     */
    async logUsage(log: Omit<UsageLog, 'estimatedCost'>, envMode: EnvironmentMode = 'DEV'): Promise<void> {
        // Don't log in DEV to save Firestore writes, unless explicitly debugging
        if (envMode === 'DEV' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGGING) {
            console.log('[Analytics] Usage logged (DEV - not saved):', log);
            return;
        }

        try {
            const config = getConfig(envMode);

            // Calculate estimated cost on the fly if not provided
            // This is a simplified estimation based on the environment config pricing
            let cost = 0;

            // We use the helper from environment.ts but we need to adapt it since it calculates totals genericly
            // Here we do specific per-call estimation
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
                // For rendering, inputCount usually represents duration in seconds here?
                // usage log should specify what inputCount means. 
                // Let's assume inputCount for rendering is 'seconds of compute'
                cost = log.inputCount * pricing.cloudRun;
            }

            const finalLog = {
                ...log,
                estimatedCost: Number(cost.toFixed(6)),
                timestamp: serverTimestamp(),
                environment: envMode
            };

            await addDoc(collection(db, 'analytics_logs'), finalLog);

        } catch (error) {
            console.warn('[Analytics] Failed to save log:', error);
            // Non-blocking
        }
    }
};
