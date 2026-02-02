import React, { useEffect } from 'react';

interface DuckingEffectProps {
    isEnabled: boolean;
    isNarratorPlaying: boolean;
    isPlaying: boolean;
    musicRef: React.RefObject<HTMLAudioElement | null>;
    ambianceRef: React.RefObject<HTMLAudioElement | null>;
    musicBaseVolume: number;
    ambianceBaseVolume: number;
}

export const useDuckingEffect = ({
    isEnabled,
    isNarratorPlaying,
    isPlaying,
    musicRef,
    ambianceRef,
    musicBaseVolume,
    ambianceBaseVolume
}: DuckingEffectProps) => {
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
            console.log(`[VolumeSync] ${channel}: No audio element found`);
            return;
        }
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log(`[VolumeSync] ${channel}: Setting volume from ${refEl.current.volume} to ${clampedVolume}`);
        refEl.current.volume = clampedVolume;
    }, [volume, refEl, channel, trigger]);
};
