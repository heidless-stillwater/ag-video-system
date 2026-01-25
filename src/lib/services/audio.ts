// Audio Service for managing ambient music and soundscapes

export interface AmbientTrack {
    id: string;
    title: string;
    description: string;
    url: string;
    bpm: number;
}

export const AMBIENT_TRACKS: AmbientTrack[] = [
    {
        id: 'space-drift',
        title: 'Space Drift',
        description: 'Ethereal synth pads with deep low-end pulses. Perfect for cosmic silence.',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Direct MP3 Example
        bpm: 60
    },
    {
        id: 'forest-whisper',
        title: 'Forest Whisper',
        description: 'Soft wind through leaves with distant bird songs and gentle rain.',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Direct MP3 Example
        bpm: 65
    },
    {
        id: 'midnight-lake',
        title: 'Midnight Lake',
        description: 'Hypnotic rhythmic water ripples and cricket textures.',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', // Direct MP3 Example
        bpm: 70
    },
    {
        id: 'deep-meditation',
        title: 'Deep Meditation',
        description: 'Minimalist Tibetan bowl resonance with steady brown noise.',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', // Direct MP3 Example
        bpm: 60
    }
];

export const audioService = {
    getTracks(): AmbientTrack[] {
        return AMBIENT_TRACKS;
    },

    getTrackById(id: string): AmbientTrack | undefined {
        return AMBIENT_TRACKS.find(t => t.id === id);
    },

    /**
     * Logic for automatic voice ducking.
     * Calculates the target music volume based on whether narrator is active.
     */
    calculateDuckedVolume(isNarratorPlaying: boolean, baseVolume: number = 0.2): number {
        const duckFactor = 0.3; // Reduce music to 30% of its base volume when narrator speaks
        return isNarratorPlaying ? baseVolume * duckFactor : baseVolume;
    }
};
