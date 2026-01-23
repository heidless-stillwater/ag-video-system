// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getConfig } from './config/environment';

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase as singletons
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app, 'autovideo-db-0');
const storage = getStorage(app);
const functions = getFunctions(app);

// Connect to emulators in DEV mode
const config = getConfig();
if (config.firebase.useEmulators && typeof window !== 'undefined') {
    try {
        // Connect only if not already connected (prevents error on hot reload)
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('🔧 Connected to Firebase emulators');
    } catch (error) {
        console.log('Emulators already connected or not available');
    }
}

// Collection names
export const COLLECTIONS = {
    USERS: 'users',
    TOPICS: 'topics',
    PROJECTS: 'projects',
    SCRIPTS: 'scripts',
    MEDIA_ASSETS: 'mediaAssets',
    VIDEOS: 'videos',
    ANALYTICS: 'analytics',
} as const;

// Export initialized services
export { app, auth, db, storage, functions };

/**
 * Helper to get all services at once if needed
 */
export function getFirebaseServices() {
    return { app, auth, db, storage, functions };
}
