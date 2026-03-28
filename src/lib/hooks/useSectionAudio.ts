import { useState, useRef, useEffect } from 'react';

export const useSectionAudio = () => {
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const safePlay = (el: HTMLAudioElement | null) => {
        if (!el) return;
        el.play().catch(err => {
            if (err.name === 'AbortError') {
                // Ignore interruption by unmount/src change
            } else {
                console.error('[useSectionAudio] Playback failed:', err);
            }
        });
    };

    const playPause = (sectionId: string, url: string) => {
        if (playingId === sectionId) {
            if (isPaused) {
                safePlay(audioRef.current);
                setIsPaused(false);
            } else {
                audioRef.current?.pause();
                setIsPaused(true);
            }
        } else {
            // Stop current if any
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audioRef.current = audio;
            setPlayingId(sectionId);
            setIsPaused(false);
            setProgress(0);

            audio.addEventListener('timeupdate', () => {
                const p = (audio.currentTime / audio.duration) * 100;
                setProgress(p);
            });

            audio.addEventListener('ended', () => {
                setPlayingId(null);
                setIsPaused(false);
                setProgress(0);
            });

            safePlay(audio);
        }
    };

    const stop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlayingId(null);
            setIsPaused(false);
            setProgress(0);
        }
    };

    const rewind = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            setProgress(0);
            if (isPaused) {
                safePlay(audioRef.current);
                setIsPaused(false);
            }
        }
    };

    return { playingId, isPaused, progress, playPause, stop, rewind };
};
