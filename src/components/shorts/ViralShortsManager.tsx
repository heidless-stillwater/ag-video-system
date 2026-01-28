'use client';

import React, { useState } from 'react';
import { ViralClip } from '@/types';

interface ViralShortsManagerProps {
    projectId: string;
    scriptId: string;
    shorts: ViralClip[];
    onGenerateCandidates: () => Promise<void>;
    onRenderShort: (clipId: string) => Promise<void>;
    isGenerating: boolean;
}

export const ViralShortsManager: React.FC<ViralShortsManagerProps> = ({
    projectId,
    scriptId,
    shorts,
    onGenerateCandidates,
    onRenderShort,
    isGenerating
}) => {
    const [localIsGenerating, setLocalIsGenerating] = useState(false);
    const [loadingClipID, setLoadingClipID] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLocalIsGenerating(true);
        try {
            await onGenerateCandidates();
        } finally {
            setLocalIsGenerating(false);
        }
    };

    const handleLaunchRender = async (clipId: string) => {
        setLoadingClipID(clipId);
        try {
            await onRenderShort(clipId);
        } catch (error) {
            console.error('Failed to launch short render:', error);
        } finally {
            setLoadingClipID(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📈</span>
                    <h3 className="font-bold text-xs uppercase tracking-widest text-emerald-400">Viral Shorts Engine</h3>
                </div>
                {shorts.length > 0 && (
                    <button
                        onClick={handleGenerate}
                        disabled={localIsGenerating || isGenerating}
                        className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest font-bold transition-colors"
                    >
                        {localIsGenerating ? 'Analyzing...' : '🔄 Re-analyze'}
                    </button>
                )}
            </div>

            {shorts.length === 0 ? (
                <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/20 rounded-xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <span className="text-3xl text-emerald-400">✨</span>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-emerald-300 font-bold text-sm">Discover Viral Moments</h4>
                        <p className="text-xs text-emerald-200/50 leading-relaxed px-4">Let Gemini analyze your documentary and identify the most engaging segments for YouTube Shorts.</p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={localIsGenerating || isGenerating}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 mx-auto"
                    >
                        {localIsGenerating ? (
                            <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Analyzing...</>
                        ) : (
                            <>🚀 Find Viral Clips</>
                        )}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {shorts.map((clip) => (
                        <div key={clip.id} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 transition-all hover:bg-slate-900 group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-xs font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{clip.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${clip.viralScore >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                            clip.viralScore >= 80 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                                'bg-slate-800 text-slate-400 border border-slate-700'
                                            }`}>
                                            Score: {clip.viralScore}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            {clip.estimatedDuration}s • Scenes {clip.startSceneIndex}-{clip.endSceneIndex}
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${clip.status === 'ready' ? 'bg-emerald-500' :
                                    clip.status === 'rendering' ? 'bg-amber-500 animate-pulse' :
                                        clip.status === 'failed' ? 'bg-red-500' :
                                            'bg-slate-700'
                                    }`} />
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">{clip.description}</p>

                            <div className="flex items-center gap-2 capitalize">
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Hook Type:</span>
                                <span className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-widest">{clip.hookType}</span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                                {clip.status === 'ready' ? (
                                    <a
                                        href={clip.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest text-center transition-all shadow-lg shadow-emerald-900/20"
                                    >
                                        Download Short
                                    </a>
                                ) : (
                                    <button
                                        onClick={() => handleLaunchRender(clip.id)}
                                        disabled={clip.status === 'rendering' || loadingClipID === clip.id}
                                        className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${clip.status === 'rendering' || loadingClipID === clip.id
                                            ? 'bg-slate-800 text-slate-500 cursor-wait'
                                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-emerald-500/30'
                                            }`}
                                    >
                                        {clip.status === 'rendering' || loadingClipID === clip.id ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                {clip.status === 'rendering' ? `Baking... ${clip.renderProgress}%` : 'Starting...'}
                                            </div>
                                        ) : clip.status === 'failed' ? 'Retry Render' : '🚀 Launch Short'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
