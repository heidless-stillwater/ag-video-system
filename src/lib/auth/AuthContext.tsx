'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserSettings } from '@/types';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUser: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
            setFirebaseUser(fUser);

            if (fUser) {
                // Listen for real-time updates to the user profile
                const userDocRef = doc(db, 'users', fUser.uid);

                unsubscribeUser = onSnapshot(userDocRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setUser(snapshot.data() as User);
                        setLoading(false);
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

                        setUser(newUser);
                        setLoading(false);
                    }
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
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

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signOut }}>
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
