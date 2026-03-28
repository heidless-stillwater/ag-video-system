'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Palette, 
    X, 
    Sparkles, 
    Music, 
    Type, 
    Mic2 
} from 'lucide-react';
import { Project, Script, VisualStyle, User } from '@/types';
import { useMediaPaletteState, getPhaseRequirement, MediaPaletteTabState } from '@/lib/hooks/useMediaPaletteState';
import { StyleSelector } from './StyleSelector';
import { AmbientMusicSelector } from './AmbientMusicSelector';
import { AudioMixer } from './AudioMixer';
import { SoundDesigner } from './SoundDesigner';
import { TypographySettings } from './TypographySettings';
import { MasteringBooth } from './MasteringBooth';

interface MediaPaletteProps {
    project: Project;
    script: Script | null;
    currentUser: User | null;
    isSoundDesigning: boolean;
    isGeneratingAllAudio: boolean;
    generatingAudioId: string | null;
    isGeneratingMedia: boolean;
    onMusicSelect: (trackId: string) => void;
    onAmbianceSelect: (layerId: string) => void;
    onGenerateSoundDesign: () => void;
    onVolumeChange: (type: any, value: any) => void;
    onSubtitleToggle: () => void;
    onSubtitleStyleChange: (style: any) => void;
    onUpdateStyle: (style: VisualStyle) => void;
    onRegenerateLine: (sectionId: string, voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onRegenerateAll: (voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    onOpenMasteringModal?: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
}

type TabId = keyof MediaPaletteTabState;

const TABS: { id: TabId; label: string; icon: typeof Sparkles }[] = [
    { id: 'visuals',    label: 'Aesthetic',   icon: Sparkles },
    { id: 'audio',      label: 'Soundscape',  icon: Music },
    { id: 'typography', label: 'Typography',  icon: Type },
    { id: 'mastering',  label: 'Mastering',   icon: Mic2 },
];

export const MediaPalette: React.FC<MediaPaletteProps> = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('visuals');
    const tabState = useMediaPaletteState(props.project.status);

    const togglePalette = () => setIsOpen(!isOpen);

    // If user switches to a tab that becomes disabled (e.g. project regresses), fall back
    if (!tabState[activeTab]) {
        const firstEnabled = TABS.find(t => tabState[t.id]);
        if (firstEnabled && firstEnabled.id !== activeTab) {
            setActiveTab(firstEnabled.id);
        }
    }

    return (
        <>
            {/* Floating Trigger Button */}
            <div className="fixed bottom-8 right-8 z-[200]">
                <button
                    onClick={togglePalette}
                    className={`
                        p-4 rounded-2xl shadow-2xl transition-all duration-500
                        ${isOpen 
                            ? 'bg-red-500/80 hover:bg-red-500 rotate-90 scale-90' 
                            : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-110 hover:shadow-indigo-500/30'}
                        border border-white/20
                    `}
                    title={isOpen ? 'Close Palette' : 'Open Media Palette'}
                >
                    {isOpen ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <div className="relative">
                            <Palette className="w-6 h-6 text-white" />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping opacity-75" />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full" />
                        </div>
                    )}
                </button>
            </div>

            {/* Main Palette Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed bottom-24 right-8 z-[199] w-[92vw] md:w-[620px] max-h-[80vh] bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 pt-5 pb-4 border-b border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/20">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white tracking-tight">Multimedia Palette</h3>
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                            Phase: {props.project.status.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
                                {TABS.map((tab) => {
                                    const isEnabled = tabState[tab.id];
                                    const isActive = activeTab === tab.id;
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => isEnabled && setActiveTab(tab.id)}
                                            disabled={!isEnabled}
                                            title={!isEnabled ? getPhaseRequirement(tab.id) : tab.label}
                                            className={`
                                                relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex-1 justify-center
                                                ${isActive 
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                                    : isEnabled 
                                                        ? 'text-slate-400 hover:bg-white/5 hover:text-white' 
                                                        : 'text-slate-600 cursor-not-allowed'}
                                            `}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            {/* Locked indicator for disabled tabs */}
                                            {!isEnabled && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-slate-700 rounded-full flex items-center justify-center text-[6px]">
                                                    🔒
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                >
                                    {activeTab === 'visuals' && (
                                        <StyleSelector
                                            selectedStyle={props.project.visualStyle}
                                            onStyleSelect={props.onUpdateStyle}
                                        />
                                    )}

                                    {activeTab === 'audio' && (
                                        <div className="space-y-8">
                                            <SoundDesigner
                                                project={props.project}
                                                script={props.script}
                                                isSoundDesigning={props.isSoundDesigning}
                                                onAmbianceSelect={props.onAmbianceSelect}
                                                onGenerateSoundDesign={props.onGenerateSoundDesign}
                                                interceptAction={props.interceptAction}
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <AmbientMusicSelector
                                                    project={props.project}
                                                    onMusicSelect={props.onMusicSelect}
                                                />
                                                <AudioMixer
                                                    project={props.project}
                                                    onVolumeChange={props.onVolumeChange}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'typography' && (
                                        <TypographySettings
                                            project={props.project}
                                            script={props.script}
                                            onSubtitleToggle={props.onSubtitleToggle}
                                            onSubtitleStyleChange={props.onSubtitleStyleChange}
                                        />
                                    )}

                                    {activeTab === 'mastering' && (
                                        <>
                                            {props.script ? (
                                                <MasteringBooth
                                                    project={props.project}
                                                    script={props.script}
                                                    onRegenerateLine={props.onRegenerateLine}
                                                    onRegenerateAll={props.onRegenerateAll}
                                                    onUpdateVoiceProfile={props.onUpdateVoiceProfile}
                                                    isGenerating={props.isGeneratingAllAudio || !!props.generatingAudioId}
                                                    generatingId={props.generatingAudioId}
                                                    isMediaGenerating={props.isGeneratingMedia}
                                                    onOpenModal={props.onOpenMasteringModal}
                                                />
                                            ) : (
                                                <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
                                                    <Mic2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                        Script required for mastering
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                            <span>Media Palette v1.0</span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
