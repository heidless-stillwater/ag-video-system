'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export function AuthButton() {
    const { user, loading, signInWithGoogle, signOut } = useAuth();

    if (loading) {
        return (
            <div className="h-10 w-24 bg-gray-800 animate-pulse rounded-full"></div>
        );
    }

    const handleDisconnectYouTube = async () => {
        if (!user) return;
        if (!confirm('Are you sure you want to disconnect your YouTube channel?')) return;

        try {
            const response = await fetch('/api/auth/youtube/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id })
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect YouTube');
            }
            // User state will update automatically via AuthContext onSnapshot
        } catch (error) {
            console.error('Error disconnecting YouTube:', error);
            alert('Failed to disconnect. Please try again.');
        }
    };

    if (user) {
        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-8 h-8 rounded-full border border-blue-500/30"
                        />
                    )}
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-white line-clamp-1">{user.displayName}</p>
                        {user.settings.youtubeConnected ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-red-500">
                                    <span className="text-[10px]">📺</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tight max-w-[80px] truncate">
                                        {user.youtubeChannelInfo?.title || 'Linked'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleDisconnectYouTube}
                                    className="text-[10px] text-gray-500 hover:text-white transition-colors"
                                    title="Disconnect YouTube"
                                >
                                    (Disconnect)
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 truncate max-w-[150px]">{user.email}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={signOut}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-all border border-gray-700"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all shadow-lg shadow-blue-500/20"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                    fill="currentColor"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                />
                <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
            </svg>
            Sign in with Google
        </button>
    );
}
