import React, { useState, useRef } from 'react';
import { Project } from '@/types';
import { VOICE_PROFILES } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, ChevronDown } from 'lucide-react';

interface VoiceProfileSelectorProps {
    currentProfile: Project['voiceProfile'];
    currentEngine?: Project['ttsEngine'];
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    onUpdateTTSEngine?: (engine: Project['ttsEngine']) => Promise<void>;
    languageCode?: string;
}

export const VoiceProfileSelector: React.FC<VoiceProfileSelectorProps> = ({
    currentProfile,
    currentEngine = 'google-cloud',
    onUpdateVoiceProfile,
    onUpdateTTSEngine,
    languageCode
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
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
                    languageCode: languageCode || 'en-US',
                    ttsEngine: currentEngine,
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

            audio.play().catch(() => {});

        } catch (err) {
            console.error('Audition error:', err);
            setAuditioningProfile(null);
        }
    };

    return (
        <div className="bg-slate-800/50 border border-white/5 rounded-3xl mb-8 max-w-2xl relative overflow-hidden group/voice">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/voice:bg-indigo-500/10 transition-all duration-700"></div>
            
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors relative z-10"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Mic2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">The Sleep Suite</h3>
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">PREMIUM AI</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Select a narration profile with the perfect bedtime timbre.</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                </motion.div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-6 pt-0 border-t border-white/5 relative z-10 space-y-6">
                            {/* Engine Selection */}
                            <div className="mt-4">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 block">Synthesis Engine</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'google-cloud', label: 'Google', icon: '☁️' },
                                        { id: 'eleven-labs', label: 'Eleven', icon: '🧬' },
                                        { id: 'openai', label: 'OpenAI', icon: '🤖' },
                                        { id: 'murf', label: 'Murf', icon: '🎤' }
                                    ].map((engine) => (
                                        <button
                                            key={engine.id}
                                            onClick={() => onUpdateTTSEngine?.(engine.id as any)}
                                            className={`p-2 rounded-xl border text-center transition-all ${currentEngine === engine.id
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="text-xs mb-1">{engine.icon}</div>
                                            <div className="text-[8px] font-bold uppercase">{engine.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 block">Performance Profile</label>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                {VOICE_PROFILES.map((profile) => (
                                    <div key={profile.id} className="relative group/card">
                                        <button
                                            onClick={() => onUpdateVoiceProfile(profile.id as any)}
                                            className={`w-full p-4 rounded-2xl border transition-all text-left flex flex-col gap-1 ${(currentProfile || 'standard') === profile.id
                                                ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                                }`}
                                        >
                                            <span className={`text-xs font-bold ${(currentProfile || 'standard') === profile.id ? 'text-indigo-400' : 'text-white'
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
                                                ? 'bg-indigo-500 border-indigo-400 animate-pulse'
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
