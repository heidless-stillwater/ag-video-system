'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { onIdTokenChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole, UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';
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
    const lastDataRef = useRef<string>('');
    const fUserRef = useRef<FirebaseUser | null>(null);

    const roles = useMemo<UserRole[]>(() => user?.roles || ['user'], [user]);
    const plan = useMemo<UserPlan>(() => user?.plan || 'standard', [user]);
    const planNickname = useMemo(() => user?.planNickname || DEFAULT_PLAN_NICKNAMES[plan] || 'hobbyist', [user, plan]);

    const hasRole = (role: UserRole): boolean => roles.includes(role);
    const isAdmin = useMemo(() => roles.includes('su') || roles.includes('admin'), [roles]);
    const isSuperUser = useMemo(() => roles.includes('su'), [roles]);

    useEffect(() => {
        const unsubscribeAuth = onIdTokenChanged(auth, (fUser) => {
            setFirebaseUser(fUser);
            fUserRef.current = fUser;

            if (typeof userSyncRef.current === 'function') {
                userSyncRef.current();
                userSyncRef.current = null;
            }

            if (fUser) {
                const userDocRef = doc(db, 'users', fUser.uid);
                userSyncRef.current = onSnapshot(userDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const firestoreData = snapshot.data() as User;
                        const dataStr = JSON.stringify(firestoreData);

                        if (lastDataRef.current !== dataStr) {
                            lastDataRef.current = dataStr;
                            setUser(firestoreData);
                            setLoading(false);

                            fUser.getIdToken().then(idToken => {
                            });
                        }
                    } else {
                        fUser.getIdToken().then(async (idToken) => {
                            try {
                            } finally {
                                setLoading(false);
                            }
                        });
                    }
                }, (err) => {
                    console.error('[AuthContext] sync error:', err.message);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (userSyncRef.current) userSyncRef.current();
        };
    }, []);

    const signInWithGoogle = async () => {
        if (isSigningIn) return;
        setIsSigningIn(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } finally {
            setIsSigningIn(false);
        }
    };

    const signOut = async () => {
        if (userSyncRef.current) userSyncRef.current();
        await firebaseSignOut(auth);
        setUser(null);
    };

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        if (!fUserRef.current) return new Response(null, { status: 401 });
        const token = await fUserRef.current.getIdToken();
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(url, { ...options, headers });
    }, []);

    return (
        <AuthContext.Provider value={{
            user, firebaseUser, loading, isSigningIn, signInWithGoogle, signOut,
            roles, plan, planNickname, hasRole, isAdmin, isSuperUser, authFetch,
            signInWithMock: () => {}, signInWithEmail: async () => {}, signUpWithEmail: async () => {}
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
