'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Scissors, Clock, Film, RefreshCw, Undo, Redo, Magnet } from 'lucide-react';

interface TimelineToolbarProps {
    totalDuration: number;
    clipCount: number;
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onResetTimeline?: () => void;
    isMediaBinOpen?: boolean;
    onToggleMediaBin?: () => void;
    isDirty?: boolean;
    isSyncing?: boolean;
    onSync?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    snapEnabled?: boolean;
    onToggleSnap?: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
    totalDuration,
    clipCount,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onResetTimeline,
    isMediaBinOpen,
    onToggleMediaBin,
    isDirty,
    isSyncing,
    onSync,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    snapEnabled,
    onToggleSnap,
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/5 shrink-0">
            {/* Left: stats + reset */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg">
                    <Scissors size={12} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-300 font-mono">{clipCount} clips</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Clock size={12} className="text-blue-400" />
                    <span className="text-xs font-bold text-blue-400 font-mono">
                        {Math.round(totalDuration)}s total
                    </span>
                </div>
                
                {onResetTimeline && (
                    <button
                        onClick={onResetTimeline}
                        className="px-3 py-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all group"
                        title="Discard all track edits and re-generate the timeline from narration text"
                    >
                        <span className="group-hover:rotate-180 transition-transform duration-500">🔄</span>
                        Regenerate Baseline
                    </button>
                )}
            </div>

            {/* Right Group: Zoom, History, Media, Sync */}
            <div className="flex items-center gap-4">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-950/50 border border-white/10 rounded-xl overflow-hidden p-0.5">
                    <button
                        onClick={onZoomOut}
                        className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors rounded-lg"
                        title="Zoom out"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <button
                        onClick={onResetZoom}
                        className="px-2 py-1 text-[10px] font-mono font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-colors rounded-lg min-w-[40px] text-center"
                        title="Reset zoom"
                    >
                        {Math.round(zoomLevel * 2.5)}%
                    </button>
                    <button
                        onClick={onZoomIn}
                        className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors rounded-lg"
                        title="Zoom in"
                    >
                        <ZoomIn size={14} />
                    </button>
                </div>

                {/* Snap Toggle */}
                {onToggleSnap && (
                    <button
                        onClick={onToggleSnap}
                        className={`p-1.5 rounded-xl border transition-all ${
                            snapEnabled
                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-400 shadow-lg shadow-violet-500/10'
                                : 'bg-slate-950/50 border-white/10 text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                        title={snapEnabled ? 'Snap ON — click to disable' : 'Snap OFF — click to enable'}
                    >
                        <Magnet size={14} />
                    </button>
                )}

                {/* History Controls */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">History</span>
                    <div className="flex items-center bg-slate-950/50 border border-white/10 rounded-xl overflow-hidden p-0.5 shadow-inner">
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`p-2 transition-all rounded-lg ${canUndo ? 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 shadow-lg shadow-blue-500/10' : 'text-slate-800 cursor-not-allowed opacity-30 italic'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={16} />
                        </button>
                        <div className="w-px h-5 bg-white/5 mx-0.5" />
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`p-2 transition-all rounded-lg ${canRedo ? 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 shadow-lg shadow-blue-500/10' : 'text-slate-800 cursor-not-allowed opacity-30'}`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={16} />
                        </button>
                    </div>
                </div>

                <div className="w-px h-6 bg-white/5 mx-1" />

                {isDirty && !isSyncing && onSync && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSync(); }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <RefreshCw size={12} strokeWidth={3} />
                        Update Preview
                    </button>
                )}
                
                {isSyncing && (
                    <div className="bg-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white animate-pulse flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <RefreshCw size={12} className="animate-spin" />
                        Syncing...
                    </div>
                )}

                {onToggleMediaBin && (
                    <button
                        onClick={onToggleMediaBin}
                        className={`
                            px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all 
                            ${isMediaBinOpen 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'}
                        `}
                        title="Toggle Asset Library"
                    >
                        <Film size={14} />
                        Media Bin
                    </button>
                )}
            </div>
        </div>
    );
};
