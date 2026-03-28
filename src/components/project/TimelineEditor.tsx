'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Script, VisualCue } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, Save } from 'lucide-react';
import { VisualCueEditor } from './timeline/VisualCueEditor';
import { ScriptEditor } from './timeline/ScriptEditor';
import { InteractiveTimeline } from './timeline/InteractiveTimeline';
import { PromptToolMediaPicker, PTImage } from '@/components/media/PromptToolMediaPicker';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface TimelineEditorProps {
    script: Script;
    projectTitle: string;
    onSave: (updatedScript: Script) => Promise<void>;
    onRegenerateImage: (sectionId: string, cueId: string, prompt: string) => Promise<void>;
    onArchiveImage: (sectionId: string, cue: VisualCue) => Promise<void>;
    onRegenerateScript?: () => void;
    onRender: () => void;
    onFineTune: (time?: number) => void;
    onOpenAcousticStudio: () => void;
    onDownloadMP4?: () => void;
    isSaving: boolean;
    isRendering: boolean;
    isDownloading?: boolean;
    downloadUrl?: string | null;
    isGeneratingMedia?: boolean;
    onGenerateMedia: () => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
    script,
    projectTitle,
    onSave,
    onRegenerateImage,
    onArchiveImage,
    onRegenerateScript,
    onRender,
    onFineTune,
    onOpenAcousticStudio,
    onDownloadMP4,
    isSaving,
    isRendering,
    isDownloading,
    downloadUrl,
    isGeneratingMedia,
    onGenerateMedia
}) => {
    // 1. STATE DECLARATIONS (ALWAYS AT TOP)
    const [localScript, setLocalScript] = useState<Script>(JSON.parse(JSON.stringify(script)));
    const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
    const [editorView, setEditorView] = useState<'classic' | 'timeline'>('classic');
    const [timelineResetKey, setTimelineResetKey] = useState(0);
    const [isSavingTimeline, setIsSavingTimeline] = useState(false);
    
    // Media Picker State
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [activeCueId, setActiveCueId] = useState<string | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    
    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [cueToDelete, setCueToDelete] = useState<{ sectionId: string | null, cueId: string } | null>(null);

    // 2. EFFECTS (STABLE ORDER)
    useEffect(() => {
        // Only sync if we're not currently in the middle of a reset or timeline save
        if (!isSavingTimeline) {
            setLocalScript(JSON.parse(JSON.stringify(script)));
        }
    }, [script, isSavingTimeline]);

    // 3. HANDLERS
    const handleSave = async (updatedScript: Script) => {
        setIsSavingTimeline(true);
        try {
            await onSave(updatedScript);
            setLocalScript(updatedScript);
        } finally {
            setIsSavingTimeline(false);
        }
    };

    const handleResetTimeline = async () => {
        setIsSavingTimeline(true);
        console.log('[Regenerate] Starting Timeline Regeneration from Narration...');
        try {
            // 1. FRESH START: Deep clone the script 
            const baselineScript: Script = JSON.parse(JSON.stringify(localScript));
            
            // 2. CLEANSE: Re-initialize every section and cue to its 'Classic' state with SEQUENTIAL timing
            let globalOffset = 0;
            
            baselineScript.sections.forEach(section => {
                // RE-CALCULATE section duration based on current content (ground truth)
                const words = section.content?.split(/\s+/).filter(Boolean).length || 0;
                const estimatedDuration = Math.round((words / 150) * 60);
                const count = section.visualCues?.length || 0;
                
                console.log(`[Regenerate] - Section '${section.title}' (${words} words) -> ${estimatedDuration}s. Cleansing ${count} cues.`);
                
                if (section.visualCues && count > 0) {
                    const cueDuration = estimatedDuration / count;
                    let sectionCueOffset = 0;

                    section.visualCues = section.visualCues.map((cue, idx) => {
                        const currentTimestamp = idx === 0 ? 0 : sectionCueOffset;
                        
                        const cleanCue: VisualCue = {
                            id: cue.id,
                            description: cue.description || '',
                            url: cue.url || '',
                            type: cue.type || 'image',
                            trackId: cue.trackId || 'video',
                            videoUrl: cue.videoUrl || null,
                            status: cue.status || 'ready',
                            transitionType: cue.transitionType || 'fade',
                            transitionDuration: cue.transitionDuration || 1500,
                            sourceDuration: cue.sourceDuration || null,
                            timestamp: Number(currentTimestamp.toFixed(3)), // SECONDS
                            overrideDuration: Number(cueDuration.toFixed(3)), // BAKE DURATION
                        };

                        sectionCueOffset += cueDuration;
                        return cleanCue;
                    });
                }
            });

            // 3. Update Sync State & Key
            setLocalScript(baselineScript);
            setTimelineResetKey(k => k + 1);

            // 4. Persist to DB
            await onSave(baselineScript);
            console.log('[Regenerate] Success: Baseline regenerated sequences saved. ✅');
        } catch (err) {
            console.error('[Regenerate] Failed to regenerate timeline:', err);
        } finally {
            setIsSavingTimeline(false);
        }
    };

    const handleCueChange = (sectionId: string, cueId: string, field: keyof VisualCue, value: any) => {
        setLocalScript(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                sections: prev.sections.map(s => {
                    if (s.id !== sectionId) return s;
                    return {
                        ...s,
                        visualCues: (s.visualCues || []).map(c => {
                            if (c.id !== cueId) return c;
                            return { ...c, [field]: value };
                        })
                    };
                })
            };
        });
    };

    const handleDeleteCue = (sectionId: string | null, cueId: string) => {
        setCueToDelete({ sectionId, cueId });
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteCue = () => {
        if (!cueToDelete) return;
        const { sectionId, cueId } = cueToDelete;
        
        const next = {
            ...localScript,
            sections: localScript.sections.map(s => {
                if (sectionId && s.id !== sectionId) return s;
                return {
                    ...s,
                    visualCues: (s.visualCues || []).filter(c => c.id !== cueId)
                };
            })
        };
        setLocalScript(next);
        onSave(next);
        setDeleteConfirmOpen(false);
        setCueToDelete(null);
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

    const handleOpenPicker = (cueId: string, sectionId: string) => {
        setActiveCueId(cueId);
        setActiveSectionId(sectionId);
        setIsPickerOpen(true);
    };

    const handleMediaSelect = (image: PTImage) => {
        if (!activeCueId || !activeSectionId) return;
        const isVideo = image.settings.modality === 'video';
        
        const nextScript: Script = {
            ...localScript,
            sections: localScript.sections.map(s => {
                if (s.id !== activeSectionId) return s;
                return {
                    ...s,
                    visualCues: (s.visualCues || []).map(c => {
                        if (c.id !== activeCueId) return c;
                        return {
                            ...c,
                            url: image.imageUrl,
                            videoUrl: image.videoUrl || null,
                            sourceDuration: image.duration || null,
                            type: (isVideo ? 'video' : 'image') as any
                        };
                    })
                } as any;
            })
        };
        
        setLocalScript(nextScript);
        onSave(nextScript);
        setIsPickerOpen(false);
    };

    return (
        <div className="space-y-8" id="timeline-header">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white">Timeline Editor</h2>
                        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/5 rounded-xl shadow-inner ml-2">
                            <button
                                onClick={() => setEditorView('classic')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    editorView === 'classic'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Classic List
                            </button>
                            <button
                                onClick={() => setEditorView('timeline')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    editorView === 'timeline'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Timeline View
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">Refine your narrative pacing and visuals.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onSave(localScript)}
                        disabled={isSaving}
                        className="w-11 h-11 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl border border-white/5 flex items-center justify-center transition-all flex-shrink-0"
                        title="Save Manual Edits"
                    >
                        {isSaving ? (
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <Save size={18} className="text-slate-400" />
                        )}
                    </button>
                    <button 
                        onClick={() => onFineTune()} 
                        className="h-11 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/5 font-bold flex items-center gap-2 transition-all shadow-lg"
                    >
                        <Play size={14} className="text-blue-400" />
                        <span className="text-xs uppercase tracking-wider">Preview</span>
                    </button>
                    <button 
                        onClick={onGenerateMedia} 
                        className="h-11 px-6 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
                    >
                        <Sparkles size={16} />
                        <span className="text-xs uppercase tracking-wider">Visual</span>
                    </button>
                    <button 
                        onClick={onRender} 
                        disabled={isRendering} 
                        className="h-11 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    >
                        <span className="text-sm">🎬</span>
                        <span className="text-xs uppercase tracking-wider">Create</span>
                    </button>
                </div>
            </div>

            {editorView === 'classic' ? (
                <div className="space-y-8">
                    <AnimatePresence>
                        {localScript.sections.map((section, sectionIndex) => (
                            <motion.div 
                                key={section.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: sectionIndex * 0.1 }}
                                className="bg-slate-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-md shadow-2xl"
                            >
                                <div className="bg-gradient-to-r from-slate-800/50 to-transparent px-8 py-4 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black font-mono text-slate-400">{sectionIndex + 1}</div>
                                        <h3 className="font-bold text-white text-lg tracking-tight">{section.title}</h3>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-black uppercase tracking-widest">
                                        {Math.round(section.estimatedDuration)}s Segment
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <ScriptEditor
                                        content={section.content}
                                        sectionIndex={sectionIndex}
                                        title={section.title}
                                        onChange={(v) => {
                                            const next = [...localScript.sections];
                                            next[sectionIndex] = { ...next[sectionIndex], content: v };
                                            setLocalScript({ ...localScript, sections: next });
                                        }}
                                    />
                                    <div className="h-px bg-slate-800/30 my-4" />
                                    {section.visualCues?.map((cue, idx) => (
                                        <VisualCueEditor
                                            key={cue.id}
                                            cue={cue}
                                            sectionId={section.id}
                                            index={idx}
                                            isRegenerating={regeneratingIds.has(cue.id)}
                                            onCueChange={handleCueChange}
                                            onRegenerate={handleRegenerate}
                                            onOpenPicker={handleOpenPicker}
                                            onArchiveImage={onArchiveImage}
                                            onDelete={handleDeleteCue}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <InteractiveTimeline 
                    key={`timeline-${timelineResetKey}`}
                    script={localScript} 
                    onScriptChange={handleSave} 
                    onReset={handleResetTimeline}
                    onDelete={(id: string) => handleDeleteCue(null, id)}
                    onFineTune={onFineTune}
                />
            )}

            <PromptToolMediaPicker 
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handleMediaSelect}
                targetSetId={`VideoSystem-${script.projectId}`}
                targetSetName={projectTitle}
            />

            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteCue}
                title="Delete Scene?"
                description="Are you sure you want to remove this scene from the timeline? This action cannot be undone."
                confirmLabel="Delete"
                confirmVariant="danger"
            />
        </div>
    );
};
