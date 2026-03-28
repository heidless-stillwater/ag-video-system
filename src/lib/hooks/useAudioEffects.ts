import React, { useEffect } from 'react';

interface DuckingEffectProps {
    isEnabled: boolean;
    isNarratorPlaying: boolean;
    isPlaying: boolean;
    isMuted: boolean;
    musicRef: React.RefObject<HTMLAudioElement | null>;
    ambianceRef: React.RefObject<HTMLAudioElement | null>;
    sfxRef: React.RefObject<HTMLAudioElement | null>;
    sceneSfxRef: React.RefObject<HTMLAudioElement | null>;
    musicBaseVolume: number;
    ambianceBaseVolume: number;
}

export const useDuckingEffect = ({
    isEnabled,
    isNarratorPlaying,
    isPlaying,
    isMuted,
    musicRef,
    ambianceRef,
    sfxRef,
    sceneSfxRef,
    musicBaseVolume,
    ambianceBaseVolume
}: DuckingEffectProps) => {
    useEffect(() => {
        // "The Enforcer" - Polling loop to ensure volume/play-state is applied regardless of race conditions
        const interval = setInterval(() => {
            const music = musicRef.current;
            const ambiance = ambianceRef.current;

            // Scenario A: GLOBAL STOP
            if (!isPlaying) {
                [musicRef.current, ambianceRef.current, sfxRef.current, sceneSfxRef.current].forEach(el => {
                    if (el && !el.paused) {
                        el.pause();
                    }
                });
                return; 
            }

            // Scenario B: VIDEO IS PLAYING
            // Apply volume levels and ducking if enabled
            if (music) {
                music.muted = isMuted;
                const targetVol = (isEnabled && isNarratorPlaying) ? musicBaseVolume * 0.35 : musicBaseVolume;
                if (Math.abs(music.volume - targetVol) > 0.005) {
                    music.volume = targetVol;
                }
            }

            if (ambiance) {
                ambiance.muted = isMuted;
                const targetVol = (isEnabled && isNarratorPlaying) ? ambianceBaseVolume * 0.6 : ambianceBaseVolume;
                if (Math.abs(ambiance.volume - targetVol) > 0.005) {
                    ambiance.volume = targetVol;
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isEnabled, isNarratorPlaying, isPlaying, isMuted, musicBaseVolume, ambianceBaseVolume, musicRef, ambianceRef, sfxRef, sceneSfxRef]);
};

interface VolumeSyncProps {
    channel: string;
    refEl: React.RefObject<HTMLAudioElement | null>;
    volume: number;
    trigger?: string;
}

export const useVolumeSync = ({ channel, refEl, volume, trigger }: VolumeSyncProps) => {
    useEffect(() => {
        if (!refEl.current) {
            return;
        }
        const clampedVolume = Math.max(0, Math.min(1, volume));
        refEl.current.volume = clampedVolume;
    }, [volume, refEl, channel, trigger]);
};
