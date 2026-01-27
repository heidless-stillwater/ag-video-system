import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin (singleton pattern)
if (!admin.apps.length) {
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            // Priority 1: Direct JSON from env var (best for cloud)
            const saContent = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = admin.credential.cert(saContent);
            console.log(`[Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT_JSON`);
        } else if (saPath) {
            // Priority 2: Path from env var
            const absolutePath = path.isAbsolute(saPath) ? saPath : path.join(process.cwd(), saPath);
            if (fs.existsSync(absolutePath)) {
                try {
                    const saContent = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
                    credential = admin.credential.cert(saContent);
                    console.log(`[Firebase Admin] Initialized with credentials from: ${absolutePath}`);
                } catch (readErr) {
                    console.error(`[Firebase Admin] Failed to parse service account file at ${absolutePath}:`, readErr);
                    credential = admin.credential.applicationDefault();
                }
            } else {
                console.warn(`[Firebase Admin] Service account file not found at ${absolutePath}, falling back to applicationDefault`);
                credential = admin.credential.applicationDefault();
            }
        } else {
            // Default Google credentials
            credential = admin.credential.applicationDefault();
        }

        admin.initializeApp({
            credential,
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        console.log(`[Firebase Admin] Initialized successfully for project: ${projectId}`);
    } catch (error) {
        console.error('[Firebase Admin] Initialization error:', error);
        // Non-fatal if we are in build mode
        if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
            console.warn('[Firebase Admin] Initialization failed during build phase. Continuing...');
        } else {
            // Re-throw if it's runtime and we have no apps
            if (!admin.apps.length) throw error;
        }
    }
}

import { getStorage } from 'firebase-admin/storage';

// Named database instance
// getFirestore('autovideo-db-0') works in firebase-admin v11.3+
const dbAdmin = getFirestore('autovideo-db-0');
const storage = getStorage();

export { admin, dbAdmin as db, storage };
