'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Scissors, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { TimelineClipData } from './hooks/useTimelineState';

interface ClipTrimModalProps {
    isOpen: boolean;
    onClose: () => void;
    clip: TimelineClipData;
    onSave: (inPoint: number, outPoint: number) => void;
}

export const ClipTrimModal: React.FC<ClipTrimModalProps> = ({
    isOpen,
    onClose,
    clip,
    onSave
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    
    // We assume the video metadata will supply sourceDuration if clip.sourceDuration is missing.
    const [sourceDuration, setSourceDuration] = useState(clip.sourceDuration || 10);
    const [currentTime, setCurrentTime] = useState(0);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    const [inPoint, setInPoint] = useState(clip.inPoint ?? 0);
    const [outPoint, setOutPoint] = useState(clip.outPoint ?? (clip.sourceDuration || clip.duration));

    useEffect(() => {
        if (isOpen) {
            setInPoint(clip.inPoint ?? 0);
            const initialOut = clip.outPoint ?? (clip.sourceDuration || Math.max(clip.duration, 0.1));
            setOutPoint(initialOut);
            setCurrentTime(clip.inPoint ?? 0);
            setIsVideoLoaded(false); // Reset to false and let the video re-report
            
            // Critical fix: Handle cached or pre-loaded metadata
            if (videoRef.current) {
                videoRef.current.currentTime = clip.inPoint ?? 0;
                if (videoRef.current.readyState >= 1) {
                    handleLoadedMetadata();
                }
            }
        } else {
            setIsPlaying(false);
            setIsVideoLoaded(false);
        }
    }, [isOpen, clip]);

    // Ensure outPoint is always within sourceDuration when it updates
    useEffect(() => {
        if (sourceDuration > 0 && outPoint > sourceDuration) {
            setOutPoint(sourceDuration);
        }
    }, [sourceDuration]);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;
            if (duration && isFinite(duration)) {
                setSourceDuration(duration);
                setIsVideoLoaded(true);
                // Auto-clamp if the previous outPoint was beyond the new duration
                if (outPoint > duration) {
                    setOutPoint(duration);
                }
            }
        }
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        
        // Loop behavior within the trimmed segment
        if (time >= outPoint && isPlaying) {
            videoRef.current.currentTime = inPoint;
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                if (videoRef.current.currentTime >= outPoint) {
                    videoRef.current.currentTime = inPoint;
                }
                videoRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
        setCurrentTime(time);
    };

    const handleInPointChange = (val: number) => {
        const newIn = Math.min(Math.max(0, val), outPoint - 0.5); // Ensure at least 0.5s duration
        setInPoint(newIn);
        if (videoRef.current) videoRef.current.currentTime = newIn;
    };

    const handleOutPointChange = (val: number) => {
        const newOut = Math.max(Math.min(sourceDuration, val), inPoint + 0.5);
        setOutPoint(newOut);
        if (videoRef.current) videoRef.current.currentTime = Math.max(inPoint, newOut - 0.5);
    };

    const handleSave = () => {
        if (!isVideoLoaded) return;
        onSave(Math.round(inPoint * 100) / 100, Math.round(outPoint * 100) / 100);
        onClose();
    };

    return (
        <div className="clip-trim-modal-wrapper">
            <AnimatePresence>
                {isOpen && clip && (
                    <div className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center p-4 sm:p-12" key="trim-modal-root">
                        {/* High-Contrast Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/95 backdrop-blur-md pointer-events-auto"
                            onClick={onClose}
                        />

                        {/* Focus Modal */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            key={`trim-modal-content-${clip.id}`}
                            className="w-full max-w-5xl h-full max-h-[85vh] bg-slate-900/40 border border-white/10 rounded-3xl shadow-[0_50px_150px_rgba(0,0,0,1)] pointer-events-auto flex flex-col overflow-hidden relative z-10"
                        >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                    <Scissors size={16} className="text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Preview & Trim</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">Review the segment that will be played in the timeline.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 sm:gap-6 custom-scrollbar">
                            {/* Video Player - Constrained height to keep footer visible */}
                            <div className="w-full max-h-[40vh] aspect-video bg-black rounded-lg overflow-hidden relative border border-white/5 shadow-inner">
                                <video
                                    ref={videoRef}
                                    src={clip.videoUrl || (clip.imageUrl?.match(/\.(mp4|webm|mov|ogg)$/i) ? clip.imageUrl : undefined)}
                                    className="w-full h-full object-contain"
                                    muted={isMuted}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onTimeUpdate={handleTimeUpdate}
                                    onClick={togglePlay}
                                    onError={(e) => {
                                        console.error('Video load error inside Trim modal:', e);
                                        // Force state to show UI so user isn't stuck with a spinner
                                        setIsVideoLoaded(true); 
                                    }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent h-12 pointer-events-none" />
                                
                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                    <button 
                                        onClick={togglePlay}
                                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all shadow-lg active:scale-95"
                                    >
                                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                                    </button>

                                    <button 
                                        onClick={() => setIsMuted(!isMuted)}
                                        className={`p-2 backdrop-blur-md rounded-xl transition-all shadow-lg active:scale-95 ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                    >
                                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                    </button>
                                </div>

                                <div className="absolute bottom-4 right-3 text-[10px] font-mono font-bold text-white/80 bg-black/60 px-2 py-1 rounded shadow-lg backdrop-blur-md">
                                    {currentTime.toFixed(1)} / {sourceDuration.toFixed(1)}s
                                </div>
                            </div>

                            {/* Trim Controls */}
                            <div className="space-y-6">
                                {/* Scrubber */}
                                <div className="relative h-10 w-full px-2">
                                    {/* Track */}
                                    <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                                        {/* Highlight region */}
                                        <div 
                                            className="absolute top-0 bottom-0 bg-amber-500/30 border-y border-amber-500/50"
                                            style={{ 
                                                left: `${(inPoint / sourceDuration) * 100}%`,
                                                width: `${((outPoint - inPoint) / sourceDuration) * 100}%` 
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Playhead */}
                                    <div 
                                        className="absolute top-0 bottom-0 w-px bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20 pointer-events-none"
                                        style={{ left: `calc(${2 + ((currentTime / sourceDuration) * 96)}%)` }}
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-sm" />
                                    </div>

                                    {/* Invisible Scrubber overlay */}
                                    <input 
                                        type="range"
                                        min="0"
                                        max={sourceDuration}
                                        step="0.05"
                                        value={currentTime}
                                        onChange={handleSeek}
                                        className="absolute inset-y-0 left-2 right-2 w-[calc(100%-16px)] opacity-0 cursor-pointer z-30"
                                    />
                                </div>

                                {/* Inputs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Trim In</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number"
                                                min="0"
                                                max={outPoint - 0.5}
                                                step="0.1"
                                                value={inPoint}
                                                onChange={(e) => handleInPointChange(parseFloat(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-none transition-colors"
                                            />
                                            <span className="text-xs font-mono text-slate-500">sec</span>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Trim Out</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number"
                                                min={inPoint + 0.5}
                                                max={sourceDuration}
                                                step="0.1"
                                                value={outPoint}
                                                onChange={(e) => handleOutPointChange(parseFloat(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-none transition-colors"
                                            />
                                            <span className="text-xs font-mono text-slate-500">sec</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Warnings & Meta */}
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 text-[10px] text-amber-500/80">
                                    <AlertTriangle size={12} />
                                    <span>Trimming will alter the timeline block duration.</span>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">New Duration: </span>
                                    <span className="text-amber-400 font-mono text-xs">{(outPoint - inPoint).toFixed(2)}s</span>
                                </div>
                            </div>
                        </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-950/50 border-t border-white/5 flex justify-end gap-3 shrink-0">
                                <button 
                                    onClick={onClose}
                                    className="px-5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={!isVideoLoaded || (outPoint - inPoint < 0.1)}
                                    className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] ${
                                        isVideoLoaded 
                                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    {!isVideoLoaded ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                                            Wait...
                                        </div>
                                    ) : 'Apply Trim'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
        </div>
    );
};
