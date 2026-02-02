import React from 'react';
import { Project, Script } from '@/types';

interface MediaGenerationActionsProps {
    project: Project;
    script: Script | null;
    isGeneratingMedia: boolean;
    onGenerateMediaClick: () => void;
    onCancelMedia: () => void;
}

export const MediaGenerationActions: React.FC<MediaGenerationActionsProps> = ({
    project,
    script,
    isGeneratingMedia,
    onGenerateMediaClick,
    onCancelMedia
}) => {
    // Show button if: scripting/generating/assembling, script exists, and NOT currently generating
    const showButton = (project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling') &&
        script && project.status !== 'generating_media';

    // Show progress if currently generating
    const showProgress = project.status === 'generating_media';

    if (!showButton && !showProgress) return null;

    return (
        <>
            {showButton && (
                <button
                    onClick={onGenerateMediaClick}
                    disabled={isGeneratingMedia}
                    className="px-8 py-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-3 border border-slate-700"
                >
                    {isGeneratingMedia ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            <span>Synthesizing Visual Assets...</span>
                        </>
                    ) : (
                        <span>{project.status === 'assembling' ? '🔄 Regenerate Visual Assets' : '🖼️ Generate Visual Assets'}</span>
                    )}
                </button>
            )}

            {showProgress && (
                <div className="flex-1 max-w-xl bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-purple-600 to-pink-400 transition-all duration-700 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${project.mediaProgress || 0}%` }}></div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-5 h-5 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-sm animate-pulse"></div>
                            </div>
                            <span className="text-sm font-black text-white uppercase tracking-widest">{project.mediaProgress === 100 ? 'Finalizing...' : 'Synthesizing Visual Assets...'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                <span className="text-xs font-mono font-bold text-purple-400">{project.mediaProgress || 0}%</span>
                            </div>
                            <button
                                onClick={onCancelMedia}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors border border-red-500/20"
                                title="Cancel Generation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Art Factory:</span>
                        <p className="text-[10px] text-purple-200/70 font-medium italic animate-pulse">
                            {project.mediaMessage || 'Initializing cinematic generation...'}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};
