import { Project, Script, User } from '@/types';
import { ProjectStatusActions } from './ProjectStatusActions';
import { Settings, Clock, Zap, Sparkles, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ProjectStatusCardProps {
    project: Project;
    script: Script | null;
    error: string | null;
    currentUser: User | null;
    isResearching: boolean;
    isScripting: boolean;
    isSoundDesigning: boolean;
    isGeneratingMedia: boolean;
    isAssembling: boolean;
    isRendering: boolean;
    isDownloading: boolean;
    isGeneratingMetadata: boolean;
    isGeneratingAllAudio: boolean;
    generatingAudioId: string | null;
    publishDisplayProgress: number;
    isConnectingYouTube: boolean;
    youtubeChannelStatus: any;
    persona: string;
    onPersonaChange: (persona: string) => void;
    onLaunchResearch: () => void;
    onCancelResearch?: () => void;
    onGenerateScript: () => void;
    onGenerateMediaClick: () => void;
    onCancelMedia: () => void;
    onAssemble: () => void;
    onRender: () => void;
    onLoadSavedRender: (render: any) => void;
    onKillRender: () => void;
    onDownloadMP4: () => void;
    onOpenPublishModal: () => void;
    onCancelPublish: () => Promise<void>;
    onCancelMetadata: () => void;
    onConnectYouTube: () => void;
    onDisconnectYouTube: () => void;
    onSnapshotAndReset: (label: string) => void;
    onResetToAssembling: () => void;
    onRevertToReady: () => void;
    onRevertToScripting: () => void;
    onSkipToAssembly: () => void;
    onSetViewMode: (view: 'overview' | 'timeline' | 'settings') => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
    setStepConfirm: (confirm: any) => void;
    onUpdateProject?: (updates: Partial<Project>) => Promise<void>;
}

export const ProjectStatusCard: React.FC<ProjectStatusCardProps> = (props) => {
    const { project, error } = props;

    return (
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 overflow-hidden relative group shadow-2xl shadow-black/50">
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:bg-blue-600/10 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600/5 rounded-full blur-[100px] -ml-36 -mb-36 group-hover:bg-purple-600/10 transition-all duration-1000"></div>
            
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Project Status</span>
                                </div>
                                <div className="h-[1px] w-8 bg-slate-800"></div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">ID: {project.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <h2 className="text-4xl font-black text-white tracking-tight leading-none">
                                    {project.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </h2>
                                {props.isResearching && (
                                    <button
                                        onClick={props.onLaunchResearch}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-full transition-all group shadow-lg shadow-blue-500/5"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Intel</span>
                                    </button>
                                )}
                                {props.isScripting && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full transition-all group shadow-lg shadow-indigo-500/5">
                                        <div className="w-2 h-2 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Synthesizing...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-slate-400 text-lg leading-relaxed font-medium">
                            {project.status === 'draft' && "Your project is ready to begin. Start the research phase to gather facts and build your documentary outline."}
                            {project.status === 'researching' && "Neural analysis in progress. Extracting key facts and establishing narrative foundations."}
                            {project.status === 'scripting' && "Your cinematic script has been synthesized. Review the narrative structure before generating media."}
                            {project.status === 'generating_media' && "Synthesis engine active. Generating high-fidelity visual assets to match your project's aesthetic profile."}
                            {project.status === 'assembling' && "Documentary assembly complete. Finalizing spatial audio mixing and high-bitrate video packaging."}
                            {project.status === 'ready' && "Production cycle finalized. Your documentary is mastered and ready for high-fidelity distribution."}
                        </p>
                    </div>

                    <ProjectStatusActions
                        {...props}
                        persona={props.persona}
                        onPersonaChange={props.onPersonaChange}
                        onLaunchResearch={props.onLaunchResearch}
                        onCancelResearch={props.onCancelResearch}
                        onGenerateScript={props.onGenerateScript}
                        onGenerateMediaClick={props.onGenerateMediaClick}
                        onCancelMedia={props.onCancelMedia}
                        onAssemble={props.onAssemble}
                        onRender={props.onRender}
                        onLoadSavedRender={props.onLoadSavedRender}
                        onKillRender={props.onKillRender}
                        onDownloadMP4={props.onDownloadMP4}
                        onOpenPublishModal={props.onOpenPublishModal}
                        onCancelPublish={props.onCancelPublish}
                        onCancelMetadata={props.onCancelMetadata}
                        onConnectYouTube={props.onConnectYouTube}
                        onDisconnectYouTube={props.onDisconnectYouTube}
                        onSnapshotAndReset={props.onSnapshotAndReset}
                        onResetToAssembling={props.onResetToAssembling}
                        onRevertToReady={props.onRevertToReady}
                        onRevertToScripting={props.onRevertToScripting}
                        onSkipToAssembly={props.onSkipToAssembly}
                        onSetViewMode={props.onSetViewMode}
                    />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <p className="text-sm font-semibold text-red-400">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

