'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { onAuthStateChanged, onIdTokenChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserSettings, UserRole, UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';
import { MOCK_USER, MOCK_SESSION_KEY, isMockAuthEnabled } from './mockUser';
import { clearConnectionOverride, getConnectionOverride } from '@/lib/config/connectionManager';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    isSigningIn: boolean; // Add this
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
    const [isSigningIn, setIsSigningIn] = useState(false); // Add this

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
        console.log('[AuthContext] Project ID:', auth.app.options.projectId);
        // @ts-ignore - access internal databaseId for debugging
        console.log('[AuthContext] Using database:', db._databaseId?.database || 'default');

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
            fUserRef.current = fUser; // Update ref directly for the interval to see it immediately

            // Proactively kill any old listener before deciding what to do next
            if (typeof userSyncRef.current === 'function') {
                console.log('[AuthContext] Stopping previous sync listener');
                (userSyncRef.current as any)();
                userSyncRef.current = null;
            }

            // Only update user from Firebase if we're not in a mock session
            const isMockSession = isMockAuthEnabled() && localStorage.getItem(MOCK_SESSION_KEY) === 'true';

            if (fUser) {
                // Pre-emptive cleanup before attaching new listener
                if (typeof userSyncRef.current === 'function') {
                    (userSyncRef.current as any)();
                    userSyncRef.current = null;
                }

                // Listen for real-time updates to the user profile
                const userDocRef = doc(db, 'users', fUser.uid);

                try {
                    userSyncRef.current = onSnapshot(userDocRef,
                    (snapshot) => {
                        console.log('[AuthContext] User profile snapshot received. Exists:', snapshot.exists());
                        if (snapshot.exists()) {
                            if (!isMockSession) {
                                console.log('[AuthContext] Setting user state from Firestore');
                                setUser(snapshot.data() as User);
                                setLoading(false);
                            }
                        } else {
                            console.log('[AuthContext] User profile does not exist, creating...');
                            // Create initial profile if it doesn't exist
                            const newUser: User = {
                                id: fUser.uid,
                                email: fUser.email || '',
                                displayName: fUser.displayName || 'Anonymous',
                                photoURL: fUser.photoURL || null,
                                createdAt: new Date(),
                                settings: {
                                    defaultMode: 'DEV',
                                    notifications: true,
                                    autoSave: true,
                                    youtubeConnected: false
                                },
                                // Default role and plan for new users
                                roles: ['user'],
                                plan: (typeof window !== 'undefined' ? sessionStorage.getItem('pending_plan_id') : null) as UserPlan || 'standard',
                                creditBalance: 0
                            };

                            setDoc(userDocRef, {
                                ...newUser,
                                createdAt: serverTimestamp(),
                            }).then(async () => {
                                console.log('[AuthContext] Initial user profile created successfully');
                                // --- Cross-App Sync (RES_TOOL_1: Phase 2) ---
                                // Fire-and-forget: create matching profile in prompttool-db-0
                                try {
                                    const idToken = await fUser.getIdToken();
                                    const syncRes = await fetch('/api/auth/sync-user', {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${idToken}` },
                                    });
                                    const syncData = await syncRes.json();
                                    console.log('[AuthContext] PromptTool sync result:', syncData.message);
                                    
                                    // Cleanup pending plan
                                    if (typeof window !== 'undefined') sessionStorage.removeItem('pending_plan_id');
                                } catch (syncErr) {
                                    // Non-fatal: log but don't block the user
                                    console.warn('[AuthContext] PromptTool sync failed (non-fatal):', syncErr);
                                }
                            }).catch(err => {
                                console.error('[AuthContext] Failed to create initial user profile:', err);
                            });

                            if (!isMockSession) {
                                setUser(newUser);
                                setLoading(false);
                            }
                        }
                    },
                    (err) => {
                        console.error('[AuthContext] User profile sync error!!', JSON.stringify({
                            message: err.message,
                            code: err.code,
                            uid: fUser.uid,
                            currentUser: auth.currentUser?.uid,
                            projectId: auth.app.options.projectId
                        }, null, 2));
                        if (err.code === 'permission-denied') {
                            console.warn('[AuthContext] Firestore permission denied. Attempting manual profile check with retry...');
                            
                            // Retry manual check up to 3 times to allow for indexing delay
                            let attempts = 0;
                            const tryGetDoc = async () => {
                                try {
                                    const snap = await getDoc(userDocRef);
                                    if (snap.exists()) {
                                        console.log('[AuthContext] Manual fetch successful');
                                        setUser(snap.data() as User);
                                        setLoading(false);
                                        return true;
                                    }
                                } catch (getErr: any) {
                                    console.warn(`[AuthContext] Manual fetch attempt ${attempts + 1} failed:`, getErr.message);
                                }
                                return false;
                            };

                            const runRetries = async () => {
                                while (attempts < 3) {
                                    // FORCE TOKEN REFRESH: This helps if the permission error was due to 
                                    // a stale token before the profile doc was fully synchronized in rules.
                                    if (auth.currentUser) {
                                        console.log(`[AuthContext] Refreshing ID token (attempt ${attempts + 1})...`);
                                        await auth.currentUser.getIdToken(true).catch(() => { });
                                    }

                                    const success = await tryGetDoc();
                                    if (success) return;
                                    attempts++;
                                    await new Promise(r => setTimeout(r, 1500));
                                }
                                console.error('[AuthContext] All manual fetch retries failed.');
                                setLoading(false);
                            };

                            runRetries();
                        } else {
                            setLoading(false);
                        }
                    }
                );
                } catch (snapErr: any) {
                    console.error('[AuthContext] Firestore onSnapshot failed to initialize. Ca9 Bug mitigation:', snapErr.message);
                    setLoading(false);
                }
            } else {
                if (!isMockSession) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        // Handle redirect result
        getRedirectResult(auth).then((result) => {
            if (result) {
                console.log('[AuthContext] Redirect sign-in successful');
            }
        }).catch((error) => {
            console.error('[AuthContext] Redirect sign-in error:', error);
        });

        // Periodic check as a safety for COOP ghosting
        const interval = setInterval(() => {
            if (auth.currentUser && !fUserRef.current) {
                console.log('[AuthContext] Periodic check found active session but local state is missing. Manual sync triggered.');
                // Triggering a token refresh can sometimes wake up the observers
                auth.currentUser.getIdToken(true).catch(() => { });
            }
        }, 10000); // Relaxed to 10s

        return () => {
            unsubscribeAuth();
            clearInterval(interval);
            if (userSyncRef.current) userSyncRef.current();
        };
    }, []);

    const signInWithGoogle = async () => {
        console.log('[AuthContext] signInWithGoogle called, isSigningIn:', isSigningIn);
        if (isSigningIn) return;

        setIsSigningIn(true);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'consent select_account'
        });

        try {
            console.log('[AuthContext] Attempting signInWithPopup...');
            const result = await signInWithPopup(auth, provider);
            console.log('[AuthContext] signInWithPopup resolved. User UID:', result.user?.uid || 'NONE');

            // Critical check: if result is empty or currentUser is still null, 
            // the COOP policy likely blocked the token receipt.
            if (!auth.currentUser && !result.user) {
                console.warn('[AuthContext] signInWithPopup resolved but no user found. Potential COOP block. Falling back to Redirect...');
                await signInWithRedirect(auth, provider);
                return;
            }

            console.log('[AuthContext] Sign-in successful via Popup');
        } catch (error: any) {
            console.log('[AuthContext] signInWithPopup failed:', error.code, error.message);

            // If popup is blocked or fails due to COOP/browser restrictions, fallback to redirect
            const shouldFallbackToRedirect =
                error.code === 'auth/popup-blocked' ||
                error.code === 'auth/cancelled-popup-request' ||
                error.code === 'auth/internal-error';

            if (shouldFallbackToRedirect) {
                console.log('[AuthContext] Falling back to signInWithRedirect...');
                try {
                    await signInWithRedirect(auth, provider);
                } catch (redirectError) {
                    console.error('[AuthContext] signInWithRedirect failed:', redirectError);
                }
            } else {
                // Gracefully handle manual cancellations
                const isUserCancelled = error.code === 'auth/popup-closed-by-user';
                if (!isUserCancelled) {
                    console.error("Error signing in with Google", error);
                }
            }
        } finally {
            console.log('[AuthContext] signInWithGoogle finished.');
            setIsSigningIn(false);
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            console.error('Error signing in with email', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signUpWithEmail = async (email: string, pass: string, name: string) => {
        try {
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // Immediately update the profile name to ensure it propagates correctly
            await firebaseUpdateProfile(userCredential.user, {
                displayName: name
            });
            console.log('[AuthContext] User created with email and name updated');
        } catch (error: any) {
            console.error('Error signing up with email', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signInWithMock = () => {
        if (!isMockAuthEnabled()) return;
        setUser(MOCK_USER);
        setFirebaseUser(null);
        localStorage.setItem(MOCK_SESSION_KEY, 'true');
        setLoading(false);
    };

    const signOut = async () => {
        try {
            // CRITICAL: Stop sync BEFORE calling sign out to avoid permission-denied race condition
            if (userSyncRef.current) {
                console.log('[AuthContext] Force stopping sync before signout');
                userSyncRef.current();
                userSyncRef.current = null;
            }

            if (isMockAuthEnabled()) {
                localStorage.removeItem(MOCK_SESSION_KEY);
            }
            if (auth.currentUser) {
                await firebaseSignOut(auth);
            } else {
                setUser(null);
                setLoading(false);
            }
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    /**
     * Authenticated Fetch Wrapper
     * Automatically adds Firebase ID token to request headers
     */
    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        if (!firebaseUser && user?.id !== 'mock-user-123') {
            return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), { status: 401 });
        }

        let token;
        if (user?.id === 'mock-user-123') {
            token = 'mock-token';
        } else {
            token = await firebaseUser!.getIdToken();
        }

        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);

        return fetch(url, {
            ...options,
            headers
        });
    }, [firebaseUser, user]);

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
            isSigningIn,
            signInWithGoogle,
            signInWithMock,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            // Role utilities
            roles,
            plan,
            planNickname,
            hasRole,
            isAdmin,
            isSuperUser,
            authFetch
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

