'use client';

import React from 'react';
import { CreditPack } from '@/types';
import { Zap, ArrowRight, Percent, Sparkles, TrendingUp } from 'lucide-react';

interface CreditPackCardsProps {
    packs: CreditPack[];
    onPurchase: (packId: string) => void;
    isLoading?: string | null;
}

const BADGE_MAP: Record<string, { label: string, icon: any }> = {
    'pack_100': { label: 'Starter', icon: Zap },
    'pack_300': { label: 'Popular', icon: Sparkles },
    'pack_750': { label: 'Best Value', icon: TrendingUp },
};

export const CreditPackCards: React.FC<CreditPackCardsProps> = ({ 
    packs, 
    onPurchase,
    isLoading = null 
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packs.map((pack) => {
                const Badge = BADGE_MAP[pack.id] || { label: 'Pack', icon: Zap };
                const Icon = Badge.icon;
                const isPopular = pack.id === 'pack_300';
                
                return (
                    <div 
                        key={pack.id} 
                        className={`relative group rounded-3xl p-8 border transition-all duration-500 flex flex-col items-center text-center ${
                            isPopular 
                            ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)] scale-105 z-10' 
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        {isPopular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                                Recommended
                            </div>
                        )}

                        <div className={`p-4 rounded-2xl mb-6 ${
                            isPopular ? 'bg-white/10 text-white' : 'bg-slate-800 text-indigo-400'
                        }`}>
                            <Icon className="w-8 h-8" />
                        </div>

                        <div className="space-y-1 mb-8">
                            <h3 className={`text-4xl font-black tabular-nums tracking-tighter ${
                                isPopular ? 'text-white' : 'text-white'
                            }`}>
                                {pack.credits.toLocaleString()}
                            </h3>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                isPopular ? 'text-indigo-200' : 'text-slate-500'
                            }`}>
                                Credits Strategy
                            </p>
                        </div>

                        <div className="mt-auto w-full space-y-6">
                            <div className="flex flex-col items-center">
                                <span className={`text-2xl font-black ${
                                    isPopular ? 'text-white' : 'text-slate-200'
                                }`}>
                                    ${pack.priceUsd}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                    isPopular ? 'text-indigo-300' : 'text-slate-600'
                                }`}>
                                    One-time investment
                                </span>
                            </div>

                            <button
                                onClick={() => onPurchase(pack.id)}
                                disabled={isLoading === pack.id}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 group/btn ${
                                    isPopular 
                                    ? 'bg-white text-indigo-600 hover:bg-slate-100' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                } ${isLoading === pack.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isLoading === pack.id ? 'Authorizing...' : 'Acquire Credits'}
                                {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />}
                            </button>
                        </div>

                        {!isPopular && pack.id === 'pack_750' && (
                            <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                <Percent className="w-3 h-3" />
                                <span>Bulk efficiency active</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
