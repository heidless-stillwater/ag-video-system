'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '@/lib/services/video-engine';

interface VideoPreviewProps {
    scenes: Scene[];
    backgroundMusicUrl?: string;
    backgroundMusicVolume?: number;
    ambianceUrl?: string;
    ambianceVolume?: number;
    narrationVolume?: number;
    globalSfxVolume?: number;
    subtitlesEnabled?: boolean;
    subtitleStyle?: 'minimal' | 'classic' | 'bold';
    onClose: () => void;
    onSaveAudioSettings?: (settings: {
        narrationVolume: number;
        backgroundMusicVolume: number;
        ambianceVolume: number;
        globalSfxVolume: number;
        autoDucking: boolean;
    }) => Promise<void>;
    isInline?: boolean;
    availableLanguages?: { code: string; name: string; scriptId: string }[];
    currentLanguageCode?: string;
    onLanguageChange?: (scriptId: string) => Promise<void>;
    autoDucking?: boolean;
    onLiveVolumeChange?: (key: 'narrationVolume' | 'backgroundMusicVolume' | 'ambianceVolume' | 'globalSfxVolume' | 'autoDucking', value: number | boolean) => void;
}

/**
 * A cinematic, high-fidelity documentary previewer.
 * Supports customizable transitions: fade, blur, zoom, and slide.
 */
