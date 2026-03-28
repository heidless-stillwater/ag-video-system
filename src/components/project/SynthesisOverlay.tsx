'use client';

import React, { useEffect, useState } from 'react';
import { Project, Script } from '@/types';
import { Microscope, Zap, Cpu, Sparkles, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface SynthesisOverlayProps {
    project: Project;
    script: Script | null;
    isGenerating: boolean;
    onCancel: () => void;
    onClose: () => void;
}

export const SynthesisOverlay: React.FC<SynthesisOverlayProps> = ({ project, script, isGenerating, onCancel, onClose }) => {
    const [scrambledText, setScrambledText] = useState('');
    const [progress, setProgress] = useState(0);

    const phrases = [
        "Analyzing narrative architecture...",
        "Synthesizing visual semantic layers...",
        "Evaluating cinematic depth...",
        "Calibrating high-fidelity rendering...",
        "Establishing aesthetic profiles...",
        "Optimizing neural imagery...",
        "Extracting visual artifacts...",
        "Hardening cinematic continuity..."
    ];

    useEffect(() => {
        if (!isGenerating) return;

        let frame = 0;
        const interval = setInterval(() => {
            frame++;
            const phrase = phrases[Math.floor(frame / 20) % phrases.length];
            setScrambledText(phrase);
            
            // Simulate progress if not real
            if (project.mediaProgress) {
                setProgress(project.mediaProgress);
            } else {
                setProgress(prev => Math.min(prev + 0.1, 99));
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isGenerating, project.mediaProgress]);

    if (!isGenerating) return null;

    const sections = script?.sections || [];
    const completedScenes = sections.reduce((acc, section) => {
        const scenesWithUrl = section.visualCues?.filter(cue => cue.url).length || 0;
        return acc + scenesWithUrl;
    }, 0);
    const totalScenes = sections.reduce((acc, section) => {
        return acc + (section.visualCues?.length || 0);
    }, 0);

    const progressPercent = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : progress;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
            {/* Dark immersive background */}
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl"></div>
            
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}></div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

            <div className="relative z-10 max-w-2xl w-full px-6 text-center">
                {/* Visual Icon Hexagon */}
                <div className="relative w-32 h-32 mx-auto mb-12">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] rotate-45 animate-spin-slow"></div>
                    <div className="absolute inset-0 bg-purple-500/20 rounded-[2rem] -rotate-45 animate-spin-slow-reverse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="h-[1px] w-8 bg-blue-500/50"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Synthesis Engine Active</span>
                        <span className="h-[1px] w-8 bg-blue-500/50"></span>
                    </div>
                    <h2 className="text-5xl font-black text-white tracking-tighter leading-none">
                        Materializing Vision
                    </h2>
                </div>

                <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl mb-12 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <ImageIcon className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Neural Assets</span>
                        </div>
                        <span className="text-2xl font-black text-white italic">{Math.round(progressPercent)}%</span>
                    </div>

                    {/* Progress Track */}
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden p-1 border border-white/5 mb-6">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 rounded-full transition-all duration-1000 relative"
                            style={{ width: `${progressPercent}%` }}
                        >
                            <div className="absolute inset-0 bg-[length:20px_20px] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Cpu className="w-3 h-3 animate-spin-slow" />
                            <p className="text-[11px] font-mono tracking-widest uppercase">
                                {scrambledText}
                            </p>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            {completedScenes} / {totalScenes} Scenes Generated
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={onClose}
                        className="group relative px-8 py-4 bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden active:scale-95 transition-all"
                    >
                        <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-blue-400 transition-colors">
                            Run in Background
                        </span>
                    </button>

                    <button
                        onClick={onCancel}
                        className="group relative px-8 py-4 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden active:scale-95 transition-all"
                    >
                        <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors"></div>
                        <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-red-400 transition-colors">
                            Abort Synthesis
                        </span>
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-slow-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(200%); }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
                .animate-spin-slow-reverse {
                    animation: spin-slow-reverse 15s linear infinite;
                }
                .animate-shimmer {
                    animation: shimmer 2s linear infinite;
                }
            `}</style>
        </div>
    );
};
