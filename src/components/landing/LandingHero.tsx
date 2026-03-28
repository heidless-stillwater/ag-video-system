'use client';

import React from 'react';
import Image from 'next/image';

interface LandingHeroProps {
    onAuthClick: (mode: 'login' | 'signup') => void;
}

export function LandingHero({ onAuthClick }: LandingHeroProps) {
    return (
        <section className="relative w-full min-h-[100svh] lg:min-h-screen flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden bg-[#020617] text-white">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] lg:w-[1000px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-[300px] lg:w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Text Content */}
                <div className="flex-1 text-center lg:text-left space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-300">
                            Synthesis Studio // v2.0 Live
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.95] lg:leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">
                        DEPLOY YOUR <br />
                        <span className="theme-accent-text italic">NARRATIVE.</span>
                    </h1>

                    <p className="text-base md:text-xl text-slate-400 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        The world's first data-driven documentary engine. Transform complex research into cinematic experiences 
                        using custom-tuned Agent personas and frequency-optimized audio.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                        <button
                            onClick={() => onAuthClick('signup')}
                            className="group relative w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 text-xs sm:text-sm overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                START CREATING
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:translate-x-1 transition-transform">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </span>
                        </button>
                        <button
                            onClick={() => {/* Scroll to demo */}}
                            className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all active:scale-95 text-xs sm:text-sm"
                        >
                            WATCH SIMULATION
                        </button>
                    </div>

                    {/* Simple Trust Signal */}
                    <div className="pt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 opacity-30 grayscale contrast-125">
                        <span className="text-[10px] font-black tracking-widest">STRIPEO_NET</span>
                        <span className="text-[10px] font-black tracking-widest">FIREBASE_VAULT</span>
                        <span className="text-[10px] font-black tracking-widest">VERTEX_ENGINE</span>
                    </div>
                </div>

                {/* Hero Asset */}
                <div className="flex-1 w-full max-w-lg lg:max-w-none animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
                    <div className="relative aspect-square sm:aspect-video lg:aspect-square w-full">
                        {/* Decorative Rings */}
                        <div className="absolute inset-0 border border-white/5 rounded-full scale-110 animate-spin-slow pointer-events-none hidden lg:block"></div>
                        
                        {/* Main Image with Glassmorphism Wrapper */}
                        <div className="relative w-full h-full rounded-[32px] lg:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl p-2 bg-white/5 backdrop-blur-3xl">
                             <Image 
                                src="/assets/landing/hero.png" 
                                alt="Synthesis Studio Narrative Engine" 
                                fill
                                className="object-cover rounded-[24px] lg:rounded-[32px] opacity-90 transition-opacity hover:opacity-100"
                                priority
                            />
                        </div>

                        {/* Floating Micro-UI labels */}
                        <div className="absolute -top-3 -right-3 px-3 py-1.5 bg-indigo-600 text-[8px] sm:text-[10px] font-black tracking-widest rounded-lg shadow-xl animate-bounce-slow">
                            STUDIO_CORE
                        </div>
                        <div className="absolute -bottom-4 -left-4 px-4 py-3 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl hidden sm:block">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                </div>
                                <div className="pr-2">
                                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Synthesis Engine</div>
                                    <div className="text-[10px] font-bold tracking-tight">STUDIO_GRADE // 140 WPM</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent to-white"></div>
                <span className="text-[10px] font-bold tracking-widest rotate-90 origin-left mt-8">SCROLL</span>
            </div>
        </section>
    );
}
