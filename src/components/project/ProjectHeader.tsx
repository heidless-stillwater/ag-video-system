import React from 'react';
import Link from 'next/link';
import { Project, User, UsageLog, Script } from '@/types';
import { EnvironmentMode, EnvironmentConfig } from '@/lib/config/environment';

interface ProjectHeaderProps {
    project: Project;
    currentUser: User | null;
    envMode: EnvironmentMode;
    envConfig: EnvironmentConfig;
    costLogs: UsageLog[];
    projectCost: number;
    projectedTotal: number;
    script: Script | null;
    viewMode: 'overview' | 'timeline' | 'settings';
    onSetViewMode: (mode: 'overview' | 'timeline' | 'settings') => void;
    onDelete: () => void;
    isDirectorDrawerOpen: boolean;
    onToggleDirectorDrawer: () => void;
    onConnectYouTube: () => void;
    isConnectingYouTube: boolean;
    youtubeChannelStatus: any;
    steps: {
        id: string;
        label: string;
        status: 'active' | 'completed' | 'pending';
    }[];
    onStepClick?: (stepId: string) => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
    project,
    currentUser,
    envMode,
    envConfig,
    costLogs,
    projectCost,
    projectedTotal,
    script,
    viewMode,
    onSetViewMode,
    onDelete,
    isDirectorDrawerOpen,
    onToggleDirectorDrawer,
    onConnectYouTube,
    isConnectingYouTube,
    youtubeChannelStatus,
    steps,
    onStepClick
}) => {
    return (
        <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 group">
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-3">
                            {project.title}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${project.status === 'ready' ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                                    project.status === 'rendering' ? 'bg-blue-600 text-white animate-pulse' :
                                        project.status === 'generating_media' ? 'bg-purple-600 text-white animate-pulse' :
                                            project.status === 'publishing' || project.status === 'published' ? 'bg-red-500 text-white animate-pulse' :
                                            'bg-slate-800 text-slate-400'
                                 }`}>
                                {project.status.replace('_', ' ')}
                            </span>
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="capitalize">{project.status.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{project.estimatedDuration} minutes</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${envMode === 'DEV' ? 'bg-green-500/20 text-green-400' :
                                envMode === 'STAGING' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                {envMode === 'STAGING_LIMITED' ? 'STAGING' : envMode} {envConfig.ai.limitAI ? '(Limit AI)' : (envConfig.ai.model === 'mock' ? '(Mock)' : '(Real AI)')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">

                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-colors">
                        Export Project
                    </button>



                    <button
                        onClick={onToggleDirectorDrawer}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg ${isDirectorDrawerOpen
                            ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                    >
                        <span>🎛️</span>
                        {isDirectorDrawerOpen ? 'Close Suite' : "Director's Suite"}
                    </button>

                    {/* YouTube Connection Indicator in Header */}
                    {currentUser?.settings.youtubeConnected ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 border border-red-500/20 rounded-lg">
                            {(youtubeChannelStatus?.channelThumb || currentUser?.youtubeChannelInfo?.thumbnailUrl) ? (
                                <img src={youtubeChannelStatus?.channelThumb || currentUser?.youtubeChannelInfo?.thumbnailUrl} className="w-5 h-5 rounded-full border border-red-500/30" alt="Channel Avatar" />
                            ) : (
                                <span className="text-red-500">📺</span>
                            )}
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{youtubeChannelStatus?.channelTitle || currentUser?.youtubeChannelInfo?.title || 'YouTube Linked'}</span>
                        </div>
                    ) : (
                        <button
                            onClick={onConnectYouTube}
                            disabled={isConnectingYouTube}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                        >
                            {isConnectingYouTube ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : '📺 Connect YouTube'}
                        </button>
                    )}

                </div>
            </div>



            {/* Progress Steps & View Switcher */}
            <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Phase Selector - Matches width of first column (col-span-2) */}
                <div className="lg:col-span-2 flex w-full items-center overflow-x-auto no-scrollbar pb-2 md:pb-0 min-w-0">
                    {steps.map((step, i) => (
                        <div key={step.id} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                            <button 
                                onClick={() => step.status !== 'pending' && onStepClick?.(step.id)}
                                disabled={step.status === 'pending'}
                                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${step.status === 'active'
                                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 hover:bg-blue-600/20'
                                    : step.status === 'completed'
                                        ? 'bg-green-600/10 border-green-500 text-green-400 hover:bg-green-600/20 cursor-pointer'
                                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                }`}>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${step.status === 'active' ? 'bg-blue-500 text-white' :
                                    step.status === 'completed' ? 'bg-green-500 text-white' : 'bg-slate-800'
                                    }`}>
                                    {i + 1}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wide">{step.label}</span>
                            </button>
                            {i < steps.length - 1 && <div className="flex-1 min-w-[16px] h-[1px] bg-slate-800 mx-2"></div>}
                        </div>
                    ))}
                </div>

                {/* View Switcher - Matches width of second column (col-span-1) */}
                <div className="lg:col-span-1 flex bg-slate-900/50 p-1 rounded-xl border border-white/5 justify-end">
                    <button
                        onClick={() => onSetViewMode('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => {
                            if (script) onSetViewMode('timeline');
                        }}
                        disabled={!script}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            viewMode === 'timeline' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : !script
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-white'
                        }`}
                        title={!script ? 'Generate a script to unlock Timeline' : ''}
                    >
                        Timeline Editor
                    </button>

                </div>
            </div>
        </div>
    );
};
