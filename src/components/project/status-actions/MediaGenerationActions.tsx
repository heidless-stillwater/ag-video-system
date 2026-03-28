import React from 'react';
import { Project, Script } from '@/types';

interface MediaGenerationActionsProps {
    project: Project;
    script: Script | null;
    isGeneratingMedia: boolean;
    onGenerateMediaClick: () => void;
    onCancelMedia: () => void;
    onSetViewMode: (view: 'overview' | 'timeline' | 'settings') => void;
}

export const MediaGenerationActions: React.FC<MediaGenerationActionsProps> = ({
    project,
    script,
    isGeneratingMedia,
    onGenerateMediaClick,
    onCancelMedia,
    onSetViewMode
}) => {
    // Show progress if project status is generating OR if local loading state is active (to bridge the gap)
    const showProgress = project.status === 'generating_media' || isGeneratingMedia;

    // Show button if: scripting/generating/assembling, script exists, and NOT currently showing progress
    const showButton = (project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling') &&
        script && !showProgress;

    if (!showButton && !showProgress) return null;

    return (
        <div className="flex flex-col gap-4 w-full">
            {showButton && (
                <button
                    onClick={onGenerateMediaClick}
                    disabled={isGeneratingMedia}
                    className="group relative w-full h-16 bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 overflow-hidden flex items-center gap-6 px-6"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                    
                    <div className="relative flex items-center gap-6">
                        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isGeneratingMedia ? 'bg-purple-600/10' : 'bg-purple-600/20 group-hover:bg-purple-600/30'}`}>
                            {isGeneratingMedia ? (
                                <div className="relative w-5 h-5">
                                    <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <span className="text-xl">{project.status === 'assembling' ? '🔄' : '🖼️'}</span>
                            )}
                        </div>

                        <div className="relative flex flex-col items-start leading-none text-left">
                            <span className="text-sm font-black uppercase tracking-[0.2em] bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent group-hover:from-white group-hover:to-white transition-colors">
                                {isGeneratingMedia 
                                    ? 'Synthesizing Visual Assets...'
                                    : project.status === 'assembling' 
                                        ? 'Regenerate Visual Palette' 
                                        : 'Generate Media'}
                            </span>
                            {project.visualStyle && !isGeneratingMedia && (
                                <div className="mt-1 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-black uppercase text-purple-400">{project.visualStyle}</span>
                                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                    <span className="text-[8px] font-mono text-white/40">{project.aspectRatio || '16:9'}</span>
                                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                    <span className="text-[8px] font-black uppercase text-purple-400/60">{project.motionIntensity || 'subtle'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isGeneratingMedia && (
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 rounded-full border border-purple-500/30 flex items-center justify-center">
                                <span className="text-[10px] text-purple-400">→</span>
                            </div>
                        </div>
                    )}
                </button>
            )}

            {showButton && project.status === 'assembling' && (
                <button
                    onClick={() => onSetViewMode('timeline')}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                >
                    <span>🎞️ Review Timeline</span>
                </button>
            )}

            {showProgress && (
                <div className="w-full bg-slate-900/80 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl shadow-2xl shadow-purple-500/5">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                    
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Neural Engine Synthesis</span>
                            </div>
                            <h4 className="text-sm font-bold text-white tracking-tight">
                                {project.mediaProgress === 100 ? 'Finalizing Cinematic Assets' : 'Generating High-Fidelity Visuals'}
                            </h4>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-2xl font-mono font-black text-white leading-none">
                                    {project.mediaProgress || 0}<span className="text-sm text-purple-500/60">%</span>
                                </span>
                            </div>
                            <button
                                onClick={onCancelMedia}
                                className="p-2 bg-red-500/5 hover:bg-red-500/20 text-red-500/60 hover:text-red-400 rounded-xl transition-all border border-red-500/10 group/cancel"
                                title="Abort Synthesis"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/cancel:rotate-90 transition-transform duration-300">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full h-3 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-1000 ease-out relative overflow-hidden"
                            style={{ width: `${project.mediaProgress || 0}%` }}
                        >
                        </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                        <div className="mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <p className="text-[11px] text-purple-200/60 font-medium italic leading-relaxed">
                            {project.mediaMessage || 'Calibrating neural weights for cinematic production...'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
