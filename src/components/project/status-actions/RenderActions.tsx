import React from 'react';
import { Project, Script } from '@/types';
import { CostEstimateCard } from '@/components/project/CostEstimateCard';

interface RenderActionsProps {
    project: Project;
    script: Script | null;
    isRendering: boolean;
    onRender: () => void;
    onLoadSavedRender: (render: any) => void;
    onKillRender: () => void;
    setStepConfirm: (confirm: any) => void;
}

export const RenderActions: React.FC<RenderActionsProps> = ({
    project,
    script,
    isRendering,
    onRender,
    onLoadSavedRender,
    onKillRender,
    setStepConfirm
}) => {
    const [isKilling, setIsKilling] = React.useState(false);
    
    // Reset killing state if status is no longer rendering
    React.useEffect(() => {
        if (project.status !== 'rendering') {
            setIsKilling(false);
        }
    }, [project.status]);

    // Show buttons if assembling/review and NOT currently rendering
    const showButtons = (project.status === 'assembling' || project.status === 'review') && !project.downloadUrl;

    // Show progress ONLY if explicitly rendering
    const showProgress = project.status === 'rendering';

    if (!showButtons && !showProgress) return null;

    const handleKill = async () => {
        setIsKilling(true);
        onKillRender();
    };

    return (
        <>
            {showButtons && (
                <div className="flex flex-col gap-6 w-full">
                    {/* Cost Estimate Card */}
                    {script && (
                        <CostEstimateCard
                            scriptCharCount={script.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 0}
                            estimatedDurationMinutes={Math.ceil((script.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 0) / 150)}
                        />
                    )}
                    <button
                        onClick={onRender}
                        disabled={isRendering}
                        className="w-full h-16 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-6"
                    >
                        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isRendering ? 'bg-blue-600/10' : 'bg-blue-600/20 group-hover:bg-blue-600/30'}`}>
                            {isRendering ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="text-xl">🎞️</span>
                            )}
                        </div>
                        <span>{isRendering ? 'Initializing...' : 'Render MP4 Video'}</span>
                    </button>

                    {/* Saved Renders Library */}
                    {project.savedRenders && project.savedRenders.length > 0 && (
                        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">📦 Saved Renders Archive</span>
                            </div>
                            <div className="grid gap-2">
                                {project.savedRenders.map((render) => (
                                    <div key={render.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{render.label}</span>
                                            <span className="text-[10px] text-slate-500 font-medium">{new Date(render.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={render.url}
                                                target="_blank"
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                                title="Preview file"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </a>
                                            <button
                                                onClick={() => onLoadSavedRender(render)}
                                                className="px-4 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Load This Version
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showProgress && (
                <div className="flex-1 flex gap-4 w-full">
                    <div className="flex-1 bg-slate-800/40 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${project.renderProgress || 0}%` }}></div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-5 h-5 border-2 ${isKilling ? 'border-red-500/20 border-t-red-500' : 'border-blue-500/20 border-t-blue-500'} rounded-full animate-spin`}></div>
                                    <div className={`absolute inset-0 ${isKilling ? 'bg-red-500/10' : 'bg-blue-500/10'} rounded-full blur-sm animate-pulse`}></div>
                                </div>
                                <span className="text-sm font-black text-white uppercase tracking-widest truncate max-w-[300px] text-center inline-block">
                                    {isKilling ? '⚠️ Kill Order Received...' : (project.renderProgress === 100 ? 'Finalizing...' : (project.renderMessage || 'Baking High-Quality MP4...'))}
                                </span>
                            </div>
                            <div className={`px-2 py-0.5 ${isKilling ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'} rounded-md`}>
                                <span className={`text-xs font-mono font-bold ${isKilling ? 'text-red-400' : 'text-blue-400'}`}>{project.renderProgress || 0}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Step:</span>
                            <p className={`text-[10px] ${isKilling ? 'text-red-300' : 'text-blue-200/70'} font-medium italic animate-pulse`}>
                                {isKilling ? 'Terminating all remote render processes...' : (project.renderMessage || 'Processing documentary segments...')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setStepConfirm({
                            isOpen: true,
                            title: '🛑 TERMINATE BAKE?',
                            message: 'EXTREME ACTION: This will forcibly terminate ALL server-side render processes and reset the project status. Any progress on the current MP4 will be lost. Continue?',
                            onConfirm: handleKill,
                            confirmLabel: 'KILL PROCESS',
                            isDestructive: true
                        })}
                        disabled={isKilling}
                        className={`px-6 ${isKilling ? 'bg-red-900/40 text-red-500 opacity-50' : 'bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20'} rounded-2xl text-xs font-black uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-2 group whitespace-nowrap`}
                        title={isKilling ? "Terminating..." : "Kill all render processes and reset project"}
                    >
                        <span className={`text-lg ${!isKilling && 'group-hover:scale-125'} transition-transform`}>{isKilling ? '⚠️' : '🔴'}</span>
                        <span>{isKilling ? 'KILL ORDER PLACED...' : 'Terminate Bake'}</span>
                    </button>
                </div>
            )}
        </>
    );
};
