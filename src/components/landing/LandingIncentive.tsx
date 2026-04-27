'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LandingIncentiveProps {
    onAuthClick: (mode: 'login' | 'signup') => void;
}

export function LandingIncentive({ onAuthClick }: LandingIncentiveProps) {
    return (
        <section className="py-32 px-6 bg-[#0a0a0f]">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Member <span className="text-indigo-500">Privileges</span></h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Join the collective and claim your starter kit</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Standard Rewards */}
                    <Card variant="glass" className="p-8 rounded-[2.5rem] border-white/5 bg-white/[0.01] transition-all hover:bg-white/[0.03]">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl mb-6">🪙</div>
                        <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-white">Welcome Kit</h3>
                        <p className="text-[10px] text-slate-400 font-medium mb-4">Start with 500 synthesis credits and a 24h Producer Pass to all premium assets.</p>
                        <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                    </Card>

                    {/* Knowledge Bounty */}
                    <Card variant="glass" className="p-8 rounded-[2.5rem] border-indigo-500/20 bg-indigo-500/5 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl mb-6">🚀</div>
                        <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-indigo-500">Curator Bounty</h3>
                        <p className="text-[10px] text-white/70 font-medium mb-4">Earn 50 credits every time the community clones your narrative blueprints.</p>
                        <div className="h-1 w-8 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    </Card>

                    {/* Status */}
                    <Card variant="glass" className="p-8 rounded-[2.5rem] border-white/5 bg-white/[0.01] transition-all hover:bg-white/[0.03]">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-2xl mb-6">🎖️</div>
                        <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-white">Vanguard Status</h3>
                        <p className="text-[10px] text-slate-400 font-medium mb-4">Expert contributors gain access to the Synthesis Badge and priority queue processing.</p>
                        <div className="h-1 w-8 bg-purple-500 rounded-full" />
                    </Card>
                </div>

                <div className="mt-16 text-center">
                    <Button
                        onClick={() => onAuthClick('signup')}
                        size="lg"
                        className="h-16 px-16 bg-white text-black hover:bg-slate-200 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-white/10 border-none"
                    >
                        Join the Collective
                    </Button>
                </div>
            </div>
        </section>
    );
}
