import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getEnvironmentMode } from '../config/environment';

const getFirebaseConfig = () => {
    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    if (getEnvironmentMode() === 'PRODUCTION') {
        const missing = Object.entries(config)
            .filter(([_, value]) => !value)
            .map(([key]) => key);
        
        if (missing.length > 0) {
            throw new Error(`CRITICAL: Missing Firebase configuration for production: ${missing.join(', ')}`);
        }
    }

    return {
        apiKey: config.apiKey || 'mock-api-key',
        authDomain: config.authDomain || 'mock-auth-domain',
        projectId: config.projectId || 'mock-project-id',
        storageBucket: config.storageBucket || 'mock-storage-bucket',
        messagingSenderId: config.messagingSenderId || 'mock-sender-id',
        appId: config.appId || 'mock-app-id'
    };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app };
