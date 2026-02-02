'use client';

import React, { useState, useEffect } from 'react';
import { Project, Script } from '@/types';
import { useSectionAudio } from '@/lib/hooks/useSectionAudio';
import { VoiceProfileSelector } from './mastering/VoiceProfileSelector';
import { SectionMasteringRow } from './mastering/SectionMasteringRow';
import { VOICE_PROFILES } from '@/lib/constants';

interface MasteringBoothProps {
    project: Project;
    script: Script;
    onRegenerateLine: (sectionId: string, voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onRegenerateAll: (voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    isGenerating: boolean;
    generatingId?: string | null;
}

export const MasteringBooth: React.FC<MasteringBoothProps> = ({
    project,
    script,
    onRegenerateLine,
    onRegenerateAll,
    onUpdateVoiceProfile,
    isGenerating,
    generatingId
}) => {
    const [selectedVoices, setSelectedVoices] = useState<Record<string, Project['voiceProfile']>>({});
    const [globalSelectedVoice, setGlobalSelectedVoice] = useState<Project['voiceProfile']>(project.voiceProfile || 'standard');

    // Sync global selection when project voice profile changes
    useEffect(() => {
        if (project.voiceProfile) {
            setGlobalSelectedVoice(project.voiceProfile);
        }
    }, [project.voiceProfile]);

    // Use the extracted audio hook
    const { playingId, isPaused, progress, playPause, stop, rewind } = useSectionAudio();

    const handleRegenerateLine = (sectionId: string) => {
        stop();
        onRegenerateLine(sectionId, selectedVoices[sectionId] || project.voiceProfile || 'standard');
    };

    const handleRegenerateAll = () => {
        stop();
        onRegenerateAll(globalSelectedVoice);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Voice Selection */}
            <VoiceProfileSelector
                currentProfile={project.voiceProfile}
                onUpdateVoiceProfile={onUpdateVoiceProfile}
                languageCode={script.languageCode}
            />

            {/* Mastering List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Voiceover Mastering Track</h4>
                    <div className="flex items-center gap-3">
                        <select
                            value={globalSelectedVoice}
                            onChange={(e) => setGlobalSelectedVoice(e.target.value as any)}
                            className="bg-slate-800 border-white/5 text-[10px] font-bold text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer"
                        >
                            {VOICE_PROFILES.map(p => (
                                <option key={p.id} value={p.id}>{p.label} Voice</option>
                            ))}
                        </select>
                        <button
                            onClick={handleRegenerateAll}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            {isGenerating && !generatingId ? (
                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span>🎙️ Re-render All Audio</span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {script.sections.map((section, idx) => (
                        <SectionMasteringRow
                            key={section.id}
                            section={section}
                            index={idx}
                            selectedVoice={selectedVoices[section.id] || project.voiceProfile || 'standard'}
                            onVoiceChange={(voice) => setSelectedVoices(prev => ({ ...prev, [section.id]: voice as any }))}
                            isPlaying={playingId === section.id}
                            isPaused={isPaused}
                            progress={progress}
                            onPlayPause={() => section.audioUrl && playPause(section.id, `${section.audioUrl}${section.audioUrl.includes('?') ? '&' : '?'}t=${Date.now()}`)}
                            onStop={stop}
                            onRewind={rewind}
                            onRegenerate={() => handleRegenerateLine(section.id)}
                            isGenerating={generatingId === section.id}
                            isGlobalGenerating={isGenerating}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
