'use client';

import React from 'react';

const TESTIMONIALS = [
    {
        name: "SARA_DOCS",
        role: "Historical Documentarian",
        quote: "The Agent Synthesis is unparalleled. It extracted 15 hours of archival records into a cohesive 10-minute script in seconds.",
        metric: "140% Reach Increase"
    },
    {
        name: "GARY_ED",
        role: "Technical Educator",
        quote: "Frequency-optimized audio was the game changer. My watch time doubled once I switched to the Studio's narration engine.",
        metric: "2x Retention"
    },
    {
        name: "PAUL_STORY",
        role: "Ambient Storyteller",
        quote: "I can deploy 5 narrations a day now. The 'Zero-to-Video' flow is actually three clicks. No exaggeration.",
        metric: "30h Saved/Week"
    }
];

export function TestimonialScroller() {
    return (
        <section className="relative w-full py-32 bg-[#020617] border-t border-white/5">
            <div className="container mx-auto px-6">
                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        Proven Deployment.
                    </h2>
                    <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">
                        Real-world creators // Synthetic results
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] hover:border-indigo-500/30 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center text-xs font-black text-indigo-400 border border-white/5">
                                    {t.name[0]}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white italic">{t.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.role}</p>
                                </div>
                            </div>
                            
                            <blockquote className="text-slate-400 text-sm leading-relaxed mb-6 italic">
                                "{t.quote}"
                            </blockquote>

                            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-indigo-500 tracking-widest uppercase">IMPACT_PROTOCOL</span>
                                <span className="text-sm font-black text-white">{t.metric}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
