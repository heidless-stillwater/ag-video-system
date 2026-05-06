/**
 * Firebase Admin — PromptTool Database Bridge
 *
 * Provides a Firestore client pointing at the `prompttool-db-0` database,
 * which is where the image and user library is stored.
 */

import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { admin } from './firebase-admin';

let promptToolDb: Firestore;

const app = admin.app();
promptToolDb = getFirestore(app, 'prompttool-db-0');
promptToolDb.settings({ ignoreUndefinedProperties: true });

export { promptToolDb };
