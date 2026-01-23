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
        if (saPath) {
            const absolutePath = path.isAbsolute(saPath) ? saPath : path.join(process.cwd(), saPath);
            if (fs.existsSync(absolutePath)) {
                credential = admin.credential.cert(absolutePath);
                console.log(`[Firebase Admin] Loading credentials from: ${absolutePath}`);
            } else {
                console.warn(`[Firebase Admin] Service account file not found at ${absolutePath}, falling back to applicationDefault`);
                credential = admin.credential.applicationDefault();
            }
        } else {
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
    }
}

// Named database instance
// getFirestore('autovideo-db-0') works in firebase-admin v11.3+
const dbAdmin = getFirestore('autovideo-db-0');

export { admin, dbAdmin };
