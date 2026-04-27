'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icons';

interface LandingHeroProps {
    onAuthClick: (mode: 'login' | 'signup') => void;
}

export function LandingHero({ onAuthClick }: LandingHeroProps) {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-12 px-6 overflow-hidden bg-[#0a0a0f]">
            {/* Background — replicates PromptTool hero treatment */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/assets/landing/hero-anatomy.png"
                    alt="Synthesis Engine Anatomy"
                    fill
                    className="object-cover opacity-20 mix-blend-luminosity scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left Content */}
                <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Powered by Synthesis Core v4.2</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white">
                        Deploy your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500">Narrative</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-xl font-medium leading-relaxed">
                        Transform complex research into cinematic sleep documentaries. Deploy custom-tuned agents, 
                        frequency-optimized audio, and data-driven visuals at scale.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                        <Button
                            onClick={() => onAuthClick('signup')}
                            size="lg"
                            className="h-16 px-12 group relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-2xl shadow-indigo-500/20"
                        >
                            <span className="relative z-10 flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                                Start Your Mission
                                <Icons.arrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40 text-white">Researcher Friendly • Producer Driven</p>
                    </div>
                </div>

                {/* Right: Anatomy Card */}
                <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
                    <Card variant="glass" className="p-8 rounded-[3rem] border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-2xl backdrop-glow">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-lg group">
                            <Image 
                                src="/assets/landing/hero-anatomy.png" 
                                alt="Engine Anatomy" 
                                fill
                                priority
                                className="object-cover group-hover:scale-105 transition-transform duration-1000" 
                            />
                            <div className="absolute inset-0 bg-indigo-500/10 group-hover:bg-transparent transition-colors duration-500" />
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Anatomy of a Synthesis</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-[#0a0a0f]/80 border border-white/5 font-mono text-xs leading-relaxed group hover:border-indigo-500/50 transition-colors">
                                    <p className="text-white/40 mb-1 font-bold uppercase tracking-tighter text-[9px]">Narrative Sequence</p>
                                    <span className="text-indigo-400">Audio:</span> 140 WPM Synthesis, <span className="text-purple-400">Visuals:</span> 4K Procedural, <span className="text-rose-400">Duration:</span> 120min Optimized...
                                </div>
                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between group cursor-pointer hover:bg-indigo-500/10 transition-all">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Simulation Status</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">&quot;Deep sleep induction protocols active&quot;</p>
                                    </div>
                                    <Icons.play className="text-indigo-500 w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </Card>
                    
                    {/* Floating Decorative Elements */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                </div>
            </div>

            <style jsx>{`
                .backdrop-glow {
                    position: relative;
                }
                .backdrop-glow::after {
                    content: '';
                    position: absolute;
                    inset: -20px;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
                    opacity: 0.1;
                    z-index: -1;
                    filter: blur(40px);
                }
            `}</style>
        </section>
    );
}
