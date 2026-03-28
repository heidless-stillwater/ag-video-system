'use client';

/**
 * Connection Manager
 * Manages dynamic Firebase configuration overrides
 */

const OVERRIDE_KEY = 'vs_firebase_config_override';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    databaseId?: string;
}

export function setConnectionOverride(config: FirebaseConfig) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(config));

    // Also set a cookie so the server knows
    document.cookie = `${OVERRIDE_KEY}=${encodeURIComponent(JSON.stringify(config))}; path=/; max-age=31536000`;
}

export function getConnectionOverride(): FirebaseConfig | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(OVERRIDE_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch (e) {
        return null;
    }
}

export function clearConnectionOverride() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(OVERRIDE_KEY);
    document.cookie = `${OVERRIDE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
