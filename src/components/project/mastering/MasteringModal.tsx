'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mic2, 
    X, 
    Play, 
    Pause, 
    Square, 
    RefreshCw, 
    Settings2, 
    Waves, 
    Volume2,
    Music,
    Languages
} from 'lucide-react';
import { Project, Script } from '@/types';
import { SectionMasteringRow } from './SectionMasteringRow';
import { VoiceProfileSelector } from './VoiceProfileSelector';
import { VOICE_PROFILES } from '@/lib/constants';

interface MasteringModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    script: Script;
    onRegenerateLine: (sectionId: string, voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onRegenerateAll: (voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    onUpdateTTSEngine: (engine: Project['ttsEngine']) => Promise<void>;
    isGenerating: boolean;
    generatingId?: string | null;
    playingId: string | null;
    isPaused: boolean;
    progress: number;
    onPlayPause: (sectionId: string, url: string) => void;
    onStop: () => void;
    onRewind: () => void;
}

export const MasteringModal: React.FC<MasteringModalProps> = ({
    isOpen,
    onClose,
    project,
    script,
    onRegenerateLine,
    onRegenerateAll,
    onUpdateVoiceProfile,
    onUpdateTTSEngine,
    isGenerating,
    generatingId,
    playingId,
    isPaused,
    progress,
    onPlayPause,
    onStop,
    onRewind
}) => {
    const [selectedVoices, setSelectedVoices] = useState<Record<string, Project['voiceProfile']>>({});

    if (!isOpen) return null;

    const currentProfile = VOICE_PROFILES.find(p => p.id === (project.voiceProfile || 'standard'));

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-6xl h-full max-h-[90vh] bg-slate-900/40 border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/50 flex flex-col overflow-hidden backdrop-blur-2xl"
                >
                    {/* Glossy Header Overlay */}
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div className="px-8 pt-8 pb-6 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Mic2 className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    Acoustic Studio
                                    <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-[10px] uppercase font-black tracking-widest text-purple-400">
                                        Pro Mastering
                                    </span>
                                </h2>
                                <p className="text-slate-400 text-sm font-medium mt-0.5">
                                    Precision voice synthesis & audio performance control
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-white/10"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Studio Toolbar */}
                    <div className="px-8 py-4 bg-black/20 border-y border-white/5 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-6">
                            {/* Current Voice Stats */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-xl">
                                    <Languages className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">Language</span>
                                    <span className="text-xs font-bold text-white uppercase tracking-tight">{script.languageCode || 'en-US'}</span>
                                </div>
                            </div>

                            <div className="w-px h-8 bg-white/5" />

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-xl">
                                    <Waves className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">Active Profile</span>
                                    <span className="text-xs font-bold text-white tracking-tight">{currentProfile?.label || 'Standard'} Voice</span>
                                </div>
                            </div>

                            <div className="w-px h-8 bg-white/5" />

                            {/* Total Video Duration */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <span className="text-emerald-400 text-sm italic">🎥</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">Total Length</span>
                                    <span className="text-xs font-black text-emerald-400 tracking-wider">
                                        {Math.floor(script.sections.reduce((acc, s) => acc + (s.estimatedDuration || 0), 0) / 60)}:
                                        {String(Math.floor(script.sections.reduce((acc, s) => acc + (s.estimatedDuration || 0), 0) % 60)).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => onRegenerateAll()}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40"
                            >
                                {isGenerating && !generatingId ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                Synchronize All Tracks
                            </button>
                        </div>
                    </div>

                    {/* Workspace Wrapper */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Global Config */}
                        <div className="w-80 border-r border-white/5 bg-slate-900/30 p-8 overflow-y-auto no-scrollbar hidden lg:block">
                            <div className="space-y-10">
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <Settings2 className="w-4 h-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Persona Settings</h3>
                                    </div>
                                    <VoiceProfileSelector
                                        currentProfile={project.voiceProfile}
                                        currentEngine={project.ttsEngine}
                                        onUpdateVoiceProfile={onUpdateVoiceProfile}
                                        onUpdateTTSEngine={onUpdateTTSEngine}
                                        languageCode={script.languageCode}
                                    />
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <Volume2 className="w-4 h-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Mixer Context</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Background Music</span>
                                                <Music size={12} className="text-slate-500" />
                                            </div>
                                            <div className="text-xs text-white font-bold truncate">
                                                {project.backgroundMusicUrl ? project.backgroundMusicUrl.split('/').pop()?.replace(/_/g, ' ').replace('.mp3', '') : 'No Music Selected'}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                            </div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">Spatial Mastering</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Room Scale</span>
                                                    <span className="text-[9px] text-indigo-400 font-black">Studio B</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Pre-Gain</span>
                                                    <span className="text-[9px] text-indigo-400 font-black">+1.2dB</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-[2rem]">
                                    <p className="text-[10px] text-purple-300 font-medium leading-relaxed italic">
                                        Tip: High-fidelity mastering ensures the AI narration cuts through the background soundscape even in busy scenes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Main Track Sheet */}
                        <div className="flex-1 flex flex-col bg-black/10 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                                <div className="grid gap-4">
                                    {script.sections.map((section, idx) => (
                                        <SectionMasteringRow
                                            key={section.id}
                                            section={section}
                                            index={idx}
                                            selectedVoice={selectedVoices[section.id] || project.voiceProfile || 'standard'}
                                            onVoiceChange={(voice) => setSelectedVoices(prev => ({ ...prev, [section.id]: voice as any }))}
                                            isPlaying={playingId === section.id}
                                            isPaused={isPaused}
                                            progress={progress}
                                            onPlayPause={() => section.audioUrl && onPlayPause(section.id, `${section.audioUrl}${section.audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`)}
                                            onStop={onStop}
                                            onRewind={onRewind}
                                            onRegenerate={() => onRegenerateLine(section.id, selectedVoices[section.id])}
                                            isGenerating={generatingId === section.id}
                                            isGlobalGenerating={isGenerating}
                                            isMediaGenerating={false}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Global Playback Bar */}
                            {playingId && (
                                <motion.div
                                    initial={{ y: 100 }}
                                    animate={{ y: 0 }}
                                    className="px-8 py-6 bg-slate-900 border-t border-white/10 flex items-center gap-8"
                                >
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={onStop}
                                            className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition-all"
                                        >
                                            <Square className="w-5 h-5 fill-current" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const section = script.sections.find(s => s.id === playingId);
                                                if (section?.audioUrl) onPlayPause(section.id, section.audioUrl);
                                            }}
                                            className="w-14 h-14 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-xl shadow-white/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Now Previewing</span>
                                                <span className="text-sm font-bold text-white">
                                                    {script.sections.find(s => s.id === playingId)?.title || 'Segment'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                                animate={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
