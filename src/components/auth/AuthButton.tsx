'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { InlineConfirmButton } from '@/components/ui/InlineConfirmButton';
import { AuthModal } from './AuthModal';
import { UserAvatar } from '@/components/common/UserAvatar';

export function AuthButton() {
    const { user, loading, signOut } = useAuth();
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'login' | 'signup'>('login');

    const openAuth = (mode: 'login' | 'signup') => {
        setModalMode(mode);
        setIsAuthModalOpen(true);
    };

    if (loading) {
        return (
            <div className="h-10 w-24 bg-gray-800 animate-pulse rounded-full"></div>
        );
    }

    const handleDisconnectYouTube = async () => {
        if (!user) return;
        setIsDisconnecting(true);

        try {
            const response = await fetch('/api/auth/youtube/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id })
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect YouTube');
            }
        } catch (error) {
            console.error('Error disconnecting YouTube:', error);
            alert('Failed to disconnect. Please try again.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    if (user) {
        return (
            <div className="flex items-center gap-4">
                <Link href="/settings" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
                    <UserAvatar 
                        user={user} 
                        size="sm" 
                        className="border border-blue-500/30 group-hover:border-blue-500 transition-colors" 
                    />
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{user.displayName}</p>
                        {user.settings.youtubeConnected ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-red-500">
                                    <span className="text-[10px]">📺</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tight max-w-[80px] truncate">
                                        {user.youtubeChannelInfo?.title || 'Linked'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 truncate max-w-[150px]">{user.email}</p>
                        )}
                    </div>
                </Link>

                {user.settings.youtubeConnected && (
                    <InlineConfirmButton
                        label="(Disconnect)"
                        confirmLabel="Confirm"
                        onConfirm={handleDisconnectYouTube}
                        isLoading={isDisconnecting}
                        className="text-[10px] text-gray-400 hover:text-white transition-colors underline decoration-dotted underline-offset-2"
                    />
                )}

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
        <div className="flex items-center gap-2">
            {process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true' && (
                <button
                    onClick={() => {
                        localStorage.setItem('video_system_mock_session', 'true');
                        window.location.reload();
                    }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-xs font-medium border border-gray-700 transition-all"
                >
                    Mock Login
                </button>
            )}
            <button
                onClick={() => openAuth('login')}
                className="px-5 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
            >
                Sign In
            </button>
            <button
                onClick={() => openAuth('signup')}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
            >
                Sign Up
            </button>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                initialMode={modalMode}
            />
        </div>
    );
}
