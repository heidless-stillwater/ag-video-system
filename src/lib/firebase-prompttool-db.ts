/**
 * Firebase Admin — PromptTool Database Bridge
 *
 * Provides a Firestore client pointing at the `prompttool-db-0` database,
 * which is where the image and user library is stored.
 */

import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { admin } from './firebase-admin';

let promptToolDb: Firestore;

try {
    const adminApp = admin.apps().find(a => a?.name === '[DEFAULT]') || admin.apps()[0];
    if (!adminApp) {
        throw new Error('[PromptTool Bridge] Firebase Admin app not initialized.');
    }
    // Specifying 'prompttool-db-0' reaches the dedicated image database
    promptToolDb = getFirestore(adminApp, 'prompttool-db-0');
    promptToolDb.settings({ ignoreUndefinedProperties: true });
} catch (e: any) {
    if (e.message?.includes('already been initialized')) {
        const adminApp = admin.apps().find(a => a?.name === '[DEFAULT]') || admin.apps()[0];
        promptToolDb = getFirestore(adminApp!, 'prompttool-db-0');
    } else {
        throw e;
    }
}

export { promptToolDb };
