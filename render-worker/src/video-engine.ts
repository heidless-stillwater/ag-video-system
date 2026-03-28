export interface Scene {
    id: string;
    sectionId: string;
    narrationText?: string;
    imageUrl: string;
    videoUrl?: string;
    audioUrl?: string; // URL of the narration MP3
    sfxUrl?: string;
    duration: number; // Seconds
    startTime: number; // Absolute start time in the final video
    transitionType: 'fade' | 'blur' | 'zoom' | 'slide' | 'dissolve';
    transitionDuration?: number; // ms
    trackId?: string; // 'video' | 'broll' | 'overlay'
}
