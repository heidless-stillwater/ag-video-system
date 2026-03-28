'use client';

import React, { useState, useEffect } from 'react';
import { Project, Script } from '@/types';
import { useSectionAudio } from '@/lib/hooks/useSectionAudio';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, ChevronDown } from 'lucide-react';
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
    isMediaGenerating?: boolean;
    onOpenModal?: () => void;
}

export const MasteringBooth: React.FC<MasteringBoothProps> = ({
    project,
    script,
    onRegenerateLine,
    onRegenerateAll,
    onUpdateVoiceProfile,
    isGenerating,
    generatingId,
    isMediaGenerating,
    onOpenModal
}) => {
    const [selectedVoices, setSelectedVoices] = useState<Record<string, Project['voiceProfile']>>({});
    const [globalSelectedVoice, setGlobalSelectedVoice] = useState<Project['voiceProfile']>(project.voiceProfile || 'standard');
    const [isCollapsed, setIsCollapsed] = useState(true);

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
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 mb-8 max-w-full overflow-hidden">
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Mic2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Voiceover Mastering Track</h3>
                            <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                                {project.voiceProfile ? VOICE_PROFILES.find(p => p.id === project.voiceProfile)?.label : 'Standard'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Control the narration personality and per-section audio timing.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {onOpenModal && (
                        <button
                            onClick={onOpenModal}
                            className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-500/20 transition-all"
                        >
                            🎛️ Studio Mode
                        </button>
                    )}
                    <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-6 pt-0 border-t border-white/5 space-y-8 mt-6">
                            {/* Header / Voice Selection */}
                            <VoiceProfileSelector
                                currentProfile={project.voiceProfile}
                                onUpdateVoiceProfile={onUpdateVoiceProfile}
                                languageCode={script.languageCode}
                            />

                            {/* Mastering List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Narration Segments</h4>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={globalSelectedVoice}
                                            onChange={(e) => setGlobalSelectedVoice(e.target.value as any)}
                                            className="bg-[#161b22] border-white/5 text-[10px] font-bold text-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer"
                                        >
                                            {VOICE_PROFILES.map(p => (
                                                <option key={p.id} value={p.id} className="bg-[#0d1117] text-white">{p.label} Voice</option>
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
                                                <span>🎙️ Re-render All</span>
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
                                            isMediaGenerating={isMediaGenerating || false}
                                        />
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
