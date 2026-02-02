'use client';

import React, { useState, useEffect } from 'react';
import { Script, VisualCue } from '@/types';
import { VisualCueEditor } from './timeline/VisualCueEditor';

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

    // Sync local state when parent script updates
    useEffect(() => {
        setLocalScript(JSON.parse(JSON.stringify(script)));
    }, [script]);

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
        await onSave(localScript);
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
                {localScript.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-slate-500 font-mono text-xs">SECTION {section.order + 1}:</span>
                                {section.title}
                            </h3>
                            <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">{Math.round(section.estimatedDuration)}s Total</span>
                        </div>

                        <div className="p-6 space-y-4">
                            {section.visualCues && section.visualCues.length > 0 ? (
                                section.visualCues.map((cue, idx) => (
                                    <VisualCueEditor
                                        key={cue.id}
                                        cue={cue}
                                        sectionId={section.id}
                                        index={idx}
                                        isRegenerating={regeneratingIds.has(cue.id)}
                                        onCueChange={handleCueChange}
                                        onRegenerate={handleRegenerate}
                                    />
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                                        <span className="text-3xl">🎬</span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-2">No visual assets generated yet for this section.</p>
                                    <p className="text-slate-600 text-xs">Generate media assets from the Overview tab to enable timeline editing.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
