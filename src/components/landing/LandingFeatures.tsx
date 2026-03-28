'use client';

import React from 'react';

const FEATURE_NOV_PATH = [
    { title: "TOPIC_TO_VIDEO", desc: "Synthesize full documentaries from a single prompt.", icon: "🌌" },
    { title: "SMART_AGENTS", desc: "AI personas that handle research and scripting.", icon: "🧠" },
    { title: "AUTOPILOT_RENDER", desc: "One-click generation with cloud-native rendering.", icon: "⚡" },
];

const FEATURE_MST_PATH = [
    { title: "PERSONA_TUNING", desc: "Configure high-fidelity research agents and tone.", icon: "🎚️" },
    { title: "SEO_TELEMETRY", desc: "Built-in keyword density and audience capture tools.", icon: "🛰️" },
    { title: "AUDIO_FREQUENCIES", desc: "Optimize WPM and BPM for maximum retention.", icon: "🎙️" },
];

export function LandingFeatures() {
    return (
        <section className="relative w-full py-20 lg:py-32 bg-[#020617] text-white">
            <div className="container mx-auto px-6">
                <div className="max-w-3xl mb-16 lg:mb-24">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                        CHOOSE YOUR <br />
                        <span className="italic">NARRATIVE PATH.</span>
                    </h2>
                    <p className="text-slate-400 font-medium text-lg leading-relaxed">
                        Whether you're a first-time creator or a studio master, 
                        the Synthesis Studio scales with your vision.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Novice Path */}
                    <div className="p-6 sm:p-10 bg-white/[0.02] border border-white/5 rounded-[32px] lg:rounded-[40px] hover:bg-white/[0.05] transition-all lg:hover:-translate-y-2 group">
                        <div className="mb-8 flex items-center justify-between">
                            <h3 className="text-xl font-black tracking-widest uppercase text-indigo-400">NOVICE_FLOW</h3>
                            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-widest rounded-full uppercase">FOR_EASE</span>
                        </div>
                        <div className="space-y-8">
                            {FEATURE_NOV_PATH.map((feature, i) => (
                                <div key={i} className="flex gap-6 items-start">
                                    <div className="w-12 h-12 flex-shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl">
                                        {feature.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-md font-bold italic tracking-tight uppercase">{feature.title}</h4>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Master Path */}
                    <div className="p-6 sm:p-10 bg-white/[0.03] border border-white/10 rounded-[32px] lg:rounded-[40px] hover:bg-white/[0.08] transition-all lg:hover:-translate-y-2 group shadow-2xl shadow-indigo-500/5">
                        <div className="mb-8 flex items-center justify-between">
                            <h3 className="text-xl font-black tracking-widest uppercase theme-accent-text">MASTER_ENGINE</h3>
                            <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest rounded-full uppercase">FOR_PROS</span>
                        </div>
                        <div className="space-y-8">
                            {FEATURE_MST_PATH.map((feature, i) => (
                                <div key={i} className="flex gap-6 items-start">
                                    <div className="w-12 h-12 flex-shrink-0 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl">
                                        {feature.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-md font-bold italic tracking-tight uppercase text-white">{feature.title}</h4>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed italic">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
