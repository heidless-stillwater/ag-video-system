'use client';

import React from 'react';

interface LandingIncentiveProps {
    onAuthClick: (mode: 'login' | 'signup') => void;
}

export function LandingIncentive({ onAuthClick }: LandingIncentiveProps) {
    return (
        <section className="relative w-full py-32 bg-[#020617] overflow-hidden">
             {/* Decorative Background Elements */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto p-12 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-white/10 backdrop-blur-3xl rounded-[48px] shadow-2xl overflow-hidden relative group">
                    {/* Animated Beam Effect */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-shimmer"></div>

                    <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                        <div className="w-24 h-24 flex-shrink-0 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-indigo-500/10">
                            🌟
                        </div>
                        <div className="flex-1 space-y-4">
                            <h3 className="text-3xl md:text-3xl font-black uppercase tracking-tight text-white italic">
                                UNLOCK THE ELITE <br />
                                PERSONA LIBRARY.
                            </h3>
                            <p className="text-slate-400 font-medium leading-relaxed max-w-lg italic">
                                Access our full studio roster for 7 days. Perfect your brand's voice with 
                                Sara, Gary, and Paul — our master-tuned research agents.
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest rounded-full uppercase">
                                EARLY_ACCESS_PROTOCOL
                            </div>
                        </div>
                        <button
                            onClick={() => onAuthClick('signup')}
                            className="px-10 py-5 bg-white text-indigo-950 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-xs shadow-2xl shadow-white/10"
                        >
                            START_FREE_SESSION
                        </button>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite linear;
                }
            `}</style>
        </section>
    );
}
