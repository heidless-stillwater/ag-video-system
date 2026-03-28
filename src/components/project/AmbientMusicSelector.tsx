import React, { useState } from 'react';
import { Project } from '@/types';
import { AMBIENT_TRACKS } from '@/lib/services/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ChevronDown } from 'lucide-react';

interface AmbientMusicSelectorProps {
    project: Project;
    onMusicSelect: (trackId: string) => void;
}

export const AmbientMusicSelector: React.FC<AmbientMusicSelectorProps> = ({ project, onMusicSelect }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 mb-8 max-w-2xl overflow-hidden">
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Music className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Background Soundscape</h3>
                            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">NEW</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Select a cinematic ambient track for your sleep documentary.</p>
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
                        <div className="p-6 pt-0 border-t border-white/5">
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {AMBIENT_TRACKS.map((track: any) => (
                                    <button
                                        key={track.id}
                                        onClick={() => onMusicSelect(track.id)}
                                        className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${project.backgroundMusicUrl === track.url
                                            ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10'
                                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-white leading-tight">{track.title}</span>
                                            {project.backgroundMusicUrl === track.url && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        </div>
                                        <span className="text-[10px] text-slate-500 leading-tight">{track.bpm} BPM • {track.description.split('.')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
