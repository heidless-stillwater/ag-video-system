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
    audioUrl?: string; // Audio URL of the entire section this scene belongs to
    startTime: number; // Seconds from documentary start
    duration: number; // Seconds to display this specific image
    cueDescription: string;
    transitionType: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration: number;
    sfxUrl?: string;
    sfxVolume?: number;
    narrationText?: string;
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
                // Fallback: Use word count / 130 WPM
                const words = section.content.split(/\s+/).length;
                sectionDuration = Math.ceil((words / 130) * 60);
            }
            sectionDuration = Math.max(sectionDuration, 5); // Absolute minimum 5s per section

            const cues = section.visualCues || [];
            console.log(`[VideoEngine] - Found ${cues.length} visual cues for section ${section.id}`);

            if (cues.length === 0) {
                // Fallback scene if no cues exist
                timeline.push({
                    id: `fallback-${section.id}`,
                    sectionId: section.id,
                    sectionTitle: section.title,
                    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000',
                    audioUrl: section.audioUrl,
                    startTime: totalTimeOffset,
                    duration: sectionDuration,
                    cueDescription: 'General section visualization',
                    transitionType: 'fade',
                    transitionDuration: 1000,
                    narrationText: section.content
                });
            } else {
                // Sort cues by timestamp
                const sortedCues = [...cues].sort((a, b) => a.timestamp - b.timestamp);

                // Safety check: Detect and fix "millisecond" hallucinations (e.g. 8000 instead of 8)
                for (let i = 0; i < sortedCues.length; i++) {
                    if (sortedCues[i].timestamp > 100 && sortedCues[i].timestamp > sectionDuration * 1.5) {
                        console.warn(`[VideoEngine] Detected likely millisecond timestamp (${sortedCues[i].timestamp}). Normalizing to seconds.`);
                        sortedCues[i] = { ...sortedCues[i], timestamp: sortedCues[i].timestamp / 1000 };
                    }
                    // Final clamp: Cannot exceed sectionDuration
                    if (sortedCues[i].timestamp > sectionDuration) {
                        console.warn(`[VideoEngine] Clamping timestamp ${sortedCues[i].timestamp} to section end ${sectionDuration}`);
                        sortedCues[i] = { ...sortedCues[i], timestamp: Math.max(0, sectionDuration - 0.1) };
                    }
                }

                // Ensure there's a cue at timestamp 0 without adding an extra scene
                if (sortedCues[0].timestamp > 0) {
                    console.log(`[VideoEngine] - Adjusting first cue for section ${section.id} from ${sortedCues[0].timestamp}s to 0s`);
                    sortedCues[0] = { ...sortedCues[0], timestamp: 0 };
                }

                for (let i = 0; i < sortedCues.length; i++) {
                    const cue = sortedCues[i];
                    const nextCue = sortedCues[i + 1];

                    // Duration is until the next cue, or until the end of the section
                    const cueDuration = nextCue
                        ? nextCue.timestamp - cue.timestamp
                        : sectionDuration - cue.timestamp;

                    console.log(`[VideoEngine DEBUG] Cue ID: ${cue.id} | Type: ${cue.transitionType} | Duration: ${cue.transitionDuration} | Raw: ${JSON.stringify(cue)}`);

                    timeline.push({
                        id: cue.id,
                        sectionId: section.id,
                        sectionTitle: section.title,
                        imageUrl: cue.url || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000',
                        audioUrl: section.audioUrl,
                        startTime: totalTimeOffset + cue.timestamp,
                        duration: Math.max(cueDuration, 0.1),
                        cueDescription: cue.description,
                        transitionType: cue.transitionType || 'fade',
                        transitionDuration: cue.transitionDuration || 1000,
                        sfxUrl: cue.sfxUrl,
                        sfxVolume: cue.sfxVolume,
                        narrationText: section.content
                    });
                }
            }

            totalTimeOffset += sectionDuration;
        }

        console.log(`[VideoEngine] Final Timeline: ${timeline.length} scenes generated.`);
        return timeline;
    }
};
