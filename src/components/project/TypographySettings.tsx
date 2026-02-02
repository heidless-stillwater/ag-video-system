import React from 'react';
import { Project, Script } from '@/types';

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
    if (!script || !['scripting', 'generating_media', 'assembling', 'ready'].includes(project.status)) {
        return null;
    }

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl relative overflow-hidden group/sub">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/sub:bg-amber-500/10 transition-all duration-700"></div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kinetic Typography</h3>
                </div>
                <button
                    onClick={onSubtitleToggle}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${project.subtitlesEnabled ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                >
                    {project.subtitlesEnabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                Burn-in professional, sleep-optimized subtitles into your final rendering.
            </p>

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
    );
};
