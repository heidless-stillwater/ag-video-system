// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getConfig } from './config/environment';

// Firebase configuration - replace with your project config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

function initializeFirebase() {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Connect to emulators in DEV mode
    const config = getConfig();
    if (config.firebase.useEmulators && typeof window !== 'undefined') {
        try {
            connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectStorageEmulator(storage, 'localhost', 9199);
            connectFunctionsEmulator(functions, 'localhost', 5001);
            console.log('🔧 Connected to Firebase emulators');
        } catch (error) {
            // Emulators might already be connected
            console.log('Emulators already connected or not available');
        }
    }

    return { app, auth, db, storage, functions };
}

// Export initialized services
export function getFirebaseServices() {
    if (!app) {
        initializeFirebase();
    }
    return { app, auth, db, storage, functions };
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

// Export for direct imports
export { app, auth, db, storage, functions };
