'use client';

import React from 'react';
import { Icons } from '@/components/ui/Icons'; // Assuming Icons exists or making a placeholder
import { useAuth } from '@/lib/auth/AuthContext';

interface LandingNavProps {
    onAuthClick: (mode: 'login' | 'signup') => void;
}

export function LandingNav({ onAuthClick }: LandingNavProps) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                        <span className="text-xl">🎬</span>
                    </div>
                    <span className="text-xl font-black uppercase tracking-tighter text-white">
                        Synthesis <span className="text-indigo-500">Studio</span>
                    </span>
                </div>
                
                <button
                    onClick={() => onAuthClick('login')}
                    className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/5"
                >
                    Operator Login
                </button>
            </div>
        </nav>
    );
}
