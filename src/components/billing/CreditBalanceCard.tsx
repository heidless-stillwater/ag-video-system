'use client';

import React from 'react';
import { CreditCard, Plus, ArrowUpRight } from 'lucide-react';

interface CreditBalanceCardProps {
    balance: number;
    planTier: string;
    onBuyCredits: () => void;
}

export const CreditBalanceCard: React.FC<CreditBalanceCardProps> = ({ balance, planTier, onBuyCredits }) => {
    return (
        <div className="relative group overflow-hidden bg-slate-900/40 rounded-3xl border border-slate-800 p-8 backdrop-blur-2xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(79,70,229,0.15)]">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-500" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-400">
                        <div className="p-2 bg-slate-800/50 rounded-xl border border-slate-700">
                            <CreditCard className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-widest">Available Balance</span>
                    </div>
                    
                    <div className="flex items-end gap-3">
                        <span className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-xl">
                            {balance.toLocaleString()}
                        </span>
                        <span className="text-xl font-bold text-slate-500 mb-2">Credits</span>
                    </div>
                    
                    <div className="inline-flex items-center px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{planTier} Tier Multiplier Active</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    <button 
                        onClick={onBuyCredits}
                        className="group/btn relative px-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white shadow-lg shadow-indigo-600/20 transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        <Plus className="w-5 h-5" />
                        <span>Buy Credits</span>
                        <ArrowUpRight className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                    </button>
                    
                    <p className="text-center text-xs text-slate-500 font-medium">
                        Instant activation after purchase
                    </p>
                </div>
            </div>
            
            {/* Progress/Usage Indicator Simplified */}
            <div className="mt-8 pt-8 border-t border-slate-800/50 flex items-center justify-between text-sm">
                <div className="flex gap-6">
                    <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Action Cost</span>
                        <span className="text-white font-bold">~0.25cr / image</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Estimated Synthesis</span>
                        <span className="text-white font-bold">{(balance * 4).toLocaleString()} Images</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
