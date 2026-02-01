import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Initialize Firebase Admin SDK for VideoSystem.
 * 
 * CRITICAL CHANGE: This module now FAILS FAST in production if credentials are missing.
 * It only falls back to mocks during the 'phase-production-build' to allow static generation.
 */

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'heidless-firebase-2';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PUBLIC_IS_BUILD === 'true';

console.log(`[Firebase Admin] Module loading. Project: ${projectId}. Phase: ${process.env.NEXT_PHASE || 'RUNTIME'}`);

// SANITATION: Unset invalid GOOGLE_APPLICATION_CREDENTIALS to prevent crashes in other SDKs
const saPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (saPathEnv) {
    const absolutePath = path.isAbsolute(saPathEnv) ? saPathEnv : path.join(process.cwd(), saPathEnv);
    if (!fs.existsSync(absolutePath)) {
        console.warn(`[Firebase Admin] ⚠️ Unsetting invalid GOOGLE_APPLICATION_CREDENTIALS: ${absolutePath}`);
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
}

let app: admin.app.App;
const existingApp = admin.apps.find(a => a?.name === '[DEFAULT]') || admin.apps[0];

if (existingApp) {
    app = existingApp;
    console.log(`[Firebase Admin] ✅ Reusing existing app: ${app.name}`);
} else {
    try {
        let credential;

        // 1. Precise Environment Variable (Cloud Run / Production Secrets)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.log('[Firebase Admin] 🔑 Using FIREBASE_SERVICE_ACCOUNT_JSON');
            const saContent = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = admin.credential.cert(saContent);
        }
        // 2. Local File (Dev/Server)
        else {
            // Priority 1: Explicit local file in the project root
            const rootSaPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(rootSaPath)) {
                console.log(`[Firebase Admin] 🔑 Using local root file: ${rootSaPath}`);
                credential = admin.credential.cert(rootSaPath);
            }
            // Priority 2: Google Application Credentials (if it exists and looks like a cert)
            else {
                const possibleSaPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
                if (possibleSaPath && fs.existsSync(possibleSaPath)) {
                    try {
                        // Check if it's a valid service account JSON (not an ADC auth file)
                        const content = JSON.parse(fs.readFileSync(possibleSaPath, 'utf8'));
                        if (content.project_id && content.private_key) {
                            console.log(`[Firebase Admin] 🔑 Using file from ENV: ${possibleSaPath}`);
                            credential = admin.credential.cert(possibleSaPath);
                        }
                    } catch (e) {
                        // Not a valid JSON or not a SA cert, ignore and fall back
                        console.warn(`[Firebase Admin] ⚠️ Env file is not a valid service account cert: ${possibleSaPath}`);
                    }
                }
            }
        }

        // 3. ADC Fallback (Cloud Run / Deployed Environment)
        if (!credential) {
            console.log('[Firebase Admin] ☁️ Attempting Application Default Credentials (ADC)');
            credential = admin.credential.applicationDefault();
        }

        app = admin.initializeApp({
            credential,
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
        });

        console.log(`[Firebase Admin] ✅ Successfully initialized for ${projectId}`);

    } catch (error: any) {
        console.error('[Firebase Admin] ❌ Initialization FAILED:', error);

        if (isBuildPhase) {
            console.warn('[Firebase Admin] ⚠️ Build phase detected. Proceeding without valid app.');
        } else {
            // FATAL ERROR IN PRODUCTION
            throw new Error(`Firebase Admin Init Failed: ${error.message}`);
        }
    }
}

// Get Services
let db: any;
let storage: any;

try {
    // @ts-ignore - 'app' might be undefined if init failed during build
    if (app) {
        db = getFirestore(app, 'autovideo-db-0');
        storage = getStorage(app);
        console.log('[Firebase Admin] ✅ Services ready: Firestore (autovideo-db-0), Storage');
    } else {
        throw new Error('No App Instance');
    }
} catch (e: any) {
    if (isBuildPhase) {
        console.warn('[Firebase Admin] ⚠️ Using MOCK Firestore/Storage for BUILD only.');
        db = {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: false, data: () => null }),
                    set: () => Promise.resolve(),
                    update: () => Promise.resolve(),
                    delete: () => Promise.resolve(),
                }),
                where: () => db.collection('mock'),
                orderBy: () => db.collection('mock'),
                limit: () => db.collection('mock'),
                get: () => Promise.resolve({ docs: [] }),
                add: () => Promise.resolve({ id: 'mock-id' }),
            }),
            settings: () => { }
        };
        storage = { bucket: () => ({ exists: () => Promise.resolve([false]), file: () => ({ exists: () => Promise.resolve([false]) }) }) };
    } else {
        // FATAL ERROR IN RUNTIME
        console.error('[Firebase Admin] ❌ Service connection Failed:', e.message);
        throw e;
    }
}

export { admin, db, storage };
