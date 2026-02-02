import React from 'react';
import { VisualCue } from '@/types';
import { SOUND_EFFECTS } from '@/lib/services/audio';

interface VisualCueEditorProps {
    cue: VisualCue;
    sectionId: string;
    index: number;
    isRegenerating: boolean;
    onCueChange: (sectionId: string, cueId: string, field: keyof VisualCue, value: any) => void;
    onRegenerate: (sectionId: string, cue: VisualCue) => void;
}

export const VisualCueEditor: React.FC<VisualCueEditorProps> = ({
    cue,
    sectionId,
    index,
    isRegenerating,
    onCueChange,
    onRegenerate
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/50 p-6 rounded-2xl border border-white/5 relative group transition-all hover:border-blue-500/30">
            {/* Image Preview */}
            <div className="lg:col-span-3 space-y-3">
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/5 relative">
                    {cue.url ? (
                        <img src={cue.url} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 text-2xl">🎬</div>
                    )}
                    {isRegenerating && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => onRegenerate(sectionId, cue)}
                    disabled={isRegenerating}
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
                            onChange={(e) => onCueChange(sectionId, cue.id, 'timestamp', parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                            step="0.5"
                            min="0"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Transition</label>
                        <select
                            value={cue.transitionType || 'fade'}
                            onChange={(e) => onCueChange(sectionId, cue.id, 'transitionType', e.target.value)}
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
                            onChange={(e) => onCueChange(sectionId, cue.id, 'transitionDuration', parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                            step="100"
                            min="0"
                        />
                    </div>
                    <div className="flex items-end">
                        <div className="px-3 py-2 border border-blue-500/20 bg-blue-500/5 rounded-lg text-blue-400 text-[10px] font-bold uppercase tracking-tighter">
                            Cue #{index + 1}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <span>🎻 Sync Sound Design (SFX)</span>
                            {cue.sfxUrl && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>}
                        </label>
                        <select
                            value={cue.sfxUrl || ''}
                            onChange={(e) => {
                                const sfx = SOUND_EFFECTS.find(s => s.url === e.target.value);
                                onCueChange(sectionId, cue.id, 'sfxUrl', e.target.value);
                                onCueChange(sectionId, cue.id, 'sfxLabel', sfx?.label || '');
                            }}
                            className={`w-full bg-slate-900 border ${cue.sfxUrl ? 'border-teal-500/30 text-teal-400' : 'border-slate-800 text-slate-400'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 transition-colors`}
                        >
                            <option value="">No Sound Effect</option>
                            {SOUND_EFFECTS.map(s => (
                                <option key={s.id} value={s.url}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">SFX Volume</label>
                            <span className="text-[10px] text-slate-600 font-mono">{Math.round((cue.sfxVolume || 0.4) * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={cue.sfxVolume || 0.4}
                            disabled={!cue.sfxUrl}
                            onChange={(e) => onCueChange(sectionId, cue.id, 'sfxVolume', parseFloat(e.target.value))}
                            className="w-full accent-teal-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Visual Prompt / Description</label>
                    <textarea
                        value={cue.description}
                        onChange={(e) => onCueChange(sectionId, cue.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                </div>
            </div>
        </div>
    );
};
