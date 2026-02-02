import React, { useState, useRef } from 'react';
import { Project } from '@/types';
import { VOICE_PROFILES } from '@/lib/constants';

interface VoiceProfileSelectorProps {
    currentProfile: Project['voiceProfile'];
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    languageCode?: string;
}

export const VoiceProfileSelector: React.FC<VoiceProfileSelectorProps> = ({
    currentProfile,
    onUpdateVoiceProfile,
    languageCode
}) => {
    const [auditioningProfile, setAuditioningProfile] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleAudition = async (profileId: string) => {
        if (auditioningProfile === profileId) {
            if (audioRef.current) {
                audioRef.current.pause();
                setAuditioningProfile(null);
            }
            return;
        }

        setAuditioningProfile(profileId);
        try {
            // Stop any current playback
            if (audioRef.current) {
                audioRef.current.pause();
            }

            const response = await fetch('/api/tts/sample', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voiceProfile: profileId,
                    languageCode: languageCode || 'en-US'
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch voice sample');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            audio.addEventListener('ended', () => {
                setAuditioningProfile(null);
                URL.revokeObjectURL(url);
            });

            audio.play();

        } catch (err) {
            console.error('Audition error:', err);
            setAuditioningProfile(null);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-purple-600/10 transition-all duration-700"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                        <span className="text-purple-400">🎙️</span> The Sleep Suite
                    </h3>
                    <p className="text-slate-400 text-sm max-w-md">
                        Select the narrative voice that best fits your documentary's mood.
                        Changing the profile will apply to all future audio generations.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {VOICE_PROFILES.map((profile) => (
                        <div key={profile.id} className="relative group/card">
                            <button
                                onClick={() => onUpdateVoiceProfile(profile.id as any)}
                                className={`w-full p-4 rounded-2xl border transition-all text-left flex flex-col gap-1 ${(currentProfile || 'standard') === profile.id
                                    ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/10'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <span className={`text-xs font-bold ${(currentProfile || 'standard') === profile.id ? 'text-purple-400' : 'text-white'
                                    }`}>
                                    {profile.label}
                                </span>
                                <span className="text-[9px] text-slate-500 leading-tight">{profile.desc}</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAudition(profile.id);
                                }}
                                className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all border ${auditioningProfile === profile.id
                                    ? 'bg-purple-500 border-purple-400 animate-pulse'
                                    : 'bg-slate-800 border-white/5 opacity-0 group-hover/card:opacity-100 hover:bg-slate-700'
                                    }`}
                                title="Listen to sample"
                            >
                                {auditioningProfile === profile.id ? '⏹️' : '👂'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
