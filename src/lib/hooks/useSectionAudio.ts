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

    const playPause = (sectionId: string, url: string) => {
        if (playingId === sectionId) {
            if (isPaused) {
                audioRef.current?.play();
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

            audio.play();
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
                audioRef.current.play();
                setIsPaused(false);
            }
        }
    };

    return { playingId, isPaused, progress, playPause, stop, rewind };
};
