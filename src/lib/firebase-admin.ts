import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Initialize Firebase Admin SDK for VideoSystem.
 */

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'heidless-apps-0';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PUBLIC_IS_BUILD === 'true';

console.log(`[Firebase Admin] Module loading. Project: ${projectId}. Phase: ${process.env.NEXT_PHASE || 'RUNTIME'}`);

// SANITATION
const saPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (saPathEnv) {
    const absolutePath = path.isAbsolute(saPathEnv) ? saPathEnv : path.join(process.cwd(), saPathEnv);
    if (!fs.existsSync(absolutePath)) {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
}

let app: admin.app.App;
const existingApp = admin.apps.find(a => a?.name === '[DEFAULT]') || admin.apps[0];

if (existingApp) {
    app = existingApp;
} else {
    try {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
        } else {
            const rootSaPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(rootSaPath)) {
                credential = admin.credential.cert(rootSaPath);
            } else {
                credential = admin.credential.applicationDefault();
            }
        }

        app = admin.initializeApp({
            credential,
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
        });
    } catch (error: any) {
        if (isBuildPhase) {
            console.warn('[Firebase Admin] Build phase fallback.');
        } else {
            throw new Error(`Firebase Admin Init Failed: ${error.message}`);
        }
    }
}

// Get Services - Using non-null assertions as app is guaranteed unless in build
let db: admin.firestore.Firestore;
let storage: admin.storage.Storage;
let auth: admin.auth.Auth;

if (existingApp || (typeof app! !== 'undefined')) {
    // @ts-ignore
    const targetApp = app || existingApp;
    db = getFirestore(targetApp, 'autovideo-db-0');
    try {
        db.settings({ ignoreUndefinedProperties: true });
    } catch (e) {
        // Already initialized in dev mode hot reload - ignore
    }
    storage = getStorage(targetApp);
    auth = getAuth(targetApp);
} else {
    // Mock for build
    // @ts-ignore
    db = { collection: () => ({ doc: () => ({ get: () => Promise.resolve({ exists: false }), set: () => Promise.resolve() }), where: () => db.collection('mock'), get: () => Promise.resolve({ docs: [] }) }) };
    // @ts-ignore
    storage = { bucket: () => ({ exists: () => Promise.resolve([false]), file: () => ({ exists: () => Promise.resolve([false]) }) }) };
    // @ts-ignore
    auth = { verifyIdToken: () => Promise.resolve({ uid: 'mock-uid' }) };
}

export { admin, db, storage, auth };
