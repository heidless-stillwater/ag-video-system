import React from 'react';
import { VisualCue } from '@/types';
import { SOUND_EFFECTS } from '@/lib/services/audio';
import { 
    Image as ImageIcon, 
    Zap, 
    Clock, 
    Volume2, 
    RefreshCw,
    Film,
    Sparkles,
    Library,
    Check,
    Trash2
} from 'lucide-react';
import { CounterInput } from '@/components/ui/CounterInput';
import { PromptToolMediaPicker, PTImage } from '@/components/media/PromptToolMediaPicker';

interface VisualCueEditorProps {
    cue: VisualCue;
    sectionId: string;
    index: number;
    isRegenerating: boolean;
    onCueChange: (sectionId: string, cueId: string, field: keyof VisualCue, value: any) => void;
    onRegenerate: (sectionId: string, cue: VisualCue) => void;
    onOpenPicker: (cueId: string, sectionId: string) => void;
    onArchiveImage: (sectionId: string, cue: VisualCue) => Promise<void>;
    onDelete?: (sectionId: string, cueId: string) => void;
}

export const VisualCueEditor: React.FC<VisualCueEditorProps> = ({
    cue,
    sectionId,
    index,
    isRegenerating,
    onCueChange,
    onRegenerate,
    onOpenPicker,
    onArchiveImage,
    onDelete
}) => {
    const [isArchiving, setIsArchiving] = React.useState(false);

    const handleArchive = async () => {
        setIsArchiving(true);
        try {
            await onArchiveImage(sectionId, cue);
        } finally {
            setIsArchiving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/40 p-6 rounded-3xl border border-white/5 relative group transition-all duration-300 hover:border-blue-500/20 hover:bg-slate-950/60">
            {/* Visual Header / Index */}
            <div className="absolute left-3 top-3 z-10">
                <div className="w-7 h-7 rounded-full bg-blue-600/95 text-white text-[10px] font-black flex items-center justify-center shadow-2xl shadow-blue-500/60 border border-blue-400/40">
                    {index + 1}
                </div>
            </div>

            {/* Media Column */}
            <div className="lg:col-span-4 space-y-4">
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative group/media shadow-inner">
                    {cue.type === 'video' && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-purple-600/90 text-[9px] font-black text-white px-2 py-1 rounded-lg backdrop-blur-md shadow-lg border border-purple-400/30">
                            <Film size={10} />
                            VIDEO
                        </div>
                    )}
                    {cue.type === 'video' && (cue.videoUrl || cue.url) ? (
                        <video 
                            src={cue.videoUrl || cue.url}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                            muted
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                    ) : cue.url ? (
                        <img src={cue.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" alt="" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 gap-2">
                             <ImageIcon size={32} className="opacity-20" />
                             <span className="text-[10px] font-bold uppercase tracking-widest opacity-20">No Preview</span>
                        </div>
                    )}
                    
                    {/* Overlay Controls */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button
                            onClick={() => onRegenerate(sectionId, cue)}
                            disabled={isRegenerating}
                            className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform active:scale-95 shadow-xl disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isRegenerating ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {isRegenerating && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Imagining...</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onOpenPicker(cue.id, sectionId)}
                        className="flex-1 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-indigo-500/30 flex items-center justify-center gap-2 group/btn"
                    >
                        <Library size={12} className="text-indigo-400 group-hover/btn:scale-110 transition-transform" />
                        Browse
                    </button>
                    {cue.url && (
                        <button
                            onClick={handleArchive}
                            disabled={isArchiving}
                            className="w-12 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-emerald-500/30 flex items-center justify-center group/btn shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                            title="Add to PromptTool Project Set"
                        >
                            <Check size={14} className={isArchiving ? 'animate-pulse' : 'group-hover:scale-125 transition-transform'} />
                        </button>
                    )}
                    <button
                        onClick={() => onRegenerate(sectionId, cue)}
                        disabled={isRegenerating || isArchiving}
                        className="flex-1 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                    >
                        <Sparkles size={12} className="text-blue-400 group-hover/btn:scale-125 transition-transform" />
                        AI Generate
                    </button>
                    {onDelete && (
                        <button
                            onClick={() => onDelete(sectionId, cue.id)}
                            className="w-10 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl transition-all border border-red-500/20 flex items-center justify-center group/del"
                            title="Delete scene"
                        >
                            <Trash2 size={14} className="group-hover/del:scale-110 transition-transform" />
                        </button>
                    )}
                </div>
            </div>

            {/* Configuration Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                {/* Timing & Motion Settings */}
                <div className="grid grid-cols-4 gap-4">
                    <CounterInput
                        label="Start Offset"
                        value={cue.timestamp}
                        onChange={(val) => onCueChange(sectionId, cue.id, 'timestamp', val)}
                        step={0.5}
                        min={0}
                        unit="s"
                    />

                    <div className="space-y-2">
                         <label className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            <Library size={10} />
                            Track
                         </label>
                        <select
                            value={cue.trackId || 'video'}
                            onChange={(e) => onCueChange(sectionId, cue.id, 'trackId', e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                        >
                            <option value="video">Main Video</option>
                            <option value="broll">B-Roll Track</option>
                            <option value="audio">Audio FX Track</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                         <label className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            <Film size={10} />
                            Transition
                         </label>
                        <select
                            value={cue.transitionType || 'fade'}
                            onChange={(e) => onCueChange(sectionId, cue.id, 'transitionType', e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                        >
                            <option value="fade">Smooth Fade</option>
                            <option value="blur">Dreamy Blur</option>
                            <option value="zoom">Dynamic Zoom</option>
                            <option value="slide">Cinematic Slide</option>
                        </select>
                    </div>

                    <CounterInput
                        label="Duration"
                        value={cue.transitionDuration || 1200}
                        onChange={(val) => onCueChange(sectionId, cue.id, 'transitionDuration', val)}
                        step={100}
                        min={0}
                        unit="ms"
                    />
                </div>

                {/* Sound & Prompt Settings */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                         <label className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            <Volume2 size={12} className={cue.sfxUrl ? 'text-teal-400' : ''} />
                            Audio Atmosphere
                         </label>
                         <div className="space-y-3">
                            <select
                                value={cue.sfxUrl || ''}
                                onChange={(e) => {
                                    const sfx = SOUND_EFFECTS.find(s => s.url === e.target.value);
                                    onCueChange(sectionId, cue.id, 'sfxUrl', e.target.value);
                                    onCueChange(sectionId, cue.id, 'sfxLabel', sfx?.label || '');
                                }}
                                className={`w-full bg-slate-900/50 border ${cue.sfxUrl ? 'border-teal-500/20 text-teal-400' : 'border-white/5 text-slate-400'} rounded-xl px-4 py-2 text-xs focus:outline-none transition-all cursor-pointer`}
                            >
                                <option value="">No Ambient SFX</option>
                                {SOUND_EFFECTS.map(s => (
                                    <option key={s.id} value={s.url}>{s.label}</option>
                                ))}
                            </select>
                            
                            {cue.sfxUrl && (
                                <div className="space-y-1.5 px-1">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter text-slate-600">
                                        <span>SFX Volume</span>
                                        <span>{Math.round((cue.sfxVolume || 0.4) * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={cue.sfxVolume || 0.4}
                                        onChange={(e) => onCueChange(sectionId, cue.id, 'sfxVolume', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                    />
                                </div>
                            )}
                         </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                            Visual Synthesis Prompt
                        </label>
                        <textarea
                            value={cue.description}
                            onChange={(e) => onCueChange(sectionId, cue.id, 'description', e.target.value)}
                            rows={3}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all resize-none leading-relaxed placeholder:text-slate-700"
                            placeholder="Describe the visual essence..."
                        />
                    </div>
                </div>
            </div>

            {/* Reflection / Subtle Shine */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
    );
};
