'use client';

import React, { useState } from 'react';
import { Script, ScriptSection, VisualCue } from '@/types';

interface TimelineEditorProps {
    script: Script;
    onSave: (updatedScript: Script) => Promise<void>;
    onRegenerateImage: (sectionId: string, cueId: string, prompt: string) => Promise<void>;
    isSaving: boolean;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
    script,
    onSave,
    onRegenerateImage,
    isSaving
}) => {
    const [localScript, setLocalScript] = useState<Script>(JSON.parse(JSON.stringify(script)));
    const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

    const handleCueChange = (sectionId: string, cueId: string, field: keyof VisualCue, value: any) => {
        setLocalScript(prev => {
            const next = { ...prev };
            const section = next.sections.find(s => s.id === sectionId);
            if (section && section.visualCues) {
                const cueIdx = section.visualCues.findIndex(c => c.id === cueId);
                if (cueIdx !== -1) {
                    section.visualCues[cueIdx] = { ...section.visualCues[cueIdx], [field]: value };
                }
            }
            return next;
        });
    };

    const handleRegenerate = async (sectionId: string, cue: VisualCue) => {
        setRegeneratingIds(prev => new Set(prev).add(cue.id));
        try {
            await onRegenerateImage(sectionId, cue.id, cue.description);
        } finally {
            setRegeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(cue.id);
                return next;
            });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Timeline Editor</h2>
                    <p className="text-slate-400 text-sm mt-1">Fine-tune your documentary's visual narrative and pacing.</p>
                </div>
                <button
                    onClick={() => onSave(localScript)}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                    {isSaving ? (
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        '💾 Save Timeline Changes'
                    )}
                </button>
            </div>

            <div className="space-y-6">
                {localScript.sections.map((section) => (
                    <div key={section.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-slate-500 font-mono text-xs">SECTION {section.order + 1}:</span>
                                {section.title}
                            </h3>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">{Math.round(section.estimatedDuration)}s Total</span>
                        </div>

                        <div className="p-6 space-y-4">
                            {section.visualCues?.map((cue, idx) => (
                                <div key={cue.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/50 p-6 rounded-2xl border border-white/5 relative group transition-all hover:border-blue-500/30">
                                    {/* Image Preview */}
                                    <div className="lg:col-span-3 space-y-3">
                                        <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/5 relative">
                                            {cue.url ? (
                                                <img src={cue.url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-700 text-2xl">🎬</div>
                                            )}
                                            {regeneratingIds.has(cue.id) && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                                    <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRegenerate(section.id, cue)}
                                            disabled={regeneratingIds.has(cue.id)}
                                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            ✨ Regenerate Image
                                        </button>
                                    </div>

                                    {/* Cue Settings */}
                                    <div className="lg:col-span-9 space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Start Time (s)</label>
                                                <input
                                                    type="number"
                                                    value={cue.timestamp}
                                                    onChange={(e) => handleCueChange(section.id, cue.id, 'timestamp', parseFloat(e.target.value))}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                    step="0.5"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Transition</label>
                                                <select
                                                    value={cue.transitionType || 'fade'}
                                                    onChange={(e) => handleCueChange(section.id, cue.id, 'transitionType', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                >
                                                    <option value="fade">Fade</option>
                                                    <option value="blur">Blur</option>
                                                    <option value="zoom">Zoom</option>
                                                    <option value="slide">Slide</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Duration (ms)</label>
                                                <input
                                                    type="number"
                                                    value={cue.transitionDuration || 1200}
                                                    onChange={(e) => handleCueChange(section.id, cue.id, 'transitionDuration', parseInt(e.target.value))}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                                    step="100"
                                                    min="0"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <div className="px-3 py-2 border border-blue-500/20 bg-blue-500/5 rounded-lg text-blue-400 text-[10px] font-bold uppercase tracking-tighter">
                                                    Cue #{idx + 1}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Visual Prompt / Description</label>
                                            <textarea
                                                value={cue.description}
                                                onChange={(e) => handleCueChange(section.id, cue.id, 'description', e.target.value)}
                                                rows={2}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
