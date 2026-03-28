'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import { Zap, Plus, AlertCircle } from 'lucide-react';

export const CreditBadge: React.FC = () => {
    const { user, planNickname } = useAuth();
    
    if (!user) return null;

    const currentCredits = user.creditBalance ?? 0;
    const isLow = currentCredits < 10;
    const outOfCredits = currentCredits <= 0;

    return (
        <Link 
            href="/settings/billing"
            className={`flex items-center gap-3 px-4 py-1.5 rounded-2xl border transition-all duration-500 group relative overflow-hidden backdrop-blur-md
                ${outOfCredits 
                    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' 
                    : isLow 
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' 
                    : 'bg-indigo-500/5 border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/10'
                }`}
        >
            {/* Low Balance Pulse */}
            {(isLow || outOfCredits) && (
                <div className={`absolute inset-0 opacity-20 animate-pulse ${outOfCredits ? 'bg-red-500' : 'bg-amber-500'}`} />
            )}

            <div className="flex flex-col items-end leading-none relative z-10">
                <span className={`text-[9px] uppercase tracking-widest font-black mb-1
                    ${outOfCredits ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-indigo-400/80'}
                `}>
                    {planNickname}
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white tabular-nums">
                        {currentCredits.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">CR</span>
                </div>
            </div>
            
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 relative z-10
                ${outOfCredits 
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : isLow 
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                    : 'bg-indigo-600 text-white group-hover:bg-indigo-500 shadow-[0_4px_15px_rgba(79,70,229,0.3)]'
                }`}
            >
                {outOfCredits ? (
                    <AlertCircle className="w-4 h-4" />
                ) : (
                    <Plus className="w-4 h-4" />
                )}
            </div>
        </Link>
    );
};
