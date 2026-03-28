import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Trash2, Copy, Clock, Zap, Type, Layers, Droplets, Maximize2, ArrowRight, ArrowLeft, ArrowLeftRight, RefreshCw, Plus, Minus, AlertTriangle } from 'lucide-react';
import { TimelineClipData } from './hooks/useTimelineState';
import { ClipTrimModal } from './ClipTrimModal';
import { Scissors } from 'lucide-react';

interface ClipInspectorProps {
    clip: TimelineClipData;
    onVolumeChange: (id: string, volume: number) => void;
    onTransitionChange: (id: string, type?: 'fade' | 'blur' | 'zoom' | 'slide') => void;
    onTransitionDurationChange: (id: string, duration: number) => void;
    onStartTimeChange: (id: string, startTime: number) => void;
    onDurationChange: (id: string, duration: number) => void;
    onTrimSave?: (id: string, inPoint: number, outPoint: number) => void;
    onSwap: (id: string, direction: 'prev' | 'next') => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onClose: () => void;
    isPlaying: boolean;
    isDirty?: boolean;
    isSyncing?: boolean;
    onSync?: () => void;
    onTrackChange?: (id: string, trackId: 'video' | 'broll' | 'audio') => void;
    onRestore?: (id: string) => void;
    isTrimModalOpen: boolean;
    setIsTrimModalOpen: (open: boolean) => void;
    isModal?: boolean;
    onToggleModal?: () => void;
}

