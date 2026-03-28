'use client';

import React, { useRef, useCallback } from 'react';
import { Film, Copy, Trash2, Volume2, Zap, Droplets, Maximize2, ArrowRight } from 'lucide-react';
import { TimelineClipData } from './hooks/useTimelineState';

interface TimelineClipProps {
    clip: TimelineClipData;
    zoomLevel: number;
    isSelected: boolean;
    trackColor: string; // e.g. 'blue' | 'purple'
    onSelect: (id: string) => void;
    onMove: (id: string, deltaX: number, deltaY: number, startDuration?: number) => void;
    onResize: (id: string, newDuration: number) => void;
    onDragStart?: (id: string) => void;
    onTrim?: (id: string, newTimestamp: number, newDuration: number) => void;
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
    onVolumeChange?: (id: string, volume: number) => void;
    onTransitionChange?: (id: string, type?: 'fade' | 'blur' | 'zoom' | 'slide') => void;
    onTransitionDurationChange?: (id: string, duration: number) => void;
    onReplace?: (id: string, newCue: any) => void;
}

const MIN_CLIP_WIDTH_PX = 8;

export const TimelineClip: React.FC<TimelineClipProps> = ({
    clip,
    zoomLevel,
    isSelected,
    trackColor,
    onSelect,
    onMove,
    onResize,
    onDragStart,
    onTrim,
    onDuplicate,
    onDelete,
    onVolumeChange,
    onTransitionChange,
    onTransitionDurationChange,
    onReplace,
}) => {
    const clipRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = React.useState(false);

    const leftPx = clip.startTime * zoomLevel;
    const widthPx = Math.max(MIN_CLIP_WIDTH_PX, clip.duration * zoomLevel);

    // ─── Drag (body) ─────────────────────────────────────────────────────────
    const lastX = useRef(0);
    const lastY = useRef(0);

    const handleBodyPointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).dataset.handle) return; // edge handle takes over
        
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
        
        lastX.current = e.clientX;
        lastY.current = e.clientY;
        onDragStart?.(clip.id); // Push history BEFORE any movement
        onSelect(clip.id);
    }, [clip.id, onSelect, onDragStart]);

    const handleBodyPointerMove = useCallback((e: React.PointerEvent) => {
        if (!(e.buttons & 1)) return;
        const deltaX = e.clientX - lastX.current;
        const deltaY = e.clientY - lastY.current;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return; // Responsive but filtered
        
        lastX.current = e.clientX;
        lastY.current = e.clientY;
        onMove(clip.id, deltaX / zoomLevel, deltaY);
    }, [clip.id, zoomLevel, onMove]);

    // ─── Trim (left edge) ───────────────────────────────────────────────────

    const handleLeftEdgePointerDown = useCallback((e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
        
        lastX.current = e.clientX;
        onDragStart?.(clip.id);
        onSelect(clip.id);
    }, [clip.id, onSelect, onDragStart]);

    const handleLeftEdgePointerMove = useCallback((e: React.PointerEvent) => {
        if (!(e.buttons & 1)) return;
        const deltaX = e.clientX - lastX.current;
        if (Math.abs(deltaX) < 1) return;
        
        const deltaSec = deltaX / zoomLevel;
        lastX.current = e.clientX;
        
        onMove(clip.id, deltaSec, 0);
        onResize(clip.id, -deltaSec); // Shrink from left
    }, [clip.id, zoomLevel, onMove, onResize]);

    // ─── Resize (right edge) ─────────────────────────────────────────────────

    const handleRightEdgePointerDown = useCallback((e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
        
        lastX.current = e.clientX;
        onDragStart?.(clip.id);
        onSelect(clip.id);
    }, [clip.id, onSelect, onDragStart]);

    const handleRightEdgePointerMove = useCallback((e: React.PointerEvent) => {
        if (!(e.buttons & 1)) return;
        const deltaX = e.clientX - lastX.current;
        if (Math.abs(deltaX) < 1) return;
        
        const deltaSec = deltaX / zoomLevel;
        lastX.current = e.clientX;
        onResize(clip.id, clip.duration + deltaSec);
    }, [clip.id, zoomLevel, onResize, clip.duration]);

    // ─── Drag and Drop (Asset Swap) ──────────────────────────────────────────

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        try {
            const cueJson = e.dataTransfer.getData('cue');
            if (!cueJson) return;
            const cue = JSON.parse(cueJson);
            if (onReplace) {
                onReplace(clip.id, cue);
            }
        } catch (err) {
            console.error('Failed to handle drop for replace:', err);
        }
    }, [clip.id, onReplace]);

    // ─── Colour palette ───────────────────────────────────────────────────────
    const colors: Record<string, { border: string; bg: string; dot: string; handle: string }> = {
        blue:   { border: 'border-blue-500/40 hover:border-blue-400',   bg: 'bg-blue-900/20',   dot: 'bg-blue-400', handle: 'bg-blue-400/30 group-hover/handle:bg-blue-400' },
        purple: { border: 'border-purple-500/40 hover:border-purple-400', bg: 'bg-purple-900/20', dot: 'bg-purple-400', handle: 'bg-purple-400/30 group-hover/handle:bg-purple-400' },
        teal:   { border: 'border-teal-500/40 hover:border-teal-400',   bg: 'bg-teal-900/20',   dot: 'bg-teal-400', handle: 'bg-teal-400/30 group-hover/handle:bg-teal-400' },
    };
    const c = colors[trackColor] ?? colors.blue;

    const transitionIcons = {
        fade: Zap,
        blur: Droplets,
        zoom: Maximize2,
        slide: ArrowRight,
    };
    const TransIcon = clip.transitionType ? transitionIcons[clip.transitionType] : null;

    return (
        <div
            ref={clipRef}
            className={`
                absolute top-1 bottom-1 rounded-lg border overflow-visible cursor-grab active:cursor-grabbing
                select-none transition-shadow group/clip
                ${c.bg} ${c.border}
                ${isSelected ? 'ring-2 ring-white/40 shadow-lg shadow-white/10' : ''}
                ${isDragOver ? 'ring-2 ring-indigo-500/80 bg-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-50' : ''}
            `}
            style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
            onPointerDown={handleBodyPointerDown}
            onPointerMove={handleBodyPointerMove}
            onClick={e => e.stopPropagation()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title={`${clip.cueDescription}\n${clip.startTime.toFixed(1)}s → ${(clip.startTime + clip.duration).toFixed(1)}s (${clip.duration.toFixed(1)}s)`}
        >
            {/* Thumbnail */}
            <div className="absolute inset-x-2.5 inset-y-0 rounded-lg overflow-hidden pointer-events-none">
                {clip.imageUrl && (
                    <img
                        src={clip.imageUrl}
                        className="w-full h-full object-cover opacity-50 group-hover/clip:opacity-70 transition-opacity"
                        alt=""
                        draggable={false}
                    />
                )}
                {!clip.imageUrl && (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Film size={12} className="text-slate-600" />
                    </div>
                )}
                {/* Gradient overlay + label */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3">
                    <p className="text-[9px] text-white/80 font-medium truncate">{clip.cueDescription}</p>
                </div>
                {/* Left edge accent */}
                <div className={`absolute inset-y-0 left-0 w-1 ${c.dot} opacity-60 rounded-l-lg`} />
            </div>

            {/* Transition Icon Overlay (Badge) */}
            {TransIcon && (
                <div className={`
                    absolute top-1 right-1 px-1.5 py-0.5 rounded-md border backdrop-blur-md shadow-xl z-20 
                    flex items-center gap-1 transition-all duration-300
                    ${clip.transitionType === 'fade' ? 'bg-blue-950/80 border-blue-500/30' : 
                      clip.transitionType === 'blur' ? 'bg-teal-950/80 border-teal-500/30' : 
                      clip.transitionType === 'zoom' ? 'bg-indigo-950/80 border-indigo-500/30' : 
                      'bg-amber-950/80 border-amber-500/30'}
                `}>
                    <TransIcon size={8} className={
                        clip.transitionType === 'fade' ? 'text-blue-400' :
                        clip.transitionType === 'blur' ? 'text-teal-400' :
                        clip.transitionType === 'zoom' ? 'text-indigo-400' :
                        'text-amber-400'
                    } />
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/90">{clip.transitionType}</span>
                </div>
            )}

            {/* Transition Visual Overlays */}
            <div className="absolute inset-y-0 left-0 pointer-events-none overflow-hidden rounded-l-lg"
                 style={{ width: `${Math.min(widthPx, (clip.transitionDuration || 1000) / 1000 * zoomLevel)}px` }}>
                
                {/* Fade-in Visual Indicator */}
                {clip.transitionType === 'fade' && (
                    <div className="w-full h-full bg-blue-500/10 border-l border-blue-500/50">
                        <svg width="100%" height="100%" preserveAspectRatio="none" className="opacity-60">
                            <linearGradient id="fadeGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                            </linearGradient>
                            <path d="M 0 100 L 100 0 L 100 100 Z" fill="url(#fadeGrad)" />
                            <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" className="text-blue-400/50" />
                        </svg>
                    </div>
                )}

                {/* Blur Visual Indicator */}
                {clip.transitionType === 'blur' && (
                    <div className="w-full h-full bg-teal-500/5 border-l border-teal-500/50 backdrop-blur-[4px] relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-transparent" />
                        <div className="flex h-full w-full items-center justify-around px-1 opacity-20">
                            {[...Array(3)].map((_, i) => (
                                <Droplets key={i} size={8} className="text-teal-400" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Zoom Visual Indicator */}
                {clip.transitionType === 'zoom' && (
                    <div className="w-full h-full bg-indigo-500/10 border-l border-indigo-500/50 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-full opacity-30">
                                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M 10 30 L 10 10 L 30 10" fill="none" stroke="currentColor" strokeWidth="4" className="text-indigo-400" />
                                    <path d="M 70 10 L 90 10 L 90 30" fill="none" stroke="currentColor" strokeWidth="4" className="text-indigo-400" />
                                    <path d="M 90 70 L 90 90 L 70 90" fill="none" stroke="currentColor" strokeWidth="4" className="text-indigo-400" />
                                    <path d="M 30 90 L 10 90 L 10 70" fill="none" stroke="currentColor" strokeWidth="4" className="text-indigo-400" />
                                    <rect x="25" y="25" width="50" height="50" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-400/40 animate-pulse" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Slide Visual Indicator */}
                {clip.transitionType === 'slide' && (
                    <div className="w-full h-full bg-amber-500/10 border-l border-amber-500/50 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-around py-1 opacity-40">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-0.5" style={{ marginLeft: `${i * 4}px` }}>
                                    <div className="h-[1px] w-4 bg-amber-400/50" />
                                    <ArrowRight size={6} className="text-amber-400" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fade-out Visual Indicator (Crossfade Out) */}
            {clip.fadeOutDuration && clip.fadeOutDuration > 0 && (
                <div 
                    className="absolute inset-y-0 right-0 bg-red-500/10 pointer-events-none border-r border-red-500/30 overflow-hidden rounded-r-lg"
                    style={{ width: `${Math.min(widthPx, (clip.fadeOutDuration || 0) / 1000 * zoomLevel)}px` }}
                >
                    <svg width="100%" height="100%" preserveAspectRatio="none" className="opacity-40">
                        <path d="M 0 0 L 100 100 L 0 100 Z" fill="rgba(239, 68, 68, 0.2)" />
                        <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" className="text-red-400/50" />
                    </svg>
                </div>
            )}

            {/* Duration badge */}
            <div className="absolute top-1 left-3 bg-black/50 px-1 py-0.5 rounded text-[8px] font-mono text-white/70 pointer-events-none">
                {clip.duration.toFixed(1)}s
            </div>

            {/* Left-edge trim handle */}
            <div
                data-handle="left"
                className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-10 flex items-center justify-center group/handle"
                onPointerDown={handleLeftEdgePointerDown}
                onPointerMove={handleLeftEdgePointerMove}
                onClick={e => e.stopPropagation()}
            >
                <div className={`w-0.5 h-4 ${c.handle} rounded-full transition-colors`} />
            </div>

            {/* Right-edge resize handle */}
            <div
                data-handle="right"
                className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-10 flex items-center justify-center group/handle"
                onPointerDown={handleRightEdgePointerDown}
                onPointerMove={handleRightEdgePointerMove}
                onClick={e => e.stopPropagation()}
            >
                <div className={`w-0.5 h-4 ${c.handle} rounded-full transition-colors`} />
            </div>
        </div>
    );
};
