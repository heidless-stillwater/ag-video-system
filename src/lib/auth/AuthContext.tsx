'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserSettings } from '@/types';
import { MOCK_USER, MOCK_SESSION_KEY, isMockAuthEnabled } from './mockUser';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithMock: () => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    const userSyncRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Check for mock session first
        if (isMockAuthEnabled()) {
            const savedMockSession = localStorage.getItem(MOCK_SESSION_KEY);
            if (savedMockSession === 'true') {
                setUser(MOCK_USER);
                setLoading(false);
            }
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (fUser) => {
            setFirebaseUser(fUser);

            // Proactively kill any old listener before deciding what to do next
            if (userSyncRef.current) {
                console.log('[AuthContext] Stopping previous sync listener');
                userSyncRef.current();
                userSyncRef.current = null;
            }

            // Only update user from Firebase if we're not in a mock session
            const isMockSession = isMockAuthEnabled() && localStorage.getItem(MOCK_SESSION_KEY) === 'true';

            if (fUser) {
                // Listen for real-time updates to the user profile
                const userDocRef = doc(db, 'users', fUser.uid);

                userSyncRef.current = onSnapshot(userDocRef,
                    (snapshot) => {
                        if (snapshot.exists()) {
                            if (!isMockSession) {
                                setUser(snapshot.data() as User);
                                setLoading(false);
                            }
                        } else {
                            // Create initial profile if it doesn't exist
                            const newUser: User = {
                                id: fUser.uid,
                                email: fUser.email || '',
                                displayName: fUser.displayName || 'Anonymous',
                                photoURL: fUser.photoURL || undefined,
                                createdAt: new Date(),
                                settings: {
                                    defaultMode: 'DEV',
                                    notifications: true,
                                    autoSave: true,
                                    youtubeConnected: false
                                }
                            };

                            setDoc(userDocRef, {
                                ...newUser,
                                createdAt: serverTimestamp(),
                            });

                            if (!isMockSession) {
                                setUser(newUser);
                                setLoading(false);
                            }
                        }
                    },
                    (err) => {
                        console.log('[AuthContext] User profile sync stopped or denied:', err.message);
                        setLoading(false);
                    }
                );
            } else {
                if (!isMockSession) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (userSyncRef.current) userSyncRef.current();
        };
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
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

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signInWithMock, signOut }}>
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
