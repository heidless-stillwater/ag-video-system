import React, { useState } from 'react';
import { ScriptSection } from '@/types';
import { VOICE_PROFILES } from '@/lib/constants';

interface SectionMasteringRowProps {
    section: ScriptSection;
    index: number;
    selectedVoice: string;
    onVoiceChange: (voice: string) => void;

    // Playback state
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;

    // Playback controls
    onPlayPause: () => void;
    onStop: () => void;
    onRewind: () => void;

    // Actions
    onRegenerate: () => void;
    isGenerating: boolean;
    isGlobalGenerating: boolean;
    isMediaGenerating: boolean;
}

export const SectionMasteringRow: React.FC<SectionMasteringRowProps> = ({
    section,
    index,
    selectedVoice,
    onVoiceChange,
    isPlaying,
    isPaused,
    progress,
    onPlayPause,
    onStop,
    onRewind,
    onRegenerate,
    isGenerating,
    isGlobalGenerating,
    isMediaGenerating
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:bg-slate-900/60 transition-all group/line">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Info & Controls */}
                <div className="lg:w-72 shrink-0 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-400/10 px-2 py-0.5 rounded">
                            Line {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${section.audioUrl ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-500 animate-pulse'
                                }`}></span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                {section.audioUrl ? 'Ready' : 'Pending'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Voice Selection for this line */}
                        <div className="relative">
                            <select
                                value={selectedVoice}
                                onChange={(e) => onVoiceChange(e.target.value)}
                                className="w-full bg-[#161b22] border border-white/5 text-[10px] font-bold text-white rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer appearance-none"
                            >
                                {VOICE_PROFILES.map(p => (
                                    <option key={p.id} value={p.id} className="bg-[#0d1117] text-white">{p.label} Voice</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={onRewind}
                                disabled={!isPlaying}
                                className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-xl text-xs transition-all flex items-center justify-center border border-white/5"
                                title="Rewind"
                            >
                                ⏪
                            </button>
                            <button
                                onClick={onPlayPause}
                                disabled={!section.audioUrl}
                                className={`col-span-1 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center border border-white/5 ${isPlaying && !isPaused ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 text-sm' : 'bg-slate-800 text-white hover:bg-slate-700'
                                    }`}
                            >
                                {isPlaying && !isPaused ? '⏸️' : '▶️'}
                            </button>
                            <button
                                onClick={onStop}
                                disabled={!isPlaying}
                                className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-xl text-xs transition-all flex items-center justify-center border border-white/5"
                                title="Stop"
                            >
                                ⏹️
                            </button>
                            <button
                                onClick={onRegenerate}
                                disabled={isGlobalGenerating}
                                className={`p-2.5 rounded-xl text-xs transition-all flex items-center justify-center border border-white/5 ${isGenerating ? 'bg-purple-600/50' : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20'
                                    }`}
                                title="Regenerate"
                            >
                                {isGenerating ? (
                                    <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    '🔄'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isPlaying && (
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 transition-all duration-100 ease-linear"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                <div className="text-[9px] text-slate-500 font-mono text-center uppercase tracking-widest">
                    {section.wordCount} Words • {section.estimatedDuration}s
                </div>
            </div>

            {/* Right: Content Preview */}
            <div className="flex-1 relative">
                <p 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`text-sm text-slate-400 leading-relaxed italic transition-all cursor-pointer hover:text-slate-300 ${isExpanded ? '' : 'line-clamp-3'}`}
                >
                    "{section.content}"
                </p>

                {/* Visual Cue Indicator */}
                {section.visualCues && section.visualCues.length > 0 ? (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {section.visualCues.map((cue, cIdx) => (
                            <div
                                key={cue.id}
                                className="relative group/cue shrink-0"
                            >
                                {cue.url ? (
                                    <div
                                        className="w-24 aspect-video rounded-lg overflow-hidden border border-white/10 relative bg-slate-800"
                                        title={`${cue.description} (ID: ${cue.id}, Status: ${cue.status})`}
                                    >
                                        {cue.type === 'video' ? (
                                            <video 
                                                src={cue.videoUrl || cue.url}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/cue:scale-105"
                                                muted
                                                playsInline
                                                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                        ) : (
                                            <img
                                                src={cue.url}
                                                alt={cue.description}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/cue:scale-110"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement?.classList.add('border-red-500');
                                                }}
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cue:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[8px] font-bold text-white uppercase tracking-wider">Cue {cIdx + 1}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`w-24 aspect-video rounded-lg flex flex-col items-center justify-center text-[10px] gap-1 transition-all ${isMediaGenerating
                                            ? 'bg-teal-500/10 border border-teal-500/20 grayscale opacity-50'
                                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                            }`}
                                        title={`${cue.description} (Status: Pending/Failed)`}
                                    >
                                        {isMediaGenerating ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>⚠️</span>
                                                <span className="text-[8px] font-bold uppercase tracking-widest">Failed</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : isMediaGenerating ? (
                    <div className="mt-4 p-4 border border-purple-500/20 bg-purple-500/5 rounded-xl flex items-center justify-center gap-3 animate-pulse">
                        <span className="w-4 h-4 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></span>
                        <span className="text-xs font-bold text-purple-300">Imagining scenes...</span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
