// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getConfig } from './config/environment';

// Helper to get client-side override from cookies (for SSR) or localStorage
function getOverrideConfig() {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('vs_firebase_config_override');
        if (stored) return JSON.parse(stored);
    }
    return null;
}

const override = getOverrideConfig();

// Firebase configuration
const firebaseConfig = {
    apiKey: override?.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: override?.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: override?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: override?.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: override?.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: override?.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const databaseId = override?.databaseId || 'autovideo-db-0';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Global cache for services to prevent re-initialization during HMR in Next.js
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (typeof window !== 'undefined') {
    // Persistent cache on window for development/HMR stability
    const win = window as any;
    if (!win.__vs_firebase_auth) win.__vs_firebase_auth = getAuth(app);
    if (!win.__vs_firebase_db) win.__vs_firebase_db = getFirestore(app, databaseId);
    if (!win.__vs_firebase_storage) win.__vs_firebase_storage = getStorage(app);
    if (!win.__vs_firebase_functions) win.__vs_firebase_functions = getFunctions(app);

    auth = win.__vs_firebase_auth;
    db = win.__vs_firebase_db;
    storage = win.__vs_firebase_storage;
    functions = win.__vs_firebase_functions;
} else {
    // Standard initialization for Server-Side Rendering
    auth = getAuth(app);
    db = getFirestore(app, databaseId);
    storage = getStorage(app);
    functions = getFunctions(app);
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
    PLAN_NICKNAMES: 'planNicknames',
} as const;

// Export initialized services
export { app, auth, db, storage, functions };

/**
 * Helper to get all services at once if needed
 */
export function getFirebaseServices() {
    return { app, auth, db, storage, functions };
}
