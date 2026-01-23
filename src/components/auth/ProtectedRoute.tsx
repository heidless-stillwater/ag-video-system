'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthButton } from './AuthButton';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-medium">Loading session...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border border-gray-800 rounded-3xl bg-gray-900/50 backdrop-blur-sm">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Protected Resource</h2>
                <p className="text-gray-400 mb-8 text-center max-w-sm">
                    Please sign in to access the VideoSystem generator and manage your projects.
                </p>
                <AuthButton />
            </div>
        );
    }

    return <>{children}</>;
}
