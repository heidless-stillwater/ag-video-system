'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project, Script, ScriptSection } from '@/types';

interface MasteringBoothProps {
    project: Project;
    script: Script;
    onRegenerateLine: (sectionId: string, voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onRegenerateAll: (voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    isGenerating: boolean;
    generatingId?: string | null;
}

export const MasteringBooth: React.FC<MasteringBoothProps> = ({
    project,
    script,
    onRegenerateLine,
    onRegenerateAll,
    onUpdateVoiceProfile,
    isGenerating,
    generatingId
}) => {
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [auditioningProfile, setAuditioningProfile] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedVoices, setSelectedVoices] = useState<Record<string, Project['voiceProfile']>>({});
    const [globalSelectedVoice, setGlobalSelectedVoice] = useState<Project['voiceProfile']>(project.voiceProfile || 'standard');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Clean up audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlayPause = (sectionId: string, url: string) => {
        if (playingId === sectionId) {
            if (isPaused) {
                audioRef.current?.play();
                setIsPaused(false);
            } else {
                audioRef.current?.pause();
                setIsPaused(true);
            }
        } else {
            // Stop current if any
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audioRef.current = audio;
            setPlayingId(sectionId);
            setIsPaused(false);
            setProgress(0);

            audio.addEventListener('timeupdate', () => {
                const p = (audio.currentTime / audio.duration) * 100;
                setProgress(p);
            });

            audio.addEventListener('ended', () => {
                setPlayingId(null);
                setIsPaused(false);
                setProgress(0);
            });

            audio.play();
        }
    };

    const handleRegenerateLine = (sectionId: string) => {
        handleStop();
        onRegenerateLine(sectionId, selectedVoices[sectionId] || project.voiceProfile || 'standard');
    };

    const handleRegenerateAll = () => {
        handleStop();
        onRegenerateAll(globalSelectedVoice);
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlayingId(null);
            setIsPaused(false);
            setProgress(0);
        }
    };

