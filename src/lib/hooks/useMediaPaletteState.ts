import { ProjectStatus } from '@/types';

export interface MediaPaletteTabState {
    visuals: boolean;
    audio: boolean;
    typography: boolean;
    mastering: boolean;
}

const EARLY_PHASES: ProjectStatus[] = ['draft', 'researching'];
const MASTERING_PHASES: ProjectStatus[] = ['assembling', 'rendering', 'ready', 'review', 'publishing', 'published'];

/**
 * Returns which Media Palette tabs are enabled based on the current project phase.
 * 
 * - Visuals (Aesthetic): Always available
 * - Audio (Sound Designer + Soundscape + Mixer): Available from scripting onward
 * - Typography (Kinetic Typography): Available from scripting onward
 * - Mastering (Voiceover Mastering Track): Available from assembling onward
 */
export function useMediaPaletteState(status: ProjectStatus): MediaPaletteTabState {
    return {
        visuals: true,
        audio: !EARLY_PHASES.includes(status),
        typography: !EARLY_PHASES.includes(status),
        mastering: MASTERING_PHASES.includes(status),
    };
}

/**
 * Returns a human-readable phase label for disabled tab tooltips.
 */
export function getPhaseRequirement(tab: keyof MediaPaletteTabState): string {
    switch (tab) {
        case 'visuals': return '';
        case 'audio': return 'Available from Scripting phase';
        case 'typography': return 'Available from Scripting phase';
        case 'mastering': return 'Available from Assembly phase';
    }
}
