/**
 * Firebase Admin — PromptResources Database Bridge
 *
 * Provides a Firestore client pointing at the `(default)` database,
 * which is where the research resources (video-system reference documents) are stored.
 */

import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { admin } from './firebase-admin';

let resourcesDb: Firestore;

try {
    const adminApp = admin.apps.find(a => a?.name === '[DEFAULT]') || admin.apps[0];
    if (!adminApp) {
        throw new Error('[Resources Bridge] Firebase Admin app not initialized.');
    }
    // Specifying '(default)' reaches the default Firestore project database
    resourcesDb = getFirestore(adminApp, '(default)');
    resourcesDb.settings({ ignoreUndefinedProperties: true });
} catch (e: any) {
    if (e.message?.includes('already been initialized')) {
        const adminApp = admin.apps.find(a => a?.name === '[DEFAULT]') || admin.apps[0];
        resourcesDb = getFirestore(adminApp!, '(default)');
    } else {
        throw e;
    }
}

export { resourcesDb };
