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

export interface SoundEffect {
    id: string;
    label: string;
    url: string;
    category: 'nature' | 'weather' | 'space' | 'tranquil' | 'ambient';
}

export const SOUND_EFFECTS: SoundEffect[] = [
    { id: 'sfx-birds', label: 'Morning Birds', category: 'nature', url: '/audio/sfx/birds.mp3' },
    { id: 'sfx-fire', label: 'Crackling Fire', category: 'nature', url: '/audio/sfx/fire.mp3' },
    { id: 'sfx-waves', label: 'Gentle Waves', category: 'nature', url: '/audio/sfx/waves.mp3' },
    { id: 'sfx-wind', label: 'Soft Wind', category: 'weather', url: '/audio/sfx/wind.mp3' },
    { id: 'sfx-space', label: 'Cosmic Hum', category: 'space', url: '/audio/sfx/space.mp3' },
    { id: 'sfx-chime', label: 'Zen Chime', category: 'tranquil', url: '/audio/sfx/chime.mp3' }
];

export const AMBIANCE_LAYERS: SoundEffect[] = [
    { id: 'amb-rain', label: 'Rain on Window', category: 'weather', url: '/audio/ambience/rain.mp3' },
    { id: 'amb-forest', label: 'Deep Forest', category: 'nature', url: '/audio/ambience/forest.mp3' },
    { id: 'amb-brown-noise', label: 'Brown Noise', category: 'ambient', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' } // Fallback for now
];

export const audioService = {
    getTracks(): AmbientTrack[] {
        return AMBIENT_TRACKS;
    },

    getTrackById(id: string): AmbientTrack | undefined {
        return AMBIENT_TRACKS.find(t => t.id === id);
    },

    getSFX(): SoundEffect[] {
        return SOUND_EFFECTS;
    },

    getAmbiance(): SoundEffect[] {
        return AMBIANCE_LAYERS;
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