    const handleRewind = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            setProgress(0);
            if (isPaused) {
                audioRef.current.play();
                setIsPaused(false);
            }
        }
    };

    const handleAudition = async (profileId: string) => {
        if (auditioningProfile === profileId) {
            if (audioRef.current) {
                audioRef.current.pause();
                setAuditioningProfile(null);
            }
            return;
        }

        setAuditioningProfile(profileId);
        try {
            // Stop any current playback
            if (audioRef.current) {
                audioRef.current.pause();
                setPlayingId(null);
            }

            const response = await fetch('/api/tts/sample', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voiceProfile: profileId,
                    languageCode: script.languageCode || 'en-US'
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch voice sample');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.addEventListener('ended', () => {
                setAuditioningProfile(null);
                URL.revokeObjectURL(url);
            });

            audio.play();

        } catch (err) {
            console.error('Audition error:', err);
            setAuditioningProfile(null);
        }
    };

    const VOICE_PROFILES = [
        { id: 'standard', label: 'Standard', desc: 'Balanced & professional' },
        { id: 'soft', label: 'Soft', desc: 'Gentle & soothing whispers' },
        { id: 'deep', label: 'Deep', desc: 'Resonant & authoritative' },
        { id: 'whisper', label: 'Whisper', desc: 'Intimate sleep-focused tone' }
    ] as const;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Voice Selection */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-purple-600/10 transition-all duration-700"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <span className="text-purple-400">🎙️</span> The Sleep Suite
                        </h3>
                        <p className="text-slate-400 text-sm max-w-md">
                            Select the narrative voice that best fits your documentary's mood.
                            Changing the profile will apply to all future audio generations.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {VOICE_PROFILES.map((profile) => (
                            <div key={profile.id} className="relative group/card">
                                <button
                                    onClick={() => onUpdateVoiceProfile(profile.id as any)}
                                    className={`w-full p-4 rounded-2xl border transition-all text-left flex flex-col gap-1 ${(project.voiceProfile || 'standard') === profile.id
                                        ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10'
                                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <span className={`text-xs font-bold ${(project.voiceProfile || 'standard') === profile.id ? 'text-purple-400' : 'text-white'
                                        }`}>
                                        {profile.label}
                                    </span>
                                    <span className="text-[9px] text-slate-500 leading-tight">{profile.desc}</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAudition(profile.id);
                                    }}
                                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all border ${auditioningProfile === profile.id
                                        ? 'bg-purple-500 border-purple-400 animate-pulse'
                                        : 'bg-slate-800 border-white/5 opacity-0 group-hover/card:opacity-100 hover:bg-slate-700'
                                        }`}
                                    title="Listen to sample"
                                >
                                    {auditioningProfile === profile.id ? '⏹️' : '👂'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mastering List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Voiceover Mastering Track</h4>
                    <div className="flex items-center gap-3">
                        <select
                            value={globalSelectedVoice}
                            onChange={(e) => setGlobalSelectedVoice(e.target.value as any)}
                            className="bg-slate-800 border-white/5 text-[10px] font-bold text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer"
                        >
                            {VOICE_PROFILES.map(p => (
                                <option key={p.id} value={p.id}>{p.label} Voice</option>
                            ))}
                        </select>
                        <button
                            onClick={handleRegenerateAll}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            {isGenerating && !generatingId ? (
                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span>🎙️ Re-render All Audio</span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {script.sections.map((section, idx) => (
                        <div
                            key={section.id}
                            className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:bg-slate-900/60 transition-all group/line"
                        >
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Left: Info & Controls */}
                                <div className="lg:w-72 shrink-0 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-400/10 px-2 py-0.5 rounded">
                                            Line {idx + 1}
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
                                                value={selectedVoices[section.id] || project.voiceProfile || 'standard'}
                                                onChange={(e) => setSelectedVoices(prev => ({ ...prev, [section.id]: e.target.value as any }))}
                                                className="w-full bg-slate-800/80 border border-white/5 text-[10px] font-bold text-white rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer appearance-none"
                                            >
                                                {VOICE_PROFILES.map(p => (
                                                    <option key={p.id} value={p.id}>{p.label} Voice</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <button
                                                onClick={handleRewind}
                                                disabled={playingId !== section.id}
                                                className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-xl text-xs transition-all flex items-center justify-center border border-white/5"
                                                title="Rewind"
                                            >
                                                ⏪
                                            </button>
                                            <button
                                                onClick={() => section.audioUrl && handlePlayPause(section.id, `${section.audioUrl}${section.audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`)}
                                                disabled={!section.audioUrl}
                                                className={`col-span-1 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center border border-white/5 ${playingId === section.id && !isPaused ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 text-sm' : 'bg-slate-800 text-white hover:bg-slate-700'
                                                    }`}
                                            >
                                                {playingId === section.id && !isPaused ? '⏸️' : '▶️'}
                                            </button>
                                            <button
                                                onClick={handleStop}
                                                disabled={playingId !== section.id}
                                                className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-xl text-xs transition-all flex items-center justify-center border border-white/5"
                                                title="Stop"
                                            >
                                                ⏹️
                                            </button>
                                            <button
                                                onClick={() => handleRegenerateLine(section.id)}
                                                disabled={isGenerating}
                                                className={`p-2.5 rounded-xl text-xs transition-all flex items-center justify-center border border-white/5 ${generatingId === section.id ? 'bg-purple-600/50' : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20'
                                                    }`}
                                                title="Regenerate"
                                            >
                                                {generatingId === section.id ? (
                                                    <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                ) : (
                                                    '🔄'
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {playingId === section.id && (
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
                                <p className="text-sm text-slate-400 leading-relaxed italic line-clamp-3 group-hover/line:line-clamp-none transition-all">
                                    "{section.content}"
                                </p>

                                {/* Visual Cue Indicator */}
                                {section.visualCues && section.visualCues.length > 0 && (
                                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                        {section.visualCues.map((cue, cIdx) => (
                                            <div
                                                key={cue.id}
                                                className="relative group/cue shrink-0"
                                            >
                                                {cue.url ? (
                                                    <div className="w-24 aspect-video rounded-lg overflow-hidden border border-white/10 relative">
                                                        <img
                                                            src={cue.url}
                                                            alt={cue.description}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/cue:scale-110"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cue:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-[8px] font-bold text-white uppercase tracking-wider">Cue {cIdx + 1}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-24 aspect-video rounded-lg bg-teal-500/10 border border-teal-500/20 flex flex-col items-center justify-center text-[10px] grayscale opacity-50 group-hover/line:grayscale-0 group-hover/line:opacity-100 transition-all gap-1"
                                                        title={cue.description}
                                                    >
                                                        <span>🖼️</span>
                                                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Pending</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
