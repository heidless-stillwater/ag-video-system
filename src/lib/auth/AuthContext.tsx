'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { onAuthStateChanged, onIdTokenChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserSettings, UserRole, UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';
import { MOCK_USER, MOCK_SESSION_KEY, isMockAuthEnabled } from './mockUser';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    isSigningIn: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithMock: () => void;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    // Role utilities
    roles: UserRole[];
    plan: UserPlan;
    planNickname: string;
    hasRole: (role: UserRole) => boolean;
    isAdmin: boolean;
    isSuperUser: boolean;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const userSyncRef = useRef<(() => void) | null>(null);
    const fUserRef = useRef<FirebaseUser | null>(null);

    // Derived role state
    const roles = useMemo<UserRole[]>(() => user?.roles || ['user'], [user]);
    const plan = useMemo<UserPlan>(() => user?.plan || 'standard', [user]);
    const planNickname = useMemo(() => {
        return user?.planNickname || DEFAULT_PLAN_NICKNAMES[plan] || 'hobbyist';
    }, [user, plan]);

    const hasRole = (role: UserRole): boolean => roles.includes(role);
    const isAdmin = useMemo(() => roles.includes('su') || roles.includes('admin'), [roles]);
    const isSuperUser = useMemo(() => roles.includes('su'), [roles]);

    // Keep fUserRef in sync
    useEffect(() => {
        fUserRef.current = firebaseUser;
    }, [firebaseUser]);

    useEffect(() => {
        console.log('[AuthContext] AuthProvider Effect mounted. Auth status:', auth.currentUser?.uid || 'null');
        
        // Check for mock session first
        if (isMockAuthEnabled()) {
            const savedMockSession = localStorage.getItem(MOCK_SESSION_KEY);
            if (savedMockSession === 'true') {
                setUser(MOCK_USER);
                setLoading(false);
            }
        }

        const unsubscribeAuth = onIdTokenChanged(auth, (fUser) => {
            console.log('[AuthContext] onIdTokenChanged triggered. fUser:', fUser?.uid || 'null');
            setFirebaseUser(fUser);
            fUserRef.current = fUser;

            // Proactively kill any old listener
            if (typeof userSyncRef.current === 'function') {
                (userSyncRef.current as any)();
                userSyncRef.current = null;
            }

            const isMockSession = isMockAuthEnabled() && localStorage.getItem(MOCK_SESSION_KEY) === 'true';

            if (fUser) {
                // Listen for real-time updates to the user profile in VideoSystem DB
                const userDocRef = doc(db, 'users', fUser.uid);

                try {
                    userSyncRef.current = onSnapshot(userDocRef,
                    (snapshot) => {
                        console.log('[AuthContext] User profile snapshot received. Exists:', snapshot.exists());
                        if (snapshot.exists()) {
                            if (!isMockSession) {
                                console.log('[AuthContext] Setting user state from Firestore');
                                const firestoreData = snapshot.data() as User;
                                
                                // Identity Sync from Auth to Profile
                                const googlePhotoURL = fUser.photoURL || fUser.providerData?.find(p => p.photoURL)?.photoURL;
                                const googleDisplayName = fUser.displayName || fUser.providerData?.find(p => p.displayName)?.displayName;
                                
                                if (!firestoreData.photoURL && googlePhotoURL) firestoreData.photoURL = googlePhotoURL;
                                if (!firestoreData.displayName && googleDisplayName) firestoreData.displayName = googleDisplayName;

                                setUser(firestoreData);
                                setLoading(false);

                                // Trigger Suite-wide Identity Sync (Phase 2 Integration)
                                fUser.getIdToken().then(idToken => {
                                    fetch('/api/auth/sync-user', {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${idToken}` },
                                    }).catch(err => console.warn('[AuthContext] Suite sync failed:', err));
                                });
                            }
                        } else {
                            console.log('[AuthContext] User profile does not exist locally, triggering initial sync...');
                            // Trigger sync to create profile from Identity Hub
                            fUser.getIdToken().then(async (idToken) => {
                                try {
                                    const res = await fetch('/api/auth/sync-user', {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${idToken}` },
                                    });
                                    if (!res.ok) throw new Error('Initial sync failed');
                                    console.log('[AuthContext] Initial suite sync successful');
                                } catch (err) {
                                    console.error('[AuthContext] Failed to trigger initial sync:', err);
                                    setLoading(false);
                                }
                            });
                        }
                    },
                    (err) => {
                        console.error('[AuthContext] User profile sync error:', err.message);
                        setLoading(false);
                    });
                } catch (snapErr: any) {
                    console.error('[AuthContext] onSnapshot failed:', snapErr.message);
                    setLoading(false);
                }
            } else {
                if (!isMockSession) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        const interval = setInterval(() => {
            if (auth.currentUser && !fUserRef.current) {
                auth.currentUser.getIdToken(true).catch(() => { });
            }
        }, 10000);

        return () => {
            unsubscribeAuth();
            clearInterval(interval);
            if (userSyncRef.current) userSyncRef.current();
        };
    }, []);

    const signInWithGoogle = async () => {
        if (isSigningIn) return;
        setIsSigningIn(true);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'consent select_account' });

        try {
            const result = await signInWithPopup(auth, provider);
            if (!auth.currentUser && !result.user) {
                await signInWithRedirect(auth, provider);
            }
        } catch (error: any) {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/internal-error') {
                await signInWithRedirect(auth, provider);
            }
        } finally {
            setIsSigningIn(false);
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, pass);
        } finally {
            setLoading(false);
        }
    };

    const signUpWithEmail = async (email: string, pass: string, name: string) => {
        try {
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await firebaseUpdateProfile(userCredential.user, { displayName: name });
        } finally {
            setLoading(false);
        }
    };

    const signInWithMock = () => {
        if (!isMockAuthEnabled()) return;
        setUser(MOCK_USER);
        localStorage.setItem(MOCK_SESSION_KEY, 'true');
        setLoading(false);
    };

    const signOut = async () => {
        try {
            if (userSyncRef.current) {
                userSyncRef.current();
                userSyncRef.current = null;
            }
            if (isMockAuthEnabled()) localStorage.removeItem(MOCK_SESSION_KEY);
            if (auth.currentUser) await firebaseSignOut(auth);
            else { setUser(null); setLoading(false); }
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        if (!firebaseUser && user?.id !== 'mock-user-123') {
            return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), { status: 401 });
        }

        let token;
        if (user?.id === 'mock-user-123') token = 'mock-token';
        else token = await firebaseUser!.getIdToken();

        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);

        return fetch(url, { ...options, headers });
    }, [firebaseUser, user]);

    return (
        <AuthContext.Provider value={{
            user, firebaseUser, loading, isSigningIn, signInWithGoogle, signInWithMock,
            signInWithEmail, signUpWithEmail, signOut, roles, plan, planNickname,
            hasRole, isAdmin, isSuperUser, authFetch
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
