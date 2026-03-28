import React, { useState } from 'react';
import { Project, Script } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, ChevronDown } from 'lucide-react';

interface TypographySettingsProps {
    project: Project;
    script: Script | null;
    onSubtitleToggle: () => void;
    onSubtitleStyleChange: (style: 'minimal' | 'classic' | 'bold') => void;
}

export const TypographySettings: React.FC<TypographySettingsProps> = ({
    project,
    script,
    onSubtitleToggle,
    onSubtitleStyleChange
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!script || !['scripting', 'generating_media', 'assembling', 'ready'].includes(project.status)) {
        return null;
    }

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 mb-8 max-w-2xl relative overflow-hidden group/sub">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/sub:bg-amber-500/10 transition-all duration-700"></div>
            
            <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors relative z-10"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Type className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kinetic Typography</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Burn-in professional, sleep-optimized subtitles into your final rendering.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSubtitleToggle();
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${project.subtitlesEnabled ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                    >
                        {project.subtitlesEnabled ? 'Enabled' : 'Disabled'}
                    </button>
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
                        <div className="p-6 pt-0 border-t border-white/5 relative z-10 mt-4">
                            <div className="flex gap-2">
                                {(['minimal', 'classic', 'bold'] as const).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => onSubtitleStyleChange(style)}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${project.subtitleStyle === style || (!project.subtitleStyle && style === 'minimal')
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                    >
                                        {style}
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