export const VideoPreview: React.FC<VideoPreviewProps> = ({
    scenes,
    backgroundMusicUrl,
    backgroundMusicVolume,
    ambianceUrl,
    ambianceVolume,
    narrationVolume = 1.0,
    globalSfxVolume = 0.4,
    subtitlesEnabled = true,
    subtitleStyle = 'minimal',
    onClose,
    onSaveAudioSettings,
    isInline = false,
    availableLanguages,
    currentLanguageCode,
    onLanguageChange,
    autoDucking = true,
    onLiveVolumeChange
}) => {
    const instanceId = useRef(Math.random().toString(36).substr(2, 5));
    console.log(`[VideoPreview:${instanceId.current}] Rendering. tempMusicVol: ${backgroundMusicVolume ?? 0.2} (prop) -> ${React.useMemo(() => backgroundMusicVolume ?? 0.2, [backgroundMusicVolume])} vs State?`);

    // Monitor audio state loop
    useEffect(() => {
        const interval = setInterval(() => {
            if (!backgroundMusicVolume) return; // Reduce noise
            console.log(`[AudioMonitor] Music: paused=${musicRef.current?.paused}, vol=${musicRef.current?.volume}, muted=${musicRef.current?.muted}, src=${musicRef.current?.src?.slice(-20)}`);
            console.log(`[AudioMonitor] Narration: paused=${audioRef.current?.paused}, vol=${audioRef.current?.volume}, muted=${audioRef.current?.muted}`);
        }, 2000);
        return () => clearInterval(interval);
    }, [backgroundMusicVolume]);

    // Cleanup function to stop all audio
    const stopAllAudio = () => {
        console.log(`[VideoPreview:${instanceId.current}] Stopping all audio`);
        audioRef.current?.pause();
        musicRef.current?.pause();
        ambianceRef.current?.pause();
        sceneSfxRef.current?.pause();
        sfxRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        if (musicRef.current) musicRef.current.currentTime = 0;
        if (ambianceRef.current) ambianceRef.current.currentTime = 0;
        if (sceneSfxRef.current) sceneSfxRef.current.currentTime = 0;
    };
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [absoluteCurrentTime, setAbsoluteCurrentTime] = useState(0);
    const [pendingSeekOffset, setPendingSeekOffset] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const sfxRef = useRef<HTMLAudioElement | null>(null);
    const sceneSfxRef = useRef<HTMLAudioElement | null>(null);
    const ambianceRef = useRef<HTMLAudioElement | null>(null);
    const [error, setAudioError] = useState<string | null>(null);
    const [isNarratorActuallyPlaying, setIsNarratorActuallyPlaying] = useState(false);
    const [showOverlays, setShowOverlays] = useState(false);
    const [showMixer, setShowMixer] = useState(false);
    const [isSavingAudio, setIsSavingAudio] = useState(false);

    // Temporary audio levels (for live preview adjustment)
    const [tempNarrationVol, setTempNarrationVol] = useState(narrationVolume);
    const [tempMusicVol, setTempMusicVol] = useState(backgroundMusicVolume ?? 0.2);
    const [tempAmbianceVol, setTempAmbianceVol] = useState(ambianceVolume ?? 0.1);
    const [tempSfxVol, setTempSfxVol] = useState(globalSfxVolume);
    const [tempAutoDucking, setTempAutoDucking] = useState(autoDucking);

    console.log(`[VideoPreview:${instanceId.current}] State: Music=${tempMusicVol}, Ambiance=${tempAmbianceVol}, Sfx=${tempSfxVol}, Ducking=${tempAutoDucking}`);

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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAllAudio();
        };
    }, []);

    const sectionId = currentScene?.sectionId;

    const safePlay = (el: HTMLAudioElement | null, resetTime: boolean = false) => {
        if (!el) return;

        // CRITICAL: Check if element is still in the DOM before playing
        if (!el.isConnected) {
            console.log('[VideoPreview] Skipping play - element not in DOM');
            return;
        }

        if (resetTime) el.currentTime = 0;

        // Force state for diagnostics
        el.muted = false;

        if (el.src && el.src !== window.location.href) {
            console.log(`[VideoPreview] Resuming audio: ${el.src.slice(-20)} (Dur: ${el.duration})`);
            el.play().catch((err) => {
                // Ignore AbortError if element was removed during play attempt
                if (err.name === 'AbortError') {
                    console.log('[VideoPreview] Play aborted - element removed from DOM');
                } else {
                    console.error('[VideoPreview] Playback failed:', err);
                }
            });
        }
    };

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
        setAudioError(null);
        setIsPlaying(true);

        // Wait for the new audio element to mount
        setTimeout(() => {
            safePlay(audioRef.current, true);
            safePlay(musicRef.current, true);
            safePlay(ambianceRef.current, true);
        }, 50);
    };

    // Sync local state with incoming props (e.g. from external page mixer)
    // We use a small threshold check to prevent floating-point jitter from snapping sliders back during drags
    useEffect(() => {
        const thresholdDiff = (a: number, b: number) => Math.abs(a - b) > 0.01;

        if (thresholdDiff(tempNarrationVol, narrationVolume)) setTempNarrationVol(narrationVolume);
        if (thresholdDiff(tempMusicVol, backgroundMusicVolume ?? 0.2)) setTempMusicVol(backgroundMusicVolume ?? 0.2);
        if (thresholdDiff(tempAmbianceVol, ambianceVolume ?? 0.1)) setTempAmbianceVol(ambianceVolume ?? 0.1);
        if (thresholdDiff(tempSfxVol, globalSfxVolume)) setTempSfxVol(globalSfxVolume);
        if (tempAutoDucking !== autoDucking) setTempAutoDucking(autoDucking);
    }, [narrationVolume, backgroundMusicVolume, ambianceVolume, globalSfxVolume, autoDucking]);

    const handleAudioEnded = () => {
        const nextIdx = scenes.findIndex((s, i) => i > currentSceneIndex && s.sectionId !== activeSectionIdRef.current);

        if (nextIdx !== -1) {
            setCurrentSceneIndex(nextIdx);
            currentSceneIndexRef.current = nextIdx;
            setAbsoluteCurrentTime(scenes[nextIdx].startTime);
            if (isPlaying) {
                setTimeout(() => {
                    safePlay(audioRef.current);
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
            setAudioError(null);
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

        // Transition SFX (The Chime)
        // Only play the transition chime if there is pure silence (no specific scene SFX).
        // If the user selected "Crackling Fire", we don't want a chime interrupting the mood.
        if (isPlaying && sfxRef.current && !currentScene?.sfxUrl) {
            sfxRef.current.currentTime = 0;
            // Use global SFX volume but scale it down for the chime so it's subtle, 
            // but effectively mutable if the user turns SFX to 0.
            sfxRef.current.volume = (tempSfxVol || 0) * 0.4;
            safePlay(sfxRef.current);
        }

        // Scene-Specific SFX (The AI Sound Design)
        if (sceneSfxRef.current && currentScene?.sfxUrl) {
            const calculatedVolume = (tempSfxVol ?? 0.4) * (currentScene.sfxVolume ?? 1.0);
            sceneSfxRef.current.volume = calculatedVolume;
        }

        if (isPlaying && sceneSfxRef.current && currentScene?.sfxUrl) {
            const currentSrc = sceneSfxRef.current.getAttribute('src');
            const calculatedVolume = (tempSfxVol ?? 0.4) * (currentScene.sfxVolume ?? 1.0);

            console.log('[VideoPreview] Scene SFX:', {
                url: currentScene.sfxUrl,
                tempSfxVol,
                sceneMultiplier: currentScene.sfxVolume,
                calculatedVolume,
                isPlaying: !sceneSfxRef.current.paused
            });

            if (currentSrc !== currentScene.sfxUrl && sceneSfxRef.current.src !== new URL(currentScene.sfxUrl, window.location.href).href) {
                console.log('[VideoPreview] Loading new scene SFX:', currentScene.sfxUrl);
                sceneSfxRef.current.src = currentScene.sfxUrl;
                sceneSfxRef.current.loop = true;

                // Temporal Randomization: Apply delay if specified
                const delay = currentScene.sfxOffset || 0;
                if (delay > 0) {
                    setTimeout(() => {
                        // Double check if we are still on the same scene and playing
                        if (isPlaying && sceneSfxRef.current?.src === currentScene.sfxUrl) {
                            safePlay(sceneSfxRef.current);
                        }
                    }, delay);
                } else {
                    safePlay(sceneSfxRef.current);
                }
            } else if (sceneSfxRef.current.paused) {
                console.log('[VideoPreview] Resuming paused scene SFX');
                safePlay(sceneSfxRef.current);
            }
        } else if (sceneSfxRef.current && !currentScene?.sfxUrl) {
            sceneSfxRef.current.pause();
            sceneSfxRef.current.src = '';
        }
    }, [currentSceneIndex, currentScene?.id, isPlaying, tempSfxVol]);

    const handleImageLoad = () => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                setIsImageReady(true);
                setBuffer(prev => ({ ...prev, zoomA: prev.active === 'A', zoomB: prev.active === 'B' }));
            }, 150);
        });
    };

    // Safety timeout to prevent black screens if images hang
    useEffect(() => {
        if (!isImageReady) {
            const timer = setTimeout(() => {
                console.warn('[VideoPreview] Image load timed out, forcing transition.');
                setIsImageReady(true);
                setBuffer(prev => ({ ...prev, zoomA: prev.active === 'A', zoomB: prev.active === 'B' }));
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isImageReady]);

    // Transport
    const togglePlayback = () => {
        if (isPlaying) {
            console.log('[VideoPreview] Pausing all audio');
            audioRef.current?.pause();
            musicRef.current?.pause();
            ambianceRef.current?.pause();
            sceneSfxRef.current?.pause();
            setIsPlaying(false);
        } else {
            console.log('[VideoPreview] Starting playback');
            safePlay(audioRef.current);
            safePlay(musicRef.current);
            safePlay(ambianceRef.current);
            safePlay(sceneSfxRef.current);
            setIsPlaying(true);
        }
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
            if (isPlaying) safePlay(audioRef.current);
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
        <div className={isInline
            ? "w-full bg-[#020617] rounded-[40px] select-none border border-white/5 overflow-hidden"
            : "fixed inset-0 z-[100] bg-[#020617] overflow-y-auto select-none custom-scrollbar"
        }>
            {!isInline && (
                <button onClick={() => { stopAllAudio(); onClose(); }} className="fixed top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-[120] border border-white/10 backdrop-blur-md shadow-xl">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}

            <div className={isInline
                ? "w-full flex flex-col items-center p-0 gap-6"
                : "min-h-full w-full flex flex-col items-center py-12 px-8 gap-8"
            }>
                {/* Stage Wrapper */}
                <div
                    onClick={togglePlayback}
                    className={`relative w-full ${isInline ? '' : 'max-w-5xl'} aspect-video rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-black border border-white/10 cursor-pointer group flex-shrink-0 @container`}
                    style={{ containerType: 'inline-size' }}
                >

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
                                onError={() => {
                                    console.warn('[VideoPreview] Failed to load image A:', buffer.imgA);
                                    if (buffer.active === 'A') handleImageLoad();
                                }}
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
                                onError={() => {
                                    console.warn('[VideoPreview] Failed to load image B:', buffer.imgB);
                                    if (buffer.active === 'B') handleImageLoad();
                                }}
                                className={`w-full h-full object-cover transition-transform duration-[45000ms] ease-linear ${buffer.zoomB ? 'scale-110 translate-x-2' : 'scale-100'}`}
                                alt=""
                            />
                        )}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-40 pointer-events-none"></div>

                    {/* No interactive or debug overlays on video area */}

                    {/* No interactive overlays on video area */}

                    {/* Kinetic Typography Layer (Inside Stage) */}
                    {subtitlesEnabled && currentScene?.narrationText && (
                        <SubtitleOverlay
                            text={currentScene.narrationText}
                            styleType={subtitleStyle}
                            isVisible={isPlaying}
                        />
                    )}

                    {/* Audio Status Indicator */}
                    {!currentScene?.audioUrl && isPlaying && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-indigo-600/80 backdrop-blur-md rounded-full border border-indigo-400/30 flex items-center gap-2 shadow-lg animate-pulse">
                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Synthesizing Audio...</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className={`w-full ${isInline ? '' : 'max-w-5xl'} space-y-8 bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/5 shadow-2xl flex-shrink-0`}>
                    {/* Technical Metadata Footer (Subtle) */}
                    {showOverlays && (
                        <div className="flex flex-col items-center gap-1 border-t border-white/5 pt-6 mt-4">
                            <p className="text-[10px] font-medium text-white/10 uppercase tracking-[0.3em]">
                                Technical Frame Data
                            </p>
                            <div className="flex items-center gap-4 opacity-[0.05] grayscale hover:opacity-20 transition-opacity">
                                <p className="text-[9px] text-white tracking-widest">{currentScene?.sectionTitle}</p>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <p className="text-[9px] text-white tracking-widest">{currentScene?.cueDescription}</p>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <p className="text-[9px] text-white tracking-widest">{currentScene?.transitionType} ({currentScene?.transitionDuration}ms)</p>
                            </div>
                        </div>
                    )}
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
                            <button
                                onClick={() => setShowMixer(!showMixer)}
                                className={`p-2 rounded-lg transition-all ${showMixer ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-white'}`}
                                title={showMixer ? "Hide Audio Mixer" : "Show Audio Mixer"}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </button>
                            <div className="text-right min-w-[120px] flex flex-col items-end gap-1">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Scene {currentSceneIndex + 1} of {scenes.length}</span>

                                {availableLanguages && availableLanguages.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Audio:</span>
                                        <select
                                            value={currentLanguageCode}
                                            onChange={(e) => {
                                                const selected = availableLanguages.find(l => l.code === e.target.value);
                                                if (selected && onLanguageChange) {
                                                    onLanguageChange(selected.scriptId);
                                                }
                                            }}
                                            className="bg-transparent text-[10px] font-bold text-white uppercase tracking-wider focus:outline-none cursor-pointer hover:text-blue-400 transition-colors text-right"
                                        >
                                            {availableLanguages.map(lang => (
                                                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-300">
                                                    {lang.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Live Audio Mixer Panel */}
                    {showMixer && (
                        <div className="mt-6 p-6 bg-gradient-to-br from-purple-900/20 to-slate-900/40 border border-purple-500/20 rounded-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2">
                                    <span>🎚️</span> Master Audio Mixer
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setTempNarrationVol(narrationVolume);
                                            setTempMusicVol(backgroundMusicVolume ?? 0.2);
                                            setTempAmbianceVol(ambianceVolume ?? 0.1);
                                            setTempSfxVol(globalSfxVolume);
                                            setTempAutoDucking(autoDucking);
                                        }}
                                        className="px-3 py-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Reset
                                    </button>
                                    {onSaveAudioSettings && (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    setIsSavingAudio(true);
                                                    try {
                                                        await onSaveAudioSettings({
                                                            narrationVolume: tempNarrationVol,
                                                            backgroundMusicVolume: tempMusicVol,
                                                            ambianceVolume: tempAmbianceVol,
                                                            globalSfxVolume: tempSfxVol,
                                                            autoDucking: tempAutoDucking
                                                        });
                                                    } finally {
                                                        setIsSavingAudio(false);
                                                    }
                                                }}
                                                disabled={isSavingAudio}
                                                className="px-4 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                {isSavingAudio ? (
                                                    <>
                                                        <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>💾 Save Settings</>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Narration Volume */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🎙️ Narration</label>
                                        <span className="text-xs font-mono text-purple-400">{Math.round(tempNarrationVol * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={tempNarrationVol}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTempNarrationVol(val);
                                            onLiveVolumeChange?.('narrationVolume', val);
                                        }}
                                        className="w-full accent-purple-500"
                                    />
                                </div>

                                {/* Background Music Volume */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🎵 Background Music</label>
                                        <span className="text-xs font-mono text-purple-400">{Math.round(tempMusicVol * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={tempMusicVol}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTempMusicVol(val);
                                            onLiveVolumeChange?.('backgroundMusicVolume', val);
                                        }}
                                        className="w-full accent-purple-500"
                                    />
                                </div>

                                {/* Ambiance Volume */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🌊 Ambiance</label>
                                        <span className="text-xs font-mono text-purple-400">{Math.round(tempAmbianceVol * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={tempAmbianceVol}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTempAmbianceVol(val);
                                            onLiveVolumeChange?.('ambianceVolume', val);
                                        }}
                                        className="w-full accent-purple-500"
                                    />
                                </div>

                                {/* SFX Volume */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">🔊 Sound Effects</label>
                                        <span className="text-xs font-mono text-purple-400">{Math.round(tempSfxVol * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={tempSfxVol}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTempSfxVol(val);
                                            onLiveVolumeChange?.('globalSfxVolume', val);
                                        }}
                                        className="w-full accent-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Auto-Ducking Toggle UI */}
                            <div className="flex items-center justify-between pt-4 border-t border-purple-500/10">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Intelligent Ducking</span>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Smoothly dip background layers during narration</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newVal = !tempAutoDucking;
                                        setTempAutoDucking(newVal);
                                        onLiveVolumeChange?.('autoDucking', newVal);
                                    }}
                                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${tempAutoDucking ? 'bg-purple-600 shadow-lg shadow-purple-500/20' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${tempAutoDucking ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-500 text-center italic">
                                Adjust levels in real-time during playback. Click "Save Settings" to apply permanently.
                            </p>
                        </div>
                    )}

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
            </div>

            {currentScene?.audioUrl && (
                <audio
                    ref={audioRef}
                    key={currentScene?.sectionId}
                    data-section-id={currentScene?.sectionId}
                    src={currentScene?.audioUrl}
                    onPlay={() => {
                        setIsNarratorActuallyPlaying(true);
                        if (audioRef.current) audioRef.current.volume = tempNarrationVol;
                    }}
                    onPause={() => setIsNarratorActuallyPlaying(false)}
                    onEnded={() => {
                        setIsNarratorActuallyPlaying(false);
                        handleAudioEnded();
                    }}
                    onError={() => setAudioError('Audio streaming failed.')}
                />
            )}

            {backgroundMusicUrl && (
                <audio
                    ref={musicRef}
                    src={backgroundMusicUrl}
                    loop
                    onError={(e) => {
                        const target = e.target as HTMLAudioElement;
                        const error = target.error;
                        console.error(`[VideoPreview] Music playback error | Code: ${error?.code || '?'} | Msg: ${error?.message || 'None'} | URL: ${target.src}`);
                        setAudioError(`Music track failed to load (Code ${error?.code || '?'})`);
                    }}
                />
            )}

            {/* Intelligent Ducking Control (Music & Ambiance) */}
            <DuckingEffect
                isEnabled={tempAutoDucking}
                isNarratorPlaying={isNarratorActuallyPlaying}
                isPlaying={isPlaying}
                musicRef={musicRef}
                ambianceRef={ambianceRef}
                musicBaseVolume={tempMusicVol ?? 0.2}
                ambianceBaseVolume={tempAmbianceVol ?? 0.1}
            />

            {/* Master Volume Sync Engine */}
            <VolumeSync channel="Narration" refEl={audioRef} volume={tempNarrationVol} trigger={currentScene?.sectionId} />
            {/* Note: Scene SFX volume is managed in the scene change useEffect to apply scene-specific multipliers */}
            {/* Note: Music and Ambiance volumes are managed by DuckingEffect to apply intelligent ducking */}

            {/* Transition SFX */}
            <audio
                ref={sfxRef}
                src="/audio/sfx/chime.mp3"
                preload="auto"
            />
            {/* Scene-Specific SFX Layer */}
            <audio ref={sceneSfxRef} />

            {/* Ambient Atmosphere Layer */}
            {ambianceUrl && (
                <audio
                    ref={ambianceRef}
                    src={ambianceUrl}
                    loop
                    onError={(e) => {
                        const target = e.target as HTMLAudioElement;
                        const error = target.error;
                        console.error(`[VideoPreview] Ambiance playback error | Code: ${error?.code || '?'} | Msg: ${error?.message || 'None'} | URL: ${target.src}`);
                        setAudioError(`Ambiance track failed to load (Code ${error?.code || '?'})`);
                    }}
                />
            )}
        </div>
    );
};

const DuckingEffect: React.FC<{
    isEnabled: boolean;
    isNarratorPlaying: boolean;
    isPlaying: boolean;
    musicRef: React.RefObject<HTMLAudioElement | null>;
    ambianceRef: React.RefObject<HTMLAudioElement | null>;
    musicBaseVolume: number;
    ambianceBaseVolume: number;
}> = ({ isEnabled, isNarratorPlaying, isPlaying, musicRef, ambianceRef, musicBaseVolume, ambianceBaseVolume }) => {
    useEffect(() => {
        // "The Enforcer" - Polling loop to ensure volume is applied regardless of race conditions
        const interval = setInterval(() => {
            // Case 1: Disabled or Stopped -> Enforce Base Volume AND Pause
            if (!isEnabled || !isPlaying) {
                if (musicRef.current) {
                    // CRITICAL: Pause the audio when playback is stopped
                    if (!musicRef.current.paused) {
                        console.log(`[DuckingEffect] Case 1: Pausing music (playback stopped)`);
                        musicRef.current.pause();
                    }

                    // Ensure not muted (sanity check)
                    if (musicRef.current.muted) musicRef.current.muted = false;

                    if (Math.abs(musicRef.current.volume - musicBaseVolume) > 0.01) {
                        console.log(`[DuckingEffect] Case 1 (Disabled): Forcing Music ${musicBaseVolume} (was ${musicRef.current.volume})`);
                        musicRef.current.volume = musicBaseVolume;
                    }
                }
                if (ambianceRef.current) {
                    // CRITICAL: Pause the audio when playback is stopped
                    if (!ambianceRef.current.paused) {
                        console.log(`[DuckingEffect] Case 1: Pausing ambiance (playback stopped)`);
                        ambianceRef.current.pause();
                    }

                    // Ensure not muted (sanity check)
                    if (ambianceRef.current.muted) ambianceRef.current.muted = false;

                    if (Math.abs(ambianceRef.current.volume - ambianceBaseVolume) > 0.01) {
                        console.log(`[DuckingEffect] Case 1 (Disabled): Forcing Ambiance ${ambianceBaseVolume} (was ${ambianceRef.current.volume})`);
                        ambianceRef.current.volume = ambianceBaseVolume;
                    }
                }
                return;
            }

            // Case 2: Playing & Enabled -> Enforce Ducking Logic
            const targetMusicVol = isNarratorPlaying ? musicBaseVolume * 0.35 : musicBaseVolume;
            const targetAmbianceVol = isNarratorPlaying ? ambianceBaseVolume * 0.6 : ambianceBaseVolume;

            if (musicRef.current) {
                // FORCE RESCUE
                if (musicRef.current.muted) musicRef.current.muted = false;

                // Apply update if significant difference (avoid micro-jitter)
                if (Math.abs(musicRef.current.volume - targetMusicVol) > 0.001) {
                    // console.log(`[DuckingEffect] Enforcing Music Vol: ${targetMusicVol} (was ${musicRef.current.volume})`);
                    musicRef.current.volume = targetMusicVol;
                }
            }
            if (ambianceRef.current) {
                if (ambianceRef.current.muted) ambianceRef.current.muted = false;

                if (Math.abs(ambianceRef.current.volume - targetAmbianceVol) > 0.001) {
                    // console.log(`[DuckingEffect] Enforcing Ambiance Vol: ${targetAmbianceVol} (was ${ambianceRef.current.volume})`);
                    ambianceRef.current.volume = targetAmbianceVol;
                }
            }
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [isEnabled, isNarratorPlaying, isPlaying, musicBaseVolume, ambianceBaseVolume, musicRef, ambianceRef]);

    return null;
};



const AmbianceSync: React.FC<{
    ambianceRef: React.RefObject<HTMLAudioElement | null>;
    volume: number
}> = ({ ambianceRef, volume }) => {
    return null;
};

const SubtitleOverlay: React.FC<{
    text: string;
    styleType: 'minimal' | 'classic' | 'bold';
    isVisible: boolean;
}> = ({ text, styleType, isVisible }) => {
    const [displayText, setDisplayText] = useState('');
    const [fade, setFade] = useState(false);

    useEffect(() => {
        setFade(false);
        const timeout = setTimeout(() => {
            setDisplayText(text);
            setFade(true);
        }, 150);
        return () => clearTimeout(timeout);
    }, [text]);

    const getStyle = () => {
        switch (styleType) {
            case 'bold': return { fontSize: '3.2cqw', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '-0.02em' };
            case 'classic': return { fontSize: '2.8cqw', fontWeight: 500 };
            default: return { fontSize: '2.4cqw', fontWeight: 300, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)' };
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '4.5cqw',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 6cqw',
        zIndex: 50,
        transition: 'all 1000ms ease-out',
        opacity: fade && isVisible ? 1 : 0,
        transform: fade && isVisible ? 'translateY(0)' : 'translateY(1cqw)'
    };

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: '75cqw', textAlign: 'center' }}>
                <p
                    className="leading-relaxed drop-shadow-[0_0.1cqw_0.5cqw_rgba(0,0,0,0.8)]"
                    style={getStyle()}
                >
                    {displayText}
                </p>
            </div>
        </div>
    );
};

const VolumeSync: React.FC<{
    channel: string;
    refEl: React.RefObject<HTMLAudioElement | null>;
    volume: number;
    trigger?: string;
}> = ({ channel, refEl, volume, trigger }) => {
    useEffect(() => {
        if (!refEl.current) {
            console.log(`[VolumeSync] ${channel}: No audio element found`);
            return;
        }
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log(`[VolumeSync] ${channel}: Setting volume from ${refEl.current.volume} to ${clampedVolume}`);
        refEl.current.volume = clampedVolume;
    }, [volume, refEl, channel, trigger]);

    return null;
};
