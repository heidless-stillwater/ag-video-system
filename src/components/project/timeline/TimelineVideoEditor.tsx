import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Script } from '@/types';
import { videoEngine } from '@/lib/services/video-engine';
import { Film, Mic, Volume2, Music, Scissors, Play, Pause, SkipBack, SkipForward, Square } from 'lucide-react';

interface TimelineVideoEditorProps {
    script: Script;
}

const PIXELS_PER_SECOND = 40; // Base zoom level

export const TimelineVideoEditor: React.FC<TimelineVideoEditorProps> = ({ script }) => {
    // 1. Calculate absolute timeline
    const timeline = useMemo(() => {
        try {
            return videoEngine.calculateTimeline(script);
        } catch (e) {
            console.error('Error calculating timeline:', e);
            return [];
        }
    }, [script]);

    const totalDuration = timeline.length > 0 
        ? timeline[timeline.length - 1].startTime + timeline[timeline.length - 1].duration 
        : 0;

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Playback Loop
    useEffect(() => {
        if (!isPlaying) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const tick = (time: number) => {
            if (lastTimeRef.current === 0) lastTimeRef.current = time;
            const deltaMs = time - lastTimeRef.current;
            lastTimeRef.current = time;

            setCurrentTime(prev => {
                const next = prev + (deltaMs / 1000);
                if (next >= totalDuration) {
                    setIsPlaying(false);
                    return totalDuration;
                }
                return next;
            });

            if (isPlaying) {
                animationRef.current = requestAnimationFrame(tick);
            }
        };

        lastTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(tick);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, totalDuration]);

    const handlePlayPause = () => {
        if (!isPlaying && currentTime >= totalDuration) {
            setCurrentTime(0); // Auto-rewind if at end
        }
        setIsPlaying(!isPlaying);
    };

    const handleStop = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (seconds: number) => {
        setCurrentTime(prev => Math.max(0, Math.min(totalDuration, prev + seconds)));
    };

    // 2. Derive visual section boundaries for the voiceover track
    const sectionBoundaries = useMemo(() => {
        const boundaries: Record<string, { start: number, duration: number }> = {};
        script.sections.forEach(section => {
            const scenes = timeline.filter(s => s.sectionId === section.id);
            if (scenes.length > 0) {
                const start = scenes[0].startTime;
                const end = scenes[scenes.length - 1].startTime + scenes[scenes.length - 1].duration;
                boundaries[section.id] = { start, duration: end - start };
            }
        });
        return boundaries;
    }, [script, timeline]);

    // 3. Generate Ruler Ticks
    const renderRulerTicks = () => {
        const ticks = [];
        const interval = 5; // Every 5 seconds
        const totalTicks = Math.ceil(totalDuration / interval);
        
        for (let i = 0; i <= totalTicks; i++) {
            const time = i * interval;
            const left = time * PIXELS_PER_SECOND;
            ticks.push(
                <div key={i} className="absolute top-0 bottom-0 border-l border-white/10 flex flex-col" style={{ left: `${left}px` }}>
                    <span className="absolute top-1 left-1 text-[9px] text-slate-500 font-mono font-bold">{time}s</span>
                    <div className="mt-auto h-2 w-px bg-white/20"></div>
                </div>
            );
        }
        return ticks;
    };

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-md shadow-2xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Timeline View</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Read-only overview of your project's multi-track layout.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden shadow-inner">
                        <button onClick={() => handleSeek(-5)} className="p-2.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Backward 5s">
                            <SkipBack size={14} />
                        </button>
                        <button onClick={handlePlayPause} className={`px-4 py-2 flex items-center gap-2 font-bold transition-colors ${isPlaying ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}>
                            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                            <span className="text-xs uppercase tracking-wider">{isPlaying ? 'Pause' : 'Play'}</span>
                        </button>
                        <button onClick={handleStop} className="p-2.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors" title="Stop">
                            <Square size={14} />
                        </button>
                        <button onClick={() => handleSeek(5)} className="p-2.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-l border-slate-800/50" title="Forward 5s">
                            <SkipForward size={14} />
                        </button>
                    </div>
                
                     <div className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl flex items-center gap-2 shadow-inner">
                        <Scissors size={14} className="text-slate-400" />
                        <span className="text-slate-300 font-mono font-bold text-sm">
                            {timeline.length} Cuts
                        </span>
                    </div>
                    <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <span className="text-blue-400 font-mono font-bold text-sm uppercase tracking-widest">
                            {Math.round(totalDuration)}s Total
                        </span>
                    </div>
                </div>
            </div>

            {/* Timeline Editor Container */}
            <div className="flex border border-white/5 rounded-2xl bg-slate-950 shadow-inner relative overflow-hidden h-[480px]">
                
                {/* Fixed Track Headers (Left Sidebar) */}
                <div className="w-48 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                    
                    {/* Empty corner for ruler */}
                    <div className="h-10 border-b border-slate-800 bg-slate-900 flex items-center px-4 shrink-0">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tracks</span>
                    </div>
                    
                    {/* Video Track Header */}
                    <div className="h-32 border-b border-slate-800 flex flex-col justify-center px-4 bg-slate-900/50 relative group">
                        <div className="absolute inset-y-0 left-0 w-1 bg-blue-500/50 rounded-r-md"></div>
                        <div className="flex items-center gap-2">
                            <Film size={14} className="text-blue-400" />
                            <span className="text-xs font-bold text-slate-300">Video</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Visual Cues & Clips</span>
                    </div>

                    {/* Narration Track Header */}
                    <div className="h-24 border-b border-slate-800 flex flex-col justify-center px-4 bg-slate-900/50 relative group">
                        <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500/50 rounded-r-md"></div>
                        <div className="flex items-center gap-2">
                            <Mic size={14} className="text-indigo-400" />
                            <span className="text-xs font-bold text-slate-300">Voiceover</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Script Sections</span>
                    </div>

                    {/* SFX Track Header */}
                    <div className="h-20 border-b border-slate-800 flex flex-col justify-center px-4 bg-slate-900/50 relative group">
                        <div className="absolute inset-y-0 left-0 w-1 bg-teal-500/50 rounded-r-md"></div>
                        <div className="flex items-center gap-2">
                            <Volume2 size={14} className="text-teal-400" />
                            <span className="text-xs font-bold text-slate-300">Effects</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Ambient Audio</span>
                    </div>
                    
                    {/* Music Track Header */}
                    <div className="flex-1 flex flex-col justify-center px-4 bg-slate-900/50 relative group min-h-[64px]">
                        <div className="absolute inset-y-0 left-0 w-1 bg-purple-500/50 rounded-r-md"></div>
                        <div className="flex items-center gap-2">
                            <Music size={14} className="text-purple-400" />
                            <span className="text-xs font-bold text-slate-300">Score</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Timeline Area (Right Side) */}
                <div className="flex-1 overflow-x-auto relative custom-scrollbar select-none scroll-smooth">
                    
                    {/* Background Grid Lines (1s intervals) */}
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                         style={{
                             backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                             backgroundSize: `${PIXELS_PER_SECOND}px 100%`,
                             width: `${Math.max(100, totalDuration) * PIXELS_PER_SECOND}px`
                         }}>
                    </div>

                    {/* Time Ruler (Sticky Top) */}
                    <div className="h-10 border-b border-slate-800 relative bg-slate-900/90 backdrop-blur-md sticky top-0 z-10" 
                         style={{ width: `${Math.max(800, totalDuration * PIXELS_PER_SECOND + 200)}px` }}>
                         {renderRulerTicks()}
                    </div>

                    {/* Tracks Container */}
                    <div className="relative" style={{ width: `${totalDuration * PIXELS_PER_SECOND + 200}px` }}> {/* Add 200px padding at end */}
                        
                        {/* Playhead (Animated) */}
                        <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none transition-transform duration-[50ms] ease-linear"
                            style={{ transform: `translateX(${currentTime * PIXELS_PER_SECOND}px)` }}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 cursor-ew-resize rounded-b flex items-center justify-center">
                                <div className="w-px h-2 bg-black/50"></div>
                            </div>
                            <div className="absolute top-5 left-2 bg-red-500/90 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap text-white">
                                {currentTime.toFixed(1)}s
                            </div>
                        </div>

                        {/* Video Track Content */}
                        <div className="h-32 border-b border-slate-800 relative group/track">
                            {timeline.map((scene) => (
                                <div 
                                    key={scene.id} 
                                    className="absolute top-2 bottom-2 bg-slate-800 rounded-lg border border-slate-600 overflow-hidden flex flex-col transition-colors hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] cursor-pointer group/clip"
                                    style={{ 
                                        left: `${scene.startTime * PIXELS_PER_SECOND}px`, 
                                        width: `${Math.max(4, scene.duration * PIXELS_PER_SECOND)}px` // Min width 4px
                                    }}
                                    title={`Scene offset: ${scene.startTime}s\nDuration: ${scene.duration}s\n${scene.cueDescription}`}
                                >
                                    <div className="h-full w-full relative">
                                        {/* Image Background */}
                                        {scene.imageUrl ? (
                                            <img src={scene.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/clip:opacity-80 transition-opacity pointer-events-none" alt="" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                                <Film size={16} className="text-slate-600" />
                                            </div>
                                        )}
                                        {/* Video Icon Indicator */}
                                        {scene.videoUrl && (
                                             <div className="absolute top-1 right-1 bg-black/50 p-0.5 rounded backdrop-blur-sm">
                                                 <Film size={10} className="text-purple-400" />
                                             </div>
                                        )}
                                        {/* Transition indicator */}
                                        <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-blue-500/20 to-transparent pointer-events-none border-l border-blue-500/30"></div>
                                        {/* Label */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-4 pointer-events-none">
                                            <p className="text-[9px] text-white/90 font-medium truncate drop-shadow-md">{scene.cueDescription}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Voiceover Track Content */}
                        <div className="h-24 border-b border-slate-800 relative group/track">
                            {script.sections.map(section => {
                                const bounds = sectionBoundaries[section.id];
                                if (!bounds) return null;
                                return (
                                    <div 
                                        key={`vo-${section.id}`} 
                                        className="absolute top-2 bottom-2 bg-indigo-900/20 rounded-lg border border-indigo-500/30 overflow-hidden flex flex-col transition-colors hover:border-indigo-400 hover:bg-indigo-900/40 cursor-pointer p-2 shadow-inner"
                                        style={{ 
                                            left: `${bounds.start * PIXELS_PER_SECOND}px`, 
                                            width: `${Math.max(10, bounds.duration * PIXELS_PER_SECOND)}px` 
                                        }}
                                        title={section.content}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
                                            <Mic size={10} className="text-indigo-400 shrink-0" />
                                            <span className="text-[10px] text-indigo-300 font-bold truncate tracking-widest uppercase">{section.title}</span>
                                        </div>
                                        {/* Fake waveform / block texture */}
                                        <div className="flex-1 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iNCIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iIzYzNjZGMSIgZmlsbC1vcGFjaXR5PSIwLjMiLz48cmVjdCB4PSI0IiB5PSIyIiB3aWR0aD0iMiIgaGVpZ2h0PSI2IiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjxyZWN0IHg9IjgiIHk9IjAiIHdpZHRoPSIyIiBoZWlnaHQ9IjEwIiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuOCIvPjxyZWN0IHg9IjEyIiB5PSIzIiB3aWR0aD0iMiIgaGVpZ2h0PSI0IiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuNiIvPjxyZWN0IHg9IjE2IiB5PSI0IiB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjNjM2NkYxIiBmaWxsLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')] bg-repeat opacity-50"></div>
                                        <p className="text-[9px] text-slate-400 truncate mt-1 leading-tight">{section.content}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* SFX Track Content */}
                        <div className="h-20 border-b border-slate-800 relative group/track">
                            {timeline.filter(t => t.sfxUrl).map(scene => {
                                const offsetSeconds = (scene.sfxOffset || 0) / 1000;
                                const start = scene.startTime + offsetSeconds;
                                // Visual duration of SFX is tricky, just show a fixed block size 
                                // (e.g. 5 seconds or actual duration if we knew it)
                                const visualDuration = 5; 
                                return (
                                    <div 
                                        key={`sfx-${scene.id}`} 
                                        className="absolute top-3 bottom-3 bg-teal-900/20 rounded-md border border-teal-500/40 overflow-hidden flex items-center px-2 hover:bg-teal-900/40 hover:border-teal-400 transition-colors cursor-pointer shadow-inner"
                                        style={{ 
                                            left: `${start * PIXELS_PER_SECOND}px`, 
                                            width: `${visualDuration * PIXELS_PER_SECOND}px` 
                                        }}
                                        title={`SFX: ${scene.sfxLabel || 'Ambient Sound'}\nVolume: ${scene.sfxVolume}`}
                                    >
                                        <Volume2 size={12} className="text-teal-400 shrink-0 mr-1.5 opacity-80" />
                                        <span className="text-[9px] text-teal-300 font-bold truncate tracking-wider uppercase opacity-90">{scene.sfxLabel || 'SFX'}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Music Track Content */}
                        <div className="absolute bottom-0 h-16 left-0 right-0 bg-purple-900/5 group/track">
                            {/* A continuous block indicating background music spans the whole project */}
                            <div className="absolute top-2 bottom-2 left-2 right-2 bg-purple-900/20 rounded-md border border-purple-500/20 flex items-center justify-center p-2 group-hover/track:border-purple-500/40 transition-colors">
                                <span className="text-[10px] text-purple-400 font-bold tracking-[0.3em] uppercase opacity-70">
                                    Continuous Background Score Active
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5); /* slate-900 */
                    border-radius: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(51, 65, 85, 0.8); /* slate-700 */
                    border-radius: 8px;
                    border: 2px solid rgba(15, 23, 42, 0.7);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(71, 85, 105, 1); /* slate-600 */
                }
            `}</style>
        </div>
    );
};