export const ClipInspector: React.FC<ClipInspectorProps> = ({
    clip,
    onVolumeChange,
    onTransitionChange,
    onTransitionDurationChange,
    onStartTimeChange,
    onDurationChange,
    onTrimSave,
    onSwap,
    onDelete,
    onDuplicate,
    onClose,
    isPlaying,
    isDirty,
    isSyncing,
    onSync,
    onTrackChange,
    onRestore,
    isTrimModalOpen,
    setIsTrimModalOpen,
    isModal,
    onToggleModal
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [isPreviewMuted, setIsPreviewMuted] = useState(true);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, clip.id]); // Re-sync if clip changes too

    const [localStart, setLocalStart] = useState(clip.startTime.toString());
    const [localDuration, setLocalDuration] = useState(clip.duration.toString());

    useEffect(() => {
        setLocalStart(clip.startTime.toFixed(2));
        setLocalDuration(clip.duration.toFixed(2));
    }, [clip.startTime, clip.duration]);

    const handleStartBlur = () => {
        const val = Math.round(parseFloat(localStart) * 100) / 100;
        if (!isNaN(val) && val >= 0) {
            console.log(`[ClipInspector] Committing Start Blur: ${val}`);
            onStartTimeChange(clip.id, val);
        } else {
            setLocalStart(clip.startTime.toFixed(2));
        }
    };

    const handleDurationBlur = () => {
        let val = Math.round(parseFloat(localDuration) * 100) / 100;
        if (!isNaN(val) && val > 0.1) {
            if (clip.sourceDuration != null && val > clip.sourceDuration) {
                val = clip.sourceDuration;
                console.info(`[ClipInspector] Clamped Duration Blur to source cap: ${val}`);
            }
            console.log(`[ClipInspector] Committing Duration Blur: ${val}`);
            setLocalDuration(val.toFixed(2));
            onDurationChange(clip.id, val);
        } else {
            setLocalDuration(clip.duration.toFixed(2));
        }
    };

    const stepStart = (delta: number) => {
        const newVal = Math.round((clip.startTime + delta) * 100) / 100;
        const clamped = Math.max(0, newVal);
        console.info(`[ClipInspector] Optimistic Start: ${clamped}`);
        setLocalStart(clamped.toFixed(2));
        onStartTimeChange(clip.id, clamped);
    };

    const stepDuration = (delta: number) => {
        let newVal = Math.round((clip.duration + delta) * 100) / 100;
        if (clip.sourceDuration != null && newVal > clip.sourceDuration) {
            newVal = clip.sourceDuration;
        }
        const clamped = Math.max(0.1, newVal);
        console.info(`[ClipInspector] Optimistic Duration: ${clamped}`);
        setLocalDuration(clamped.toFixed(2));
        onDurationChange(clip.id, clamped);
    };
    const transitions = [
        { id: 'fade', label: 'Fade', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 'blur', label: 'Blur', icon: Droplets, color: 'text-teal-400', bg: 'bg-teal-400/10' },
        { id: 'zoom', label: 'Zoom', icon: Maximize2, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
        { id: 'slide', label: 'Slide', icon: ArrowRight, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    ] as const;

    return (
        <motion.div
            initial={isModal ? { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' } : { x: 350 }}
            animate={isModal ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { x: 0 }}
            exit={isModal ? { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' } : { x: 350 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
                ${isModal 
                    ? 'fixed left-1/2 top-1/2 w-[95vw] max-w-4xl max-h-[90vh] rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)]' 
                    : 'absolute right-0 top-0 bottom-0 w-80 shadow-[-10px_0_40px_rgba(0,0,0,0.5)]'}
                bg-slate-900/95 backdrop-blur-3xl border border-white/10 z-[100] flex flex-col
            `}
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-white/5 ${isModal ? 'sm:p-6' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <Layers size={14} className="text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest leading-none">Clip Inspector</h3>
                        {isModal && <span className="text-[10px] text-slate-500 mt-1 font-medium">Advanced Settings Control</span>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {onToggleModal && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleModal(); }}
                            className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400 hover:text-white transition-all border border-blue-500/20 group/toggle"
                            title={isModal ? "Collapse to Panel" : "Expand to Modal"}
                        >
                            {isModal ? <ArrowLeftRight size={16} /> : <Maximize2 size={16} className="group-hover/toggle:scale-110 transition-transform" />}
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                    {isDirty && !isSyncing && onSync && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSync(); }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5"
                        >
                            <RefreshCw size={10} />
                            Sync
                        </button>
                    )}
                    {isSyncing && (
                        <div className="bg-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white animate-pulse flex items-center gap-1.5">
                            <RefreshCw size={10} className="animate-spin" />
                            Wait
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Backdrop (Only for Modal Mode) */}
            {isModal && (
                <div 
                    className="fixed inset-0 -z-10 bg-slate-950/60 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <div className={`flex-1 overflow-y-auto p-5 custom-scrollbar relative ${isModal ? 'sm:p-8' : 'space-y-8'}`}>
                {/* Visual Preview Card */}
                <div className={`
                    ${isModal ? 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8' : 'space-y-3 mb-8'}
                `}>
                    <div className="space-y-3">
                        <div className={`aspect-video rounded-xl bg-slate-950 border overflow-hidden relative group transition-all duration-500 ${isDirty ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'border-white/5'}`}>
                        {isDirty && !isSyncing && (
                            <div className="absolute top-3 right-3 z-40 flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full backdrop-blur-md animate-pulse">
                                <AlertTriangle size={8} className="text-amber-500" />
                                <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">Unsaved Changes</span>
                            </div>
                        )}
                        {(() => {
                            const isVideo = !!(clip.videoUrl || clip.imageUrl?.match(/\.(mp4|webm|mov|ogg)(?:\?.*)?$/i));
                            const activeVideoUrl = clip.videoUrl || (isVideo ? clip.imageUrl : undefined);
                            
                            return isVideo ? (
                                <div className="relative w-full h-full group/preview">
                                    <video
                                        ref={videoRef}
                                        src={activeVideoUrl}
                                        className="w-full h-full object-cover opacity-90"
                                        muted={isPreviewMuted}
                                        playsInline
                                        loop
                                    />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsPreviewMuted(!isPreviewMuted); }}
                                        className="absolute bottom-3 left-3 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/preview:opacity-100 transition-opacity z-50 border border-white/10"
                                    >
                                        {isPreviewMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                    </button>
                                </div>
                            ) : clip.imageUrl ? (
                                <img src={clip.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Zap size={24} className="text-slate-800" />
                                </div>
                            );
                        })()}

                        {/* Transition Badge (Synced with Timeline) */}
                        {clip.transitionType && (
                            <div className={`
                                absolute top-3 right-3 px-2 py-1 rounded-lg border backdrop-blur-md shadow-2xl z-20 
                                flex items-center gap-1.5 transition-all duration-300
                                ${clip.transitionType === 'fade' ? 'bg-blue-950/80 border-blue-500/30' : 
                                  clip.transitionType === 'blur' ? 'bg-teal-950/80 border-teal-500/30' : 
                                  clip.transitionType === 'zoom' ? 'bg-indigo-950/80 border-indigo-500/30' : 
                                  'bg-amber-950/80 border-amber-500/30'}
                            `}>
                                {React.createElement(transitions.find(t => t.id === clip.transitionType)?.icon || Zap, {
                                    size: 10,
                                    className: clip.transitionType === 'fade' ? 'text-blue-400' :
                                               clip.transitionType === 'blur' ? 'text-teal-400' :
                                               clip.transitionType === 'zoom' ? 'text-indigo-400' :
                                               'text-amber-400'
                                })}
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/90">{clip.transitionType}</span>
                            </div>
                        )}

                        {/* Transition Visual Overlays (Visual Feedback) */}
                        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none overflow-hidden" 
                             style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 100%)' }}>
                            
                            {clip.transitionType === 'fade' && (
                                <div className="w-full h-full bg-blue-500/10 border-l-2 border-blue-500/50">
                                    <svg width="100%" height="100%" preserveAspectRatio="none" className="opacity-40">
                                        <path d="M 0 100 L 100 0 L 100 100 Z" fill="rgba(59, 130, 246, 0.2)" />
                                    </svg>
                                </div>
                            )}

                            {clip.transitionType === 'blur' && (
                                <div className="w-full h-full bg-teal-500/5 border-l-2 border-teal-500/50 backdrop-blur-[8px]">
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-transparent" />
                                </div>
                            )}

                            {clip.transitionType === 'zoom' && (
                                <div className="w-full h-full bg-indigo-500/10 border-l-2 border-indigo-500/50 relative">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                        <div className="w-3/4 h-3/4 border border-indigo-400 rounded scale-90" />
                                    </div>
                                </div>
                            )}

                            {clip.transitionType === 'slide' && (
                                <div className="w-full h-full bg-amber-500/10 border-l-2 border-amber-500/50 relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent" />
                                    <div className="absolute top-1/2 left-2 -translate-y-1/2 opacity-50">
                                        <ArrowRight size={12} className="text-amber-400" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4">
                            {!(clip.videoUrl || clip.imageUrl?.match(/\.(mp4|webm|mov|ogg)$/i)) && <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Image Scene</div>}
                            <p className="text-xs text-white/90 font-medium line-clamp-2 leading-relaxed">{clip.cueDescription}</p>
                        </div>
                        </div>

                        {/* Precision Trim Action */}
                        {(clip.videoUrl || clip.imageUrl?.match(/\.(mp4|webm|mov|ogg)(?:\?.*)?$/i)) && (
                            <button 
                                onClick={() => setIsTrimModalOpen(true)}
                                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-xl text-slate-400 hover:text-amber-400 transition-all font-bold group"
                            >
                                <Scissors size={14} className="group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] uppercase tracking-widest">Preview & Trim Tool</span>
                            </button>
                        )}
                    </div>

                    {/* Modal Sidebar (Column 2 in Modal Mode) */}
                    <div className={isModal ? 'space-y-3' : ''}>
                        {/* Transitions */}
                        <section className="space-y-2.5 pt-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-blue-400" />
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transitions</h4>
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                            {transitions.map((t) => {
                                const isActive = clip.transitionType === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onTransitionChange(clip.id, isActive ? undefined : t.id)}
                                        className={`
                                            flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all border duration-300
                                            ${isActive 
                                                ? `${t.bg.replace('/10', '/30')} border-white/20 shadow-lg scale-105 ${t.color}` 
                                                : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:border-white/5'
                                            }
                                        `}
                                    >
                                        <t.icon size={18} className={isActive ? t.color : 'text-slate-500 group-hover:text-white'} />
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                            {t.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {clip.transitionType && (
                            <div className="space-y-4 pt-3">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Transition Duration</span>
                                        <span className="text-[10px] font-mono font-bold text-blue-400">{(clip.transitionDuration / 1000).toFixed(1)}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="4000"
                                        step="100"
                                        value={clip.transitionDuration ?? 1000}
                                        onChange={(e) => onTransitionDurationChange(clip.id, parseInt(e.target.value))}
                                        className="w-full h-1 bg-slate-800 appearance-none rounded-full accent-blue-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Info Grid */}
                <div className="space-y-2.5 pt-3">
                    {/* Removed duplicate mini-sync bar to reduce clutter, since the big one handles it */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Start Time Field */}
                        <div className="bg-white/5 hover:bg-white/[0.08] p-3 rounded-xl border border-white/5 transition-colors focus-within:border-blue-500/50 group/input">
                            <div className="flex items-center justify-between text-slate-500 mb-2">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="text-blue-400/70" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Start Time</span>
                                </div>
                                <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                    <button 
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); stepStart(-0.5); }}
                                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    >
                                        <Minus size={10} />
                                    </button>
                                    <button 
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); stepStart(0.5); }}
                                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    >
                                        <Plus size={10} />
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={localStart}
                                onChange={(e) => setLocalStart(e.target.value)}
                                onBlur={handleStartBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleStartBlur()}
                                className="bg-transparent text-sm font-mono font-bold text-white w-full focus:outline-none"
                            />
                        </div>

                        {/* Duration Field */}
                        <div className="bg-white/5 hover:bg-white/[0.08] p-3 rounded-xl border border-white/5 transition-colors focus-within:border-blue-500/50 group/input">
                            <div className="flex items-center justify-between text-slate-500 mb-2">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="text-blue-400/70" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duration</span>
                                </div>
                                <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                    <button 
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); stepDuration(-0.5); }}
                                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    >
                                        <Minus size={10} />
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={clip.sourceDuration != null && clip.duration >= clip.sourceDuration}
                                        onMouseDown={(e) => { e.preventDefault(); stepDuration(0.5); }}
                                        className={`p-1 rounded transition-colors ${
                                            clip.sourceDuration != null && clip.duration >= clip.sourceDuration 
                                                ? 'text-slate-600 cursor-not-allowed bg-transparent focus:outline-none' 
                                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <Plus size={10} />
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={localDuration}
                                onChange={(e) => setLocalDuration(e.target.value)}
                                onBlur={handleDurationBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleDurationBlur()}
                                className="bg-transparent text-sm font-mono font-bold text-white w-full focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Audio Controls */}
                <section className="space-y-2.5 pt-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Volume2 size={14} className="text-teal-400" />
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gain Control</h4>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => onVolumeChange(clip.id, (clip.volume ?? 1.0) > 0 ? 0 : 1.0)}
                                className={`p-1.5 rounded-lg transition-all ${ (clip.volume ?? 1.0) === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-400 hover:text-teal-400 border border-transparent hover:border-teal-500/30' }`}
                            >
                                { (clip.volume ?? 1.0) === 0 ? <VolumeX size={12} /> : <Volume2 size={12} /> }
                            </button>
                            <span className="text-[10px] font-mono font-bold text-teal-400">
                                {Math.round((clip.volume ?? 1.0) * 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={clip.volume ?? 1.0}
                            onChange={(e) => onVolumeChange(clip.id, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 appearance-none rounded-full accent-teal-400 cursor-pointer"
                        />
                    </div>
                </section>

                {/* Track Location */}
                <section className="space-y-2.5 pt-3">
                    <div className="flex items-center gap-2">
                        <Layers size={14} className="text-indigo-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Track Location</h4>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        {(['video', 'broll', 'audio'] as const).map(tid => {
                            const isActive = clip.trackId === tid;
                            return (
                                <button
                                    key={tid}
                                    disabled={!onTrackChange}
                                    onClick={() => onTrackChange?.(clip.id, tid)}
                                    className={`
                                        flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                                        ${isActive 
                                            ? `bg-${tid === 'video' ? 'blue' : tid === 'broll' ? 'purple' : 'teal'}-600 text-white shadow-lg` 
                                            : 'text-slate-500 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    {tid === 'broll' ? 'B-Roll' : tid}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Reorder / Swap */}
                <section className="space-y-2.5 pt-3">
                    <div className="flex items-center gap-2">
                        <ArrowLeftRight size={14} className="text-amber-400" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Swap Order</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onSwap(clip.id, 'prev')}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 flex flex-col items-center gap-1 group transition-colors"
                        >
                            <ArrowLeft size={16} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Previous Clip</span>
                        </button>
                        <button
                            onClick={() => onSwap(clip.id, 'next')}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 flex flex-col items-center gap-1 group transition-colors"
                        >
                            <ArrowRight size={16} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Next Clip</span>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    </div>

    <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    `}</style>
</motion.div>
    );
};
