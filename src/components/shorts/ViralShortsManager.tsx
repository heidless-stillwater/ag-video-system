'use client';

import React, { useState } from 'react';
import { ViralClip } from '@/types';

interface ViralShortsManagerProps {
    projectId: string;
    scriptId: string;
    script: any;
    shorts: ViralClip[];
    onGenerateCandidates: () => Promise<void>;
    onRenderShort: (clipId: string) => Promise<void>;
    isGenerating: boolean;
}

export const ViralShortsManager: React.FC<ViralShortsManagerProps> = ({
    projectId,
    scriptId,
    script,
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
                <div className="space-y-4">
                    {shorts.map((clip) => (
                        <ViralShortCard 
                            key={clip.id} 
                            clip={clip} 
                            onLaunchRender={handleLaunchRender} 
                            isLoading={loadingClipID === clip.id}
                            script={script}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface ViralShortCardProps {
    clip: ViralClip;
    onLaunchRender: (id: string) => Promise<void>;
    isLoading: boolean;
    script: any;
}

const ViralShortCard: React.FC<ViralShortCardProps> = ({ clip, onLaunchRender, isLoading, script }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const posterUrl = React.useMemo(() => {
        if (!script || !script.sections) return '';
        const section = script.sections[clip.startSceneIndex];
        if (!section || !section.visualCues || !section.visualCues[0]) return '';
        return section.visualCues[0].url || '';
    }, [script, clip.startSceneIndex]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (videoRef.current && clip.status === 'ready') {
            videoRef.current.play().catch(e => console.warn('Preview play blocked:', e));
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0.1;
        }
    };

    return (
        <div 
            className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden transition-all hover:bg-slate-900 group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex gap-4 p-4">
                {/* 9:16 Preview Thumbnail */}
                <div className="relative w-24 aspect-[9/16] bg-black rounded-lg overflow-hidden border border-white/5 shadow-2xl flex-shrink-0">
                    {clip.status === 'ready' && clip.downloadUrl ? (
                        <video
                            ref={videoRef}
                            src={clip.downloadUrl}
                            poster={posterUrl}
                            className="w-full h-full object-cover transition-opacity duration-300"
                            style={{ opacity: isHovered ? 1 : 0.8 }}
                            muted
                            playsInline
                            loop
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                                (e.target as HTMLVideoElement).currentTime = 0.1;
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/50 relative">
                            {posterUrl ? (
                                <>
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity" 
                                        style={{ backgroundImage: `url(${posterUrl})` }} 
                                    />
                                    {clip.status === 'rendering' ? (
                                        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin z-10" />
                                    ) : (
                                        <div className="z-10 bg-black/60 p-2 rounded-full border border-white/20">
                                            <span className="text-xl opacity-60">📱</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                clip.status === 'rendering' ? (
                                    <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                                ) : (
                                    <span className="text-xl opacity-20">📱</span>
                                )
                            )}
                        </div>
                    )}
                    
                    {/* Status Badge on Thumbnail */}
                    <div className="absolute top-1.5 right-1.5">
                        <div className={`w-2 h-2 rounded-full shadow-sm ${
                            clip.status === 'ready' ? 'bg-emerald-500' :
                            clip.status === 'rendering' ? 'bg-amber-500 animate-pulse' :
                            clip.status === 'failed' ? 'bg-red-500' :
                            'bg-slate-700'
                        }`} />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 text-xs font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                        <h4 className="truncate">{clip.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            clip.viralScore >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            clip.viralScore >= 80 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                            Score: {clip.viralScore}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {clip.estimatedDuration}s
                        </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight mb-3 line-clamp-2">{clip.description}</p>

                    <div className="flex items-center gap-2 capitalize mb-4">
                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Hook:</span>
                        <span className="text-[8px] text-emerald-500/80 font-bold uppercase tracking-widest">{clip.hookType}</span>
                    </div>

                    <div className="flex gap-2">
                        {clip.status === 'ready' ? (
                            <button
                                onClick={async () => {
                                    if (!clip.downloadUrl) return;
                                    try {
                                        const response = await fetch(clip.downloadUrl);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${clip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-short.mp4`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    } catch (err) {
                                        console.error('Download failed, falling back:', err);
                                        window.open(clip.downloadUrl, '_blank');
                                    }
                                }}
                                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest text-center transition-all shadow-lg shadow-emerald-900/20"
                            >
                                Download
                            </button>
                        ) : (
                            <button
                                onClick={() => onLaunchRender(clip.id)}
                                disabled={clip.status === 'rendering' || isLoading}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                    clip.status === 'rendering' || isLoading
                                    ? 'bg-slate-800 text-slate-500 cursor-wait'
                                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-emerald-500/30'
                                }`}
                            >
                                {clip.status === 'rendering' || isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        {clip.status === 'rendering' ? `${clip.renderProgress}%` : '...'}
                                    </div>
                                ) : clip.status === 'failed' ? 'Retry' : '🚀 Launch'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
