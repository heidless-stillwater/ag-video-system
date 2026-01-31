import { VertexAI } from '@google-cloud/vertexai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { youtube } from '@googleapis/youtube';
import { db, storage } from '@/lib/firebase-admin';
import { resourceGovernor } from './resource-governor';
import os from 'os';
import path from 'path';
import fs from 'fs';

export interface HealthCheckResult {
    service: string;
    status: 'operational' | 'degraded' | 'down';
    responseTime: number;
    message?: string;
    lastChecked: Date;
}

const TIMEOUT_MS = 10000; // 10 second timeout

/**
 * Check Vertex AI (Gemini) availability
 */
export async function checkVertexAI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const location = 'us-central1';
        const saPath = path.resolve(process.cwd(), 'service-account.json');
        const keyFile = fs.existsSync(saPath) ? saPath : undefined;

        const vertexAI = new VertexAI({
            project: projectId!,
            location,
            googleAuthOptions: keyFile ? {
                keyFile,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            } : {
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            }
        });
        const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

        // Lightweight health check prompt
        const result = await Promise.race([
            model.generateContent('Respond with OK'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
        ]);

        const responseTime = Date.now() - startTime;

        return {
            service: 'Vertex AI (Gemini)',
            status: responseTime < 5000 ? 'operational' : 'degraded',
            responseTime,
            message: 'API responding normally',
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            service: 'Vertex AI (Gemini)',
            status: 'down',
            responseTime: Date.now() - startTime,
            message: error.message || 'Connection failed',
            lastChecked: new Date()
        };
    }
}

/**
 * Check Google Cloud TTS availability
 */
export async function checkGoogleTTS(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
        const client = new TextToSpeechClient();

        // List voices as a lightweight check
        const [result] = await Promise.race([
            client.listVoices({ languageCode: 'en-US' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
        ]) as any;

        const responseTime = Date.now() - startTime;

        return {
            service: 'Google Cloud TTS',
            status: responseTime < 3000 ? 'operational' : 'degraded',
            responseTime,
            message: `${result.voices?.length || 0} voices available`,
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            service: 'Google Cloud TTS',
            status: 'down',
            responseTime: Date.now() - startTime,
            message: error.message || 'Connection failed',
            lastChecked: new Date()
        };
    }
}

/**
 * Check Firestore availability
 */
export async function checkFirestore(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
        // Try to read a health check document
        const healthDoc = await Promise.race([
            db.collection('_health').doc('check').get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
        ]) as any;

        const responseTime = Date.now() - startTime;

        // If document doesn't exist, create it
        if (!healthDoc.exists) {
            await db.collection('_health').doc('check').set({
                lastCheck: new Date(),
                status: 'ok'
            });
        }

        return {
            service: 'Firebase Firestore',
            status: responseTime < 2000 ? 'operational' : 'degraded',
            responseTime,
            message: 'Database accessible',
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            service: 'Firebase Firestore',
            status: 'down',
            responseTime: Date.now() - startTime,
            message: error.message || 'Connection failed',
            lastChecked: new Date()
        };
    }
}

/**
 * Check YouTube Data API availability
 */
export async function checkYouTubeAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
        const youtubeClient = youtube({
            version: 'v3',
            auth: process.env.YOUTUBE_API_KEY as string
        });

        // Simple quota check - list categories
        const result = await Promise.race([
            youtubeClient.videoCategories.list({
                part: ['snippet'],
                regionCode: 'US'
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
        ]) as any;

        const responseTime = Date.now() - startTime;

        return {
            service: 'YouTube Data API',
            status: responseTime < 3000 ? 'operational' : 'degraded',
            responseTime,
            message: `API key valid (${result.data.items?.length || 0} categories)`,
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            service: 'YouTube Data API',
            status: 'down',
            responseTime: Date.now() - startTime,
            message: error.message || 'API key invalid or quota exceeded',
            lastChecked: new Date()
        };
    }
}

/**
 * Check Cloud Storage availability
 */
export async function checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
        const bucket = storage.bucket();

        // Check if bucket exists and is accessible
        const [exists] = await Promise.race([
            bucket.exists(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
        ]) as any;

        const responseTime = Date.now() - startTime;

        if (!exists) {
            return {
                service: 'Cloud Storage',
                status: 'down',
                responseTime,
                message: 'Bucket not found',
                lastChecked: new Date()
            };
        }

        return {
            service: 'Cloud Storage',
            status: responseTime < 2000 ? 'operational' : 'degraded',
            responseTime,
            message: 'Bucket accessible',
            lastChecked: new Date()
        };
    } catch (error: any) {
        return {
            service: 'Cloud Storage',
            status: 'down',
            responseTime: Date.now() - startTime,
            message: error.message || 'Connection failed',
            lastChecked: new Date()
        };
    }
}

/**
 * Check Local System Load (WSL Stability)
 */
export async function checkLocalSystem(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const pressure = resourceGovernor.getSystemPressure();
    const freeMemGB = os.freemem() / (1024 * 1024 * 1024);

    let status: 'operational' | 'degraded' | 'down' = 'operational';
    let message = `CPU Load: ${(pressure * 100).toFixed(0)}%, Free RAM: ${freeMemGB.toFixed(2)}GB`;

    if (pressure > 0.8) status = 'degraded';
    if (pressure > 0.95 || freeMemGB < 0.3) status = 'down';

    return {
        service: 'Local System (WSL)',
        status,
        responseTime: Date.now() - startTime,
        message,
        lastChecked: new Date()
    };
}

/**
 * Run all health checks in parallel
 */
export async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
    const checks = await Promise.allSettled([
        checkVertexAI(),
        checkGoogleTTS(),
        checkFirestore(),
        checkYouTubeAPI(),
        checkStorage(),
        checkLocalSystem()
    ]);

    return checks.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            const services = ['Vertex AI', 'Google TTS', 'Firestore', 'YouTube API', 'Storage', 'Local System'];
            return {
                service: services[index],
                status: 'down' as const,
                responseTime: 0,
                message: 'Health check failed',
                lastChecked: new Date()
            };
        }
    });
}
