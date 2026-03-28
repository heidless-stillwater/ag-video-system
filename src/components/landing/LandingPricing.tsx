'use client';

import React from 'react';
import { PLAN_DEFINITIONS } from '@/lib/config/pricing';

interface LandingPricingProps {
    onAuthClick: (mode: 'login' | 'signup', planId?: string) => void;
}

export function LandingPricing({ onAuthClick }: LandingPricingProps) {
    const publicPlans = PLAN_DEFINITIONS.filter(p => p.isPublic);

    return (
        <section className="relative w-full py-32 bg-[#020617] overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white italic">
                        PRICING_TIERS.
                    </h2>
                    <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">
                        Flexible scaling for every creator level
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {publicPlans.map((plan) => (
                        <div 
                            key={plan.id}
                            className={`p-10 rounded-[40px] border transition-all flex flex-col relative group ${
                                plan.id === 'premium' 
                                    ? 'bg-indigo-600/10 border-indigo-500 shadow-2xl shadow-indigo-500/10' 
                                    : 'bg-white/[0.02] border-white/5'
                            }`}
                        >
                            {plan.id === 'premium' && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-[8px] font-black uppercase tracking-[0.2em] rounded-full text-white shadow-xl">
                                    MOST_POPULAR
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">
                                    {plan.displayName}
                                </h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-white">${plan.priceUsd}</span>
                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">/ MONTH</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10 flex-1">
                                {Object.entries(plan.features).map(([key, value]) => {
                                    if (typeof value === 'boolean' && !value) return null;
                                    
                                    let label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                                    if (typeof value === 'number') {
                                        label = `${value === -1 ? 'UNLIMITED' : value} ${label}`;
                                    }

                                    return (
                                        <div key={key} className="flex items-center gap-3 text-sm text-slate-300">
                                            <span className="text-indigo-400 font-black">✓</span>
                                            <span className={typeof value === 'boolean' ? '' : 'font-bold italic'}>{label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => onAuthClick('signup', plan.id)}
                                className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 text-xs ${
                                    plan.id === 'premium'
                                        ? 'bg-white text-indigo-950 hover:bg-slate-200'
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                SELECT_{plan.id.toUpperCase()}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
