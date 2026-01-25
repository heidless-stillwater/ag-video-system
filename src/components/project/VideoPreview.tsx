'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '@/lib/services/video-engine';

interface VideoPreviewProps {
    scenes: Scene[];
    backgroundMusicUrl?: string;
    backgroundMusicVolume?: number;
    onClose: () => void;
}

/**
 * A cinematic, high-fidelity documentary previewer.
 * Supports customizable transitions: fade, blur, zoom, and slide.
 */
export const VideoPreview: React.FC<VideoPreviewProps> = ({ scenes, backgroundMusicUrl, backgroundMusicVolume, onClose }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [absoluteCurrentTime, setAbsoluteCurrentTime] = useState(0);
    const [pendingSeekOffset, setPendingSeekOffset] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const sfxRef = useRef<HTMLAudioElement | null>(null);
    const [error, setAudioError] = useState<string | null>(null);
    const [isNarratorActuallyPlaying, setIsNarratorActuallyPlaying] = useState(false);
    const [showOverlays, setShowOverlays] = useState(true);

    // Double Buffer State
    const [buffer, setBuffer] = useState<{
        active: 'A' | 'B';
        imgA: string | null;
        imgB: string | null;
        zoomA: boolean;
        zoomB: boolean;
    }>({
        active: 'A',
        imgA: scenes[0]?.imageUrl || null,
        imgB: null,
        zoomA: true,
        zoomB: false
    });

    const [isImageReady, setIsImageReady] = useState(true);
    const absoluteCurrentTimeRef = useRef(absoluteCurrentTime);
    const currentSceneIndexRef = useRef(currentSceneIndex);
    const activeSectionIdRef = useRef(scenes[0]?.sectionId);

    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

    // Section Time Offsets
    const sectionTimeOffsets = React.useMemo(() => {
        const offsets: Record<string, number> = {};
        scenes.forEach(s => {
            if (offsets[s.sectionId] === undefined) offsets[s.sectionId] = s.startTime;
        });
        return offsets;
    }, [scenes]);

    const currentScene = scenes[currentSceneIndex];

    const sectionId = currentScene?.sectionId;

    // Handle Time Update
    useEffect(() => {
        if (!isPlaying || !audioRef.current) return;

        const handleTimeUpdate = (e: Event) => {
            const audio = e.target as HTMLAudioElement;
            const currentAudioSectionId = audio.getAttribute('data-section-id');
            if (currentAudioSectionId !== activeSectionIdRef.current) return;

            const absTime = (sectionTimeOffsets[currentAudioSectionId || ''] ?? 0) + audio.currentTime;

            setAbsoluteCurrentTime(absTime);
            absoluteCurrentTimeRef.current = absTime;

            let foundIdx = scenes.findIndex(s =>
                s.sectionId === currentAudioSectionId && absTime >= s.startTime && absTime < (s.startTime + s.duration)
            );

            if (foundIdx === -1) {
                const sectionScenes = scenes.filter(s => s.sectionId === currentAudioSectionId);
                const lastInSec = sectionScenes[sectionScenes.length - 1];
                if (lastInSec && absTime >= lastInSec.startTime) {
                    foundIdx = scenes.indexOf(lastInSec);
                }
            }

            if (foundIdx !== -1 && foundIdx !== currentSceneIndexRef.current) {
                currentSceneIndexRef.current = foundIdx;
                setCurrentSceneIndex(foundIdx);
            }
        };

        const audio = audioRef.current;
        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, [isPlaying, scenes, sectionTimeOffsets, sectionId]);

    const restart = () => {
        setCurrentSceneIndex(0);
        currentSceneIndexRef.current = 0;
        setAbsoluteCurrentTime(0);
        absoluteCurrentTimeRef.current = 0;
        setIsPlaying(true);

        // Wait for the new audio element to mount
        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(console.error);
            }
            if (musicRef.current) {
                musicRef.current.currentTime = 0;
                musicRef.current.play().catch(console.error);
            }
        }, 50);
    };

    const handleAudioEnded = () => {
        const nextIdx = scenes.findIndex((s, i) => i > currentSceneIndex && s.sectionId !== activeSectionIdRef.current);

        if (nextIdx !== -1) {
            setCurrentSceneIndex(nextIdx);
            currentSceneIndexRef.current = nextIdx;
            setAbsoluteCurrentTime(scenes[nextIdx].startTime);
            if (isPlaying) {
                setTimeout(() => {
                    if (audioRef.current) audioRef.current.play().catch(console.error);
                }, 50);
            }
        } else {
            if (isLooping) {
                restart();
            } else {
                setIsPlaying(false);
                setAbsoluteCurrentTime(totalDuration);
            }
        }
    };

    const lastSceneIdRef = useRef<string | null>(null);

    // Buffer Swapping with dynamic styles
    useEffect(() => {
        if (!currentScene) return;

        if (currentScene.id !== lastSceneIdRef.current) {
            const nextImg = currentScene.imageUrl;
            setIsImageReady(false);

            if (buffer.active === 'A') {
                setBuffer(prev => ({ ...prev, imgB: nextImg, active: 'B', zoomB: false }));
            } else {
                setBuffer(prev => ({ ...prev, imgA: nextImg, active: 'A', zoomA: false }));
            }
            lastSceneIdRef.current = currentScene.id;
        }

        activeSectionIdRef.current = currentScene.sectionId;

        // Transition SFX
        if (isPlaying && sfxRef.current) {
            sfxRef.current.currentTime = 0;
            sfxRef.current.volume = 0.15; // Subtle
            sfxRef.current.play().catch(() => { });
        }
    }, [currentSceneIndex, currentScene?.id]);

    const handleImageLoad = () => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                setIsImageReady(true);
                setBuffer(prev => ({ ...prev, zoomA: prev.active === 'A', zoomB: prev.active === 'B' }));
            }, 150);
        });
    };

    // Transport
    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            musicRef.current?.pause();
        } else {
            audioRef.current.play().catch(() => setAudioError('Playback blocked. Tap to resume.'));
            musicRef.current?.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const seekTo = (time: number) => {
        const target = Math.max(0, Math.min(time, totalDuration));
        const idx = scenes.findIndex(s => target >= s.startTime && target < (s.startTime + s.duration));
        if (idx === -1) return;

        const scene = scenes[idx];
        const rel = target - (sectionTimeOffsets[scene.sectionId] ?? 0);

        if (scene.sectionId === activeSectionIdRef.current) {
            if (audioRef.current) audioRef.current.currentTime = rel;
        } else {
            setPendingSeekOffset(rel);
        }
        setCurrentSceneIndex(idx);
        currentSceneIndexRef.current = idx;
        setAbsoluteCurrentTime(target);
    };

    useEffect(() => {
        if (audioRef.current && pendingSeekOffset !== null) {
            audioRef.current.currentTime = pendingSeekOffset;
            setPendingSeekOffset(null);
            if (isPlaying) audioRef.current.play().catch(console.error);
        }
    }, [currentScene.sectionId, pendingSeekOffset, isPlaying]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); togglePlayback(); }
            else if (e.code === 'ArrowRight') seekTo(absoluteCurrentTimeRef.current + 10);
            else if (e.code === 'ArrowLeft') seekTo(absoluteCurrentTimeRef.current - 10);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Transition Helper
    const getTransitionStyles = (isCurrent: boolean, type: string, duration: number) => {
        const time = `${duration || 1000}ms`;
        const tType = type || 'fade';

        // Define explicit values for every property to ensure the browser has a clear 
        // start and end point for the transition animation.
        const currentOpacity = isCurrent ? 1 : 0;
        const currentBlur = isCurrent ? 'blur(0px)' : (tType === 'blur' ? 'blur(120px)' : 'blur(0px)');
        const currentTransform = isCurrent ? 'scale(1)' : (
            tType === 'zoom' ? 'scale(4)' :
                tType === 'slide' ? 'translateX(100%)' :
                    (tType === 'blur' ? 'scale(1.2)' : 'scale(1)')
        );

        const styles: React.CSSProperties = {
            transition: `opacity ${time} ease-in-out, transform ${time} ease-in-out, filter ${time} ease-in-out`,
            zIndex: isCurrent ? 40 : 10,
            opacity: currentOpacity,
            filter: currentBlur,
            transform: currentTransform,
            willChange: 'opacity, transform, filter'
        };

        return {
            className: "absolute inset-0 overflow-hidden pointer-events-none",
            style: styles
        };
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 backdrop-blur-3xl select-none">
            <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-50 border border-white/10">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Stage */}
            <div onClick={togglePlayback} className="relative w-full max-w-5xl aspect-video rounded-[40px] overflow-hidden shadow-2xl bg-neutral-950 border border-white/5 cursor-pointer group">

                {/* Layer A */}
                <div {...getTransitionStyles(
                    (buffer.active === 'A' && isImageReady) || (buffer.active === 'B' && !isImageReady),
                    currentScene?.transitionType,
                    currentScene?.transitionDuration
                )}>
                    {buffer.imgA && (
                        <img
                            src={buffer.imgA}
                            onLoad={buffer.active === 'A' ? handleImageLoad : undefined}
                            className={`w-full h-full object-cover transition-transform duration-[45000ms] ease-linear ${buffer.zoomA ? 'scale-110 translate-x-2' : 'scale-100'}`}
                            alt=""
                        />
                    )}
                </div>

                {/* Layer B */}
                <div {...getTransitionStyles(
                    (buffer.active === 'B' && isImageReady) || (buffer.active === 'A' && !isImageReady),
                    currentScene?.transitionType,
                    currentScene?.transitionDuration
                )}>
                    {buffer.imgB && (
                        <img
                            src={buffer.imgB}
                            onLoad={buffer.active === 'B' ? handleImageLoad : undefined}
                            className={`w-full h-full object-cover transition-transform duration-[45000ms] ease-linear ${buffer.zoomB ? 'scale-110 translate-x-2' : 'scale-100'}`}
                            alt=""
                        />
                    )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-40 pointer-events-none"></div>

                {showOverlays && (
                    <div className="absolute bottom-12 inset-x-0 text-center px-12 z-50 pointer-events-none transition-opacity duration-300">
                        <p className="text-2xl font-semibold text-white/95 drop-shadow-2xl italic leading-relaxed tracking-wide">
                            {currentScene?.sectionTitle}
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <p className="text-[10px] text-white/40 tracking-[0.4em] uppercase font-black">
                                {currentScene?.cueDescription}
                            </p>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                            <p className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/20">
                                Transition: {currentScene?.transitionType || 'MISSING (fade)'} ({currentScene?.transitionDuration || 1000}ms)
                            </p>
                        </div>
                    </div>
                )}

                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/20 shadow-2xl scale-110">
                            <svg className="w-10 h-10 text-white translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="mt-8 w-full max-w-5xl space-y-8 bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/5 shadow-2xl">
                <div className="group relative h-1 bg-white/10 rounded-full cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seekTo(((e.clientX - rect.left) / rect.width) * totalDuration);
                }}>
                    <div className="absolute h-full bg-blue-500 rounded-full" style={{ width: `${(absoluteCurrentTime / totalDuration) * 100}%` }}></div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-white/40 font-mono text-xs">
                        {Math.floor(absoluteCurrentTime / 60)}:{String(Math.floor(absoluteCurrentTime % 60)).padStart(2, '0')} / {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={restart}
                            className="text-white/40 hover:text-white transition-colors cursor-pointer"
                            title="Rewind to Start"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                            </svg>
                        </button>

                        <button onClick={() => seekTo(absoluteCurrentTime - 10)} className="text-white/40 hover:text-white transition-colors cursor-pointer"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg></button>
                        <button onClick={togglePlayback} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                            {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                        </button>
                        <button onClick={() => seekTo(absoluteCurrentTime + 10)} className="text-white/40 hover:text-white transition-colors cursor-pointer"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zm8 0a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg></button>

                        <button
                            onClick={() => setIsLooping(!isLooping)}
                            className={`transition-colors cursor-pointer ${isLooping ? 'text-blue-400' : 'text-white/40 hover:text-white'}`}
                            title={isLooping ? "Loop On" : "Loop Off"}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowOverlays(!showOverlays)}
                            className={`p-2 rounded-lg transition-all ${showOverlays ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-white'}`}
                            title={showOverlays ? "Hide Prompt Overlays" : "Show Prompt Overlays"}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <div className="text-right min-w-[120px]">
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Scene {currentSceneIndex + 1} of {scenes.length}</span>
                        </div>
                    </div>
                </div>

                {/* DEBUG SECTION */}
                <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 text-[10px] font-mono text-white/30 grid grid-cols-4 gap-4">
                    {scenes.slice(currentSceneIndex, currentSceneIndex + 4).map((s, i) => (
                        <div key={i} className={i === 0 ? "text-blue-400" : ""}>
                            Scene {currentSceneIndex + i + 1}: {s.transitionType || 'fade'} ({s.transitionDuration || 1000}ms)
                        </div>
                    ))}
                </div>
            </div>

            {error && <div className="mt-4 px-6 py-2 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/20">{error}</div>}

            <audio
                ref={audioRef}
                key={currentScene?.sectionId}
                data-section-id={currentScene?.sectionId}
                src={currentScene?.audioUrl}
                onPlay={() => setIsNarratorActuallyPlaying(true)}
                onPause={() => setIsNarratorActuallyPlaying(false)}
                onEnded={() => {
                    setIsNarratorActuallyPlaying(false);
                    handleAudioEnded();
                }}
                onError={() => setAudioError('Audio streaming failed.')}
            />

            {backgroundMusicUrl && (
                <audio
                    ref={musicRef}
                    src={backgroundMusicUrl}
                    loop
                    onPlay={() => {
                        console.log('[VideoPreview] Music playback started');
                        if (musicRef.current) {
                            musicRef.current.volume = isNarratorActuallyPlaying ?
                                (backgroundMusicVolume || 0.2) * 0.3 :
                                (backgroundMusicVolume || 0.2);
                        }
                    }}
                    onError={(e) => {
                        const target = e.target as HTMLAudioElement;
                        console.error('[VideoPreview] Music playback error:', target.error);
                        setAudioError(`Music track failed to load: ${target.error?.message || 'Unsupported source'}`);
                    }}
                />
            )}

            {/* Manual Ducking Control */}
            <DuckingEffect
                isNarratorPlaying={isNarratorActuallyPlaying}
                musicRef={musicRef}
                baseVolume={backgroundMusicVolume || 0.2}
            />
            {/* Transition SFX */}
            <audio
                ref={sfxRef}
                src="https://cdn.pixabay.com/audio/2022/01/18/audio_823157fbe1.mp3" // Placeholder: "Short Calm Chime"
                preload="auto"
            />
        </div>
    );
};

const DuckingEffect: React.FC<{
    isNarratorPlaying: boolean;
    musicRef: React.RefObject<HTMLAudioElement | null>;
    baseVolume: number
}> = ({ isNarratorPlaying, musicRef, baseVolume }) => {
    useEffect(() => {
        if (!musicRef.current) return;
        const targetVolume = isNarratorPlaying ? baseVolume * 0.3 : baseVolume;

        // Smoothed volume transition
        const currentVolume = musicRef.current.volume;
        const steps = 10;
        const stepTime = 50;
        const volumeDiff = targetVolume - currentVolume;

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep >= steps || !musicRef.current) {
                clearInterval(interval);
                if (musicRef.current) musicRef.current.volume = targetVolume;
                return;
            }
            musicRef.current.volume = currentVolume + (volumeDiff * (currentStep / steps));
            currentStep++;
        }, stepTime);

        return () => clearInterval(interval);
    }, [isNarratorPlaying, baseVolume, musicRef]);

    return null;
};
