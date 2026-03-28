import { Script, ScriptSection, VisualCue } from '@/types';

/**
 * Represents a single timed unit of the documentary.
 * Combines an image with a specific audio segment and duration.
 */
export interface Scene {
    id: string;
    sectionId: string;
    sectionTitle: string;
    imageUrl: string;
    videoUrl?: string | null;
    sourceDuration?: number | null;
    audioUrl?: string; // Audio URL of the entire section this scene belongs to
    sectionStartTime: number; // For relative coordinate calc
    startTime: number; // Seconds from documentary start
    duration: number; // Seconds to display this specific image
    cueDescription: string;
    transitionType: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration: number;
    fadeOutDuration?: number;
    sfxUrl?: string;
    sfxVolume?: number;
    sfxOffset?: number;
    sfxLabel?: string;
    narrationText?: string;
    volume?: number;
    inPoint?: number;
    outPoint?: number;
    trackId?: 'video' | 'broll' | 'audio';
}

/**
 * Service to orchestrate the synchronization of audio and visual assets.
 */
export const videoEngine = {
    /**
     * Calculates the full timeline of scenes for a documentary.
     */
    calculateTimeline(script: Script): Scene[] {
        const timeline: Scene[] = [];
        let totalTimeOffset = 0;

        // Sort sections by order
        const sortedSections = [...script.sections].sort((a, b) => a.order - b.order);

        for (const section of sortedSections) {
            console.log(`[VideoEngine] Processing section: ${section.title} (Order: ${section.order})`);

            // Calculate a safe section duration
            let sectionDuration = section.estimatedDuration || 0;
            if (sectionDuration <= 0 && section.content) {
                // Fallback: Use word count / 150 WPM (matches ScriptEditor.tsx)
                const words = section.content.split(/\s+/).filter(Boolean).length;
                sectionDuration = Math.round((words / 150) * 60);
            }
            sectionDuration = Math.max(sectionDuration, 5); // Absolute minimum 5s per section

            const cues = (section as any).visualCues || (section as any).scenes || [];
            console.log(`[VideoEngine] - Found ${cues.length} visual cues for section ${section.id}`);

            if (cues.length === 0) {
                // Fallback scene if no cues exist
                timeline.push({
                    id: `fallback-${section.id}`,
                    sectionId: section.id,
                    sectionTitle: section.title,
                    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000',
                    audioUrl: section.audioUrl || undefined,
                    sectionStartTime: totalTimeOffset,
                    startTime: totalTimeOffset,
                    duration: sectionDuration,
                    cueDescription: 'General section visualization',
                    transitionType: 'fade',
                    transitionDuration: 1000,
                    narrationText: section.content
                });
            } else {
                // Multi-Track Logic
                // 1. Group Cues by Track
                const videoCues = cues.filter((c: any) => !c.trackId || c.trackId === 'video').sort((a: any, b: any) => a.timestamp - b.timestamp);
                const brollCues = cues.filter((c: any) => c.trackId === 'broll').sort((a: any, b: any) => a.timestamp - b.timestamp);
                const audioCues = cues.filter((c: any) => c.trackId === 'audio').sort((a: any, b: any) => a.timestamp - b.timestamp);

                // 2. Process Video Track (Linear/Sequential)
                for (let i = 0; i < videoCues.length; i++) {
                    const cue = videoCues[i];
                    const nextCue = videoCues[i + 1];

                    // Video track duration is gap-to-next or section end
                    const gapDuration = nextCue ? nextCue.timestamp - cue.timestamp : sectionDuration - cue.timestamp;
                    const cueDuration = cue.overrideDuration != null ? Math.max(0.1, cue.overrideDuration) : gapDuration;

                    timeline.push(this.mapCueToScene(cue, section, totalTimeOffset, cueDuration));
                }

                // 3. Process Overlay Tracks (Absolute/Overlapping)
                [...brollCues, ...audioCues].forEach(cue => {
                    const cueDuration = cue.overrideDuration != null 
                        ? Math.max(0.1, cue.overrideDuration) 
                        : (cue.sourceDuration || 4.0);
                    
                    timeline.push(this.mapCueToScene(cue, section, totalTimeOffset, cueDuration));
                });
            }

            totalTimeOffset += sectionDuration;
        }

        // Final sort: important for single-pass renderer logic
        return timeline.sort((a, b) => a.startTime - b.startTime);
    },

    /**
     * Helper to map a VisualCue to a Scene object
     */
    mapCueToScene(cue: any, section: ScriptSection, totalTimeOffset: number, duration: number): Scene {
        return {
            id: cue.id,
            sectionId: section.id,
            sectionTitle: section.title,
            imageUrl: cue.url || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000',
            videoUrl: cue.videoUrl,
            sourceDuration: cue.sourceDuration,
            audioUrl: section.audioUrl || undefined,
            sectionStartTime: totalTimeOffset,
            startTime: totalTimeOffset + cue.timestamp,
            duration: Math.max(duration, 0.1),
            cueDescription: cue.description,
            transitionType: cue.transitionType || 'fade',
            transitionDuration: cue.transitionDuration || 1000,
            fadeOutDuration: cue.fadeOutDuration || 0,
            sfxUrl: cue.sfxUrl,
            sfxVolume: cue.sfxVolume,
            sfxOffset: cue.sfxOffset,
            sfxLabel: cue.sfxLabel,
            narrationText: section.content,
            volume: cue.volume ?? cue.sfxVolume ?? 1.0,
            inPoint: cue.inPoint,
            outPoint: cue.outPoint,
            trackId: cue.trackId,
        };
    }
};

