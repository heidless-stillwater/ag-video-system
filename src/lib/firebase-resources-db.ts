/**
 * Firebase Admin — PromptResources Database Bridge
 *
 * Provides a Firestore client pointing at the `(default)` database,
 * which is where the research resources (video-system reference documents) are stored.
 */

import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { admin } from './firebase-admin';

let resourcesDb: Firestore;

const app = admin.app();
resourcesDb = getFirestore(app, '(default)');
resourcesDb.settings({ ignoreUndefinedProperties: true });

export { resourcesDb };
