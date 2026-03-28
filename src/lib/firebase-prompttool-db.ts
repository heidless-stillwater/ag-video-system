/**
 * Firebase Admin — PromptTool Database Bridge
 *
 * Provides a Firestore client pointing at `prompttool-db-0`,
 * which is where PromptTool stores its users and image data.
 *
 * All three apps share the same Firebase project (heidless-apps-0),
 * so the Admin SDK can reach any database within the project.
 *
 * This sits alongside `firebase-admin.ts` which points to `autovideo-db-0`.
 *
 * Pattern mirrors: PromptTool/src/lib/firebase-resources-db.ts
 */

import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { admin } from './firebase-admin';

const PROMPTTOOL_DB_ID = 'prompttool-db-0';

let promptToolDb: Firestore;

try {
    // Re-use the already-initialized default Admin app.
    // The Admin SDK can target any Firestore DB in the same project.
    const adminApp = admin.apps.find(a => a?.name === '[DEFAULT]') || admin.apps[0];
    if (!adminApp) {
        throw new Error('[PromptTool Bridge] Firebase Admin app not initialized. Import firebase-admin.ts first.');
    }
    promptToolDb = getFirestore(adminApp, PROMPTTOOL_DB_ID);
    promptToolDb.settings({ ignoreUndefinedProperties: true });
} catch (e: any) {
    // Gracefully handle hot-reload "already initialized" errors in dev
    if (e.message?.includes('already been initialized')) {
        const adminApp = admin.apps.find(a => a?.name === '[DEFAULT]') || admin.apps[0];
        promptToolDb = getFirestore(adminApp!, PROMPTTOOL_DB_ID);
    } else {
        throw e;
    }
}

export { promptToolDb };
