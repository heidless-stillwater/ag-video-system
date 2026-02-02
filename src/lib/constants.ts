export const SUPPORTED_LANGUAGES = [
    { code: 'es-ES', name: 'Spanish 🇪🇸' },
    { code: 'fr-FR', name: 'French 🇫🇷' },
    { code: 'de-DE', name: 'German 🇩🇪' },
    { code: 'it-IT', name: 'Italian 🇮🇹' },
    { code: 'pt-BR', name: 'Portuguese 🇧🇷' },
    { code: 'ja-JP', name: 'Japanese 🇯🇵' },
    { code: 'zh-CN', name: 'Chinese 🇨🇳' },
    { code: 'hi-IN', name: 'Hindi 🇮🇳' },
    { code: 'ar-SA', name: 'Arabic 🇸🇦' },
    { code: 'ru-RU', name: 'Russian 🇷🇺' }
];

export const VOICE_PROFILES = [
    { id: 'standard', label: 'Standard', desc: 'Balanced & professional' },
    { id: 'soft', label: 'Soft', desc: 'Gentle & soothing whispers' },
    { id: 'deep', label: 'Deep', desc: 'Resonant & authoritative' },
    { id: 'whisper', label: 'Whisper', desc: 'Intimate sleep-focused tone' }
] as const;
