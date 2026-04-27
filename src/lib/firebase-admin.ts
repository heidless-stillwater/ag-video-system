import * as adminSDK from 'firebase-admin';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * SOVEREIGN RESILIENCE PATTERN
 * Provides lazy-loading proxies for Firebase Admin services.
 * Prevents build-time crashes and handles environment-specific initialization.
 */

function getEnsuredApp(): App {
    const currentApps = getApps();
    const defaultApp = currentApps.find(a => a.name === '[DEFAULT]');

    if (defaultApp) return defaultApp;

    // Credential Hierarchy: Explicit Secret -> GCP Default
    const privateKey = process.env.SERVICE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.SERVICE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.SERVICE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'heidless-apps-0';

    process.stdout.write(`[FirebaseAdmin] HANDSHAKE_START: [DEFAULT]\n`);

    try {
        if (privateKey && clientEmail) {
            process.stdout.write(`[FirebaseAdmin] PREPARING_CERT: ${projectId}\n`);
            const formattedKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
            
            process.stdout.write(`[FirebaseAdmin] INITIALIZING_APP: [DEFAULT] (Manual Cert)\n`);
            return initializeApp({
                credential: cert({ projectId, clientEmail, privateKey: formattedKey }),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
            });
        } else {
            process.stdout.write(`[FirebaseAdmin] INITIALIZING_APP: [DEFAULT] (Zero-Config)\n`);
            return initializeApp({
                projectId,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
            });
        }
    } catch (error: any) {
        process.stdout.write(`[FirebaseAdmin] INIT_EXCEPTION: ${error.message}\n`);
        // Fallback for hot-reload or concurrent init
        const retryApps = getApps();
        const retryDefault = retryApps.find(a => a.name === '[DEFAULT]');
        if (retryDefault) return retryDefault;
        throw error;
    }
}

/**
 * Lazy Service Proxies
 */

export const auth: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const service = getAuth(app);
        const value = (service as any)[prop];
        return typeof value === 'function' ? value.bind(service) : value;
    }
});

// Primary Database for ag-video-system
export const db: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const service = getFirestore(app, 'autovideo-db-0');
        try { service.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
        const value = (service as any)[prop];
        return typeof value === 'function' ? value.bind(service) : value;
    }
});

// Shared Identity Store (Read-only for suite-wide user registry)
export const identityDb: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const service = getFirestore(app, 'prompttool-db-0');
        try { service.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
        const value = (service as any)[prop];
        return typeof value === 'function' ? value.bind(service) : value;
    }
});

// Shared Compliance Hub (Read-only for policy gating)
export const accreditationDb: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const service = getFirestore(app, 'promptaccreditation-db-0');
        try { service.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
        const value = (service as any)[prop];
        return typeof value === 'function' ? value.bind(service) : value;
    }
});

export const storage: any = new Proxy({} as any, {
    get(target, prop) {
        const app = getEnsuredApp();
        const service = getStorage(app);
        const value = (service as any)[prop];
        return typeof value === 'function' ? value.bind(service) : value;
    }
});

export const admin = {
    apps: getApps,
    app: getEnsuredApp,
    credential: {
        cert: cert
    }
};

