'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { EnvironmentMode } from '@/lib/config/environment';
import { useEnvironmentContext } from '@/lib/contexts/EnvironmentContext';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { RequireRole } from '@/components/auth/RequireRole';
import { CreditBadge } from '@/components/billing/CreditBadge';
import { ThemeSelector } from './ThemeSelector';
import { SuiteSwitcher } from './SuiteSwitcher';

interface HeaderProps {
    initialMode?: EnvironmentMode;
}

const modeColors: Record<EnvironmentMode, string> = {
    DEV: 'bg-emerald-500',
    STAGING: 'bg-amber-500',
    STAGING_LIMITED: 'bg-yellow-500',
    PRODUCTION: 'bg-rose-500',
};

export const Header = ({ initialMode }: HeaderProps) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { mode: currentMode, setMode } = useEnvironmentContext();
    
    // Use state to track the mode for the selector buttons to bridge between cookie and hook update
    const [selectedMode, setSelectedMode] = useState<EnvironmentMode>(initialMode || 'DEV');

    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (currentMode) {
            setSelectedMode(currentMode);
        }
    }, [currentMode]);

    const setEnvMode = (newMode: EnvironmentMode) => {
        if (newMode === selectedMode) return;
        
        setIsTransitioning(true);
        setSelectedMode(newMode);
        
        // Use context to update global state and cookie
        setMode(newMode);
        
        // Refresh server components
        router.refresh();
        
        setTimeout(() => {
            setIsTransitioning(false);
        }, 800);
    };

    // Hide header on landing page for unauthenticated users
    if (pathname === '/' && !user && !loading) {
        return null;
    }

    return (
        <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/5 backdrop-blur-xl bg-[var(--background)]/60 z-[90] transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex items-center justify-between h-full">
                    
                    {/* Brand / Logo Area (Matches Dashboard style) */}
                    <div className="flex items-center gap-6">
                        <SuiteSwitcher />
                        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                <span className="text-xl">🎬</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white leading-none tracking-tight">VideoSystem</h1>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-tight uppercase">Sleep Documentary Generator</p>
                            </div>
                        </Link>
                    </div>

                    {/* Right Side Actions / Controls */}
                    <div className="flex items-center gap-4">
                        {/* Advanced Tools Group - Only show if logged in */}
                        {user && !loading && (
                            <>
                                {/* Environment Mode Buttons (Matches Dashboard style) */}
                                <div className="relative overflow-hidden hidden lg:flex bg-slate-800 rounded-lg p-1 border border-white/5 shadow-inner min-w-[300px]">
                                    {isTransitioning && (
                                        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-10 animate-in fade-in duration-300">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></div>
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            </div>
                                        </div>
                                    )}
                                    {(['DEV', 'STAGING', 'STAGING_LIMITED', 'PRODUCTION'] as EnvironmentMode[]).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setEnvMode(mode)}
                                            disabled={isTransitioning}
                                            className={`relative z-0 px-3 py-1 flex-1 text-[11px] font-black uppercase tracking-wider rounded-md transition-all ${selectedMode === mode
                                                ? `${modeColors[mode]} text-white shadow-lg`
                                                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/30'
                                            }`}
                                        >
                                            {mode === 'STAGING_LIMITED' ? 'LIMIT AI' : mode}
                                        </button>
                                    ))}
                                </div>
                                {/* Theme Selector */}
                                <ThemeSelector />
                            </>
                        )}

                        <div className="flex items-center gap-2">
                            <CreditBadge />
                            
                            {user && (
                                <>
                                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                                    {/* System Status / Health */}
                                    <Link
                                        href="/dashboard/health"
                                        className={`p-2 transition-colors ${pathname === '/dashboard/health' ? 'text-green-400' : 'text-slate-400 hover:text-green-400'}`}
                                        title="System Health"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </Link>
                                </>
                            )}

                            <div className="h-6 w-px bg-white/10 mx-1"></div>

                            <AuthButton />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
