'use client';

import React, { useState } from 'react';
import { Project, VisualStyle } from '@/types';
import { StyleSelector } from './StyleSelector';
import { AMBIENT_TRACKS, audioService } from '@/lib/services/audio';

interface ProjectSettingsProps {
    project: Project;
    onUpdateProject: (updates: Partial<Project>) => Promise<void>;
    isUpdating: boolean;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
    project,
    onUpdateProject,
    isUpdating
}) => {
    const [localTitle, setLocalTitle] = useState(project.title);
    const [localDescription, setLocalDescription] = useState(project.description);

    const handleUpdate = async (updates: Partial<Project>) => {
        await onUpdateProject(updates);
    };

    const handleVolumeChange = (field: keyof Project, value: number) => {
        handleUpdate({ [field]: value });
    };

    const handleMusicSelect = (trackId: string) => {
        const track = audioService.getTrackById(trackId);
        if (track) {
            handleUpdate({ backgroundMusicUrl: track.url });
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* General Settings */}
            <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <span className="text-blue-400">📝</span> Project Metadata
                </h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Project Title</label>
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={() => localTitle !== project.title && handleUpdate({ title: localTitle })}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Description / Hook</label>
                        <textarea
                            value={localDescription}
                            onChange={(e) => setLocalDescription(e.target.value)}
                            onBlur={() => localDescription !== project.description && handleUpdate({ description: localDescription })}
                            rows={3}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm leading-relaxed"
                        />
                    </div>
                </div>
            </section>

            {/* Audio Suite */}
            <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <span className="text-purple-400">🎙️</span> Audio Suite
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Narration Volume</label>
                                <span className="text-xs font-mono text-purple-400 font-bold">{Math.round((project.narrationVolume ?? 1.0) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={project.narrationVolume ?? 1.0}
                                onChange={(e) => handleVolumeChange('narrationVolume', parseFloat(e.target.value))}
                                className="w-full accent-purple-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Background Music</label>
                                <span className="text-xs font-mono text-purple-400 font-bold">{Math.round((project.backgroundMusicVolume ?? 0.2) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={project.backgroundMusicVolume ?? 0.2}
                                onChange={(e) => handleVolumeChange('backgroundMusicVolume', parseFloat(e.target.value))}
                                className="w-full accent-purple-500"
                            />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Ambiance Layer</label>
                                <span className="text-xs font-mono text-purple-400 font-bold">{Math.round((project.ambianceVolume ?? 0.1) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={project.ambianceVolume ?? 0.1}
                                onChange={(e) => handleVolumeChange('ambianceVolume', parseFloat(e.target.value))}
                                className="w-full accent-purple-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sound Effects (Global)</label>
                                <span className="text-xs font-mono text-purple-400 font-bold">{Math.round((project.globalSfxVolume ?? 0.4) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={project.globalSfxVolume ?? 0.4}
                                onChange={(e) => handleVolumeChange('globalSfxVolume', parseFloat(e.target.value))}
                                className="w-full accent-purple-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Background Soundscape</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {AMBIENT_TRACKS.map(track => (
                            <button
                                key={track.id}
                                onClick={() => handleMusicSelect(track.id)}
                                className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 relative group ${project.backgroundMusicUrl === track.url
                                    ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10'
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white leading-tight">{track.title}</span>
                                    {project.backgroundMusicUrl === track.url && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{track.description}</p>
                                <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/5">
                                    <span className="text-[9px] font-mono font-bold text-slate-500">{track.bpm} BPM</span>
                                    {project.backgroundMusicUrl === track.url && <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Active</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Visual Suite */}
            <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <span className="text-indigo-400">🎨</span> Visual Suite
                </h3>

                <div className="mb-8">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Documentary Aesthetic</label>
                    <StyleSelector
                        selectedStyle={project.visualStyle || 'cinematic'}
                        onStyleSelect={(style) => handleUpdate({ visualStyle: style })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center md:text-left">Subtitle Integration</label>
                        <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
                            <button
                                onClick={() => handleUpdate({ subtitlesEnabled: true })}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${project.subtitlesEnabled !== false ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                Enabled
                            </button>
                            <button
                                onClick={() => handleUpdate({ subtitlesEnabled: false })}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${project.subtitlesEnabled === false ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                Disabled
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center md:text-left">Subtitle Aesthetic</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['minimal', 'classic', 'bold'] as const).map((style) => (
                                <button
                                    key={style}
                                    onClick={() => handleUpdate({ subtitleStyle: style })}
                                    className={`py-3 rounded-xl text-xs font-bold capitalize transition-all border ${project.subtitleStyle === style
                                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                        : 'bg-slate-800/50 border-white/5 text-slate-500 hover:bg-slate-800'}`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Publication Defaults */}
            <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <span className="text-red-400">📺</span> Publishing Defaults
                        </h3>
                        <p className="text-slate-400 text-xs">These settings will be pre-filled when you launch to YouTube.</p>
                    </div>

                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                        {(['private', 'unlisted', 'public'] as const).map((v) => (
                            <button
                                key={v}
                                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${v === 'private' ? 'bg-red-600 text-white' : 'text-slate-500'}`}
                                disabled={v !== 'private'} // For now, we only support private as default or it's a fixed setting elsewhere
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};
