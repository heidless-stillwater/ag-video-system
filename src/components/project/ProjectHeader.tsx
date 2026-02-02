import React from 'react';
import Link from 'next/link';
import { Project, User, UsageLog } from '@/types';
import { EnvironmentMode, EnvironmentConfig } from '@/lib/config/environment';

interface ProjectHeaderProps {
    project: Project;
    currentUser: User | null;
    envMode: EnvironmentMode;
    envConfig: EnvironmentConfig;
    costLogs: UsageLog[];
    projectCost: number;
    projectedTotal: number;
    viewMode: 'overview' | 'timeline' | 'settings';
    onSetViewMode: (mode: 'overview' | 'timeline' | 'settings') => void;
    onDelete: () => void;
    isDirectorDrawerOpen: boolean;
    onToggleDirectorDrawer: () => void;
    onConnectYouTube: () => void;
    isConnectingYouTube: boolean;
    steps: {
        id: string;
        label: string;
        status: 'active' | 'completed' | 'pending';
    }[];
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
    project,
    currentUser,
    envMode,
    envConfig,
    costLogs,
    projectCost,
    projectedTotal,
    viewMode,
    onSetViewMode,
    onDelete,
    isDirectorDrawerOpen,
    onToggleDirectorDrawer,
    onConnectYouTube,
    isConnectingYouTube,
    steps
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
                        <h1 className="text-xl font-bold">{project.title}</h1>
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
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        Delete Project
                    </button>
                    <button
                        onClick={() => onSetViewMode('settings')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'settings' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    >
                        Settings
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-colors">
                        Export Project
                    </button>

                    {/* Director's Suite Toggle */}
                    {project && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest whitespace-nowrap">
                                Style: {project.visualStyle || 'cinematic'}
                            </span>
                        </div>
                    )}

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
                            <span className="text-red-500">📺</span>
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{currentUser.youtubeChannelInfo?.title || 'YouTube Linked'}</span>
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

            {/* Cost Breakdown Bar */}
            <div className="max-w-7xl mx-auto px-4 pb-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between text-xs">
                    <span className="text-white/60 font-mono uppercase tracking-wider">Estimated Project Cost</span>
                    <div className="flex items-center gap-4 font-mono">
                        <span className="text-blue-300">Script: ${costLogs.filter(l => l.operation === 'script-generation').reduce((s, l) => s + (l.estimatedCost || 0), 0).toFixed(2)}</span>
                        <span className="text-purple-300">Media: ${costLogs.filter(l => l.operation === 'image-generation').reduce((s, l) => s + (l.estimatedCost || 0), 0).toFixed(2)}</span>
                        <span className="text-orange-300">Render: ${costLogs.filter(l => l.operation === 'rendering').reduce((s, l) => s + (l.estimatedCost || 0), 0).toFixed(2)}</span>
                        <div className="flex items-center gap-2 border-l border-white/10 pl-4 font-bold">
                            <span className="text-white/40 uppercase text-[10px]">Spent:</span>
                            <span className="text-green-400">${projectCost.toFixed(2)}</span>
                            {projectedTotal > projectCost && (
                                <>
                                    <span className="text-white/20">/</span>
                                    <span className="text-white/40 uppercase text-[10px]">Projected:</span>
                                    <span className="text-blue-400">${projectedTotal.toFixed(2)}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Steps & View Switcher */}
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-4 min-w-fit">
                            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${step.status === 'active'
                                ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                                : step.status === 'completed'
                                    ? 'bg-green-600/10 border-green-500 text-green-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-500'
                                }`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step.status === 'active' ? 'bg-blue-500 text-white' :
                                    step.status === 'completed' ? 'bg-green-500 text-white' : 'bg-slate-800'
                                    }`}>
                                    {i + 1}
                                </span>
                                <span className="text-sm font-medium uppercase tracking-wider">{step.label}</span>
                            </div>
                            {i < steps.length - 1 && <div className="w-8 h-[1px] bg-slate-800"></div>}
                        </div>
                    ))}
                </div>

                {/* View Switcher */}
                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 self-start md:self-auto">
                    <button
                        onClick={() => onSetViewMode('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => onSetViewMode('timeline')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'timeline' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        Timeline Editor
                    </button>
                    <button
                        onClick={() => onSetViewMode('settings')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
