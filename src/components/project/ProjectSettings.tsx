'use client';

import React, { useState } from 'react';
import { Project, VisualStyle } from '@/types';
import { AMBIENT_TRACKS } from '@/lib/services/audio';
import { CounterInput } from '@/components/ui/CounterInput';

interface ProjectSettingsProps {
    project: Project;
    onUpdateProject: (updates: Partial<Project>) => Promise<void>;
    onDeleteProject?: () => void;
    isUpdating: boolean;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
    project,
    onUpdateProject,
    onDeleteProject,
    isUpdating
}) => {
    const [localTitle, setLocalTitle] = useState(project.title);
    const [localDescription, setLocalDescription] = useState(project.description);
    const [localTargetDuration, setLocalTargetDuration] = useState(project.targetDuration?.toString() ?? '10');
    const [localTargetPacing, setLocalTargetPacing] = useState(project.targetPacing?.toString() ?? '130');

    const handleUpdate = async (updates: Partial<Project>) => {
        await onUpdateProject(updates);
    };

    const [isDeleting, setIsDeleting] = useState(false);

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

            {/* Production Controls */}
            <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <span className="text-emerald-400">⚙️</span> Production Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <CounterInput
                        label="Target Duration (Minutes)"
                        value={parseInt(localTargetDuration)}
                        onChange={(val) => {
                            setLocalTargetDuration(val.toString());
                            handleUpdate({ targetDuration: val });
                        }}
                        min={1}
                        unit="min"
                    />
                    <p className="mt-2 text-[10px] text-slate-500 italic">No cap — set any length. Default is 10 mins.</p>
                    <CounterInput
                        label="Narration Pacing (WPM)"
                        value={parseInt(localTargetPacing)}
                        onChange={(val) => {
                            setLocalTargetPacing(val.toString());
                            handleUpdate({ targetPacing: val });
                        }}
                        min={50}
                        max={300}
                        unit="wpm"
                    />
                    <p className="mt-2 text-[10px] text-slate-500 italic">Words per minute. Default sleep pacing is 130.</p>
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

            {/* Danger Zone */}
            <section className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-black text-red-500 uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <span className="text-red-500">⚠️</span> Danger Zone
                        </h3>
                        <p className="text-slate-400 text-sm">Once you delete a project, it cannot be recovered. All assets, scripts, and renders will be permanently removed.</p>
                    </div>

                    {onDeleteProject && (
                        <button
                            onClick={onDeleteProject}
                            className="px-8 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-all whitespace-nowrap"
                        >
                            Delete This Project
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
};
