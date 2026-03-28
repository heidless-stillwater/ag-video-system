import React from 'react';
import { Project, User } from '@/types';

interface PublishActionsProps {
    project: Project;
    currentUser: User | null;
    isDownloading: boolean;
    onDownloadMP4: () => void;
    youtubeChannelStatus: any;
    isConnectingYouTube: boolean;
    onConnectYouTube: () => void;
    onDisconnectYouTube: () => void;
    onOpenPublishModal: () => void;
    isGeneratingMetadata: boolean;
    onCancelMetadata: () => void;
    publishDisplayProgress: number;
}

export const PublishActions: React.FC<PublishActionsProps> = ({
    project,
    currentUser,
    isDownloading,
    onDownloadMP4,
    youtubeChannelStatus,
    isConnectingYouTube,
    onConnectYouTube,
    onDisconnectYouTube,
    onOpenPublishModal,
    isGeneratingMetadata,
    onCancelMetadata,
    publishDisplayProgress
}) => {
    const isReady = project.status === 'ready';
    const hasDownload = !!project.downloadUrl;

    if (!isReady && !hasDownload) return null;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Success Card */}
            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/20 border border-green-500/20 rounded-3xl p-8 text-center space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-green-500/30 mb-2">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-2xl font-black text-white mb-2">MASTERPIECE READY</h3>
                    <p className="text-slate-400 font-medium">Your ultra-high definition sleep documentary has been successfully rendered.</p>
                </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={onDownloadMP4}
                    disabled={isDownloading || !hasDownload}
                    className={`px-8 py-6 bg-slate-800 hover:bg-slate-700 border border-white/5 disabled:opacity-50 text-white rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-2 group ${isDownloading || !hasDownload ? 'animate-pulse' : ''}`}
                >
                    {isDownloading || !hasDownload ? (
                        <>
                            <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            <span className="text-sm uppercase tracking-widest text-slate-400">
                                {isDownloading ? 'Downloading...' : 'Finalizing...'}
                            </span>
                        </>
                    ) : (
                        <>
                            <svg className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="text-sm font-bold">Download MP4 File</span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Save to Device</span>
                        </>
                    )}
                </button>

                <div className="relative group/parent">
                    {/* YouTube Warning Banner */}
                    {youtubeChannelStatus?.connected && youtubeChannelStatus.needsReauth && (
                        <div className="absolute -top-4 left-0 right-0 z-10 animate-bounce">
                            <div className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-full mx-auto w-fit shadow-xl flex items-center gap-2 border border-orange-400">
                                <span>⚠️ SESSION EXPIRED</span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onConnectYouTube();
                                    }}
                                    className="px-2 py-0.5 bg-white text-orange-600 rounded-md hover:bg-orange-50 underline transition-colors"
                                >
                                    REFRESH NOW
                                </button>
                            </div>
                        </div>
                    )}

                    {/* YouTube Publish Button or Connect Button */}
                    {youtubeChannelStatus?.connected ? (
                        <div className="relative h-full">
                            {/* Status Pulse - Floated in top-right of the button area */}
                            {!youtubeChannelStatus.needsReauth && project.status !== 'publishing' && !isGeneratingMetadata && (
                                <div className="absolute -top-1.5 -right-1.5 z-20">
                                    <span className="flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75 shadow-[0_0_15px_white]"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-white shadow-[0_0_10px_white]"></span>
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={youtubeChannelStatus.needsReauth ? onConnectYouTube : onOpenPublishModal}
                                disabled={isConnectingYouTube || (project.status === 'publishing') || isGeneratingMetadata}
                                className={`w-full h-full px-8 py-6 rounded-2xl font-black shadow-lg transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden group/btn ${youtubeChannelStatus.needsReauth
                                    ? 'bg-slate-900 border-2 border-orange-600/50 hover:border-orange-500 text-orange-500'
                                    : 'bg-[#FF0000] hover:bg-[#E60000] text-white shadow-red-600/20'
                                    }`}
                            >
                                {project.status === 'publishing' ? (
                                    <>
                                        <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-white/90">Uploading to YouTube...</span>
                                            <span className="text-[10px] font-mono text-white/70 mt-1">{publishDisplayProgress || project.publishProgress || 0}%</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all duration-300" style={{ width: `${publishDisplayProgress || project.publishProgress || 0}%` }}></div>
                                    </>
                                ) : isGeneratingMetadata ? (
                                    <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        <p className="text-[10px] leading-tight font-black uppercase tracking-tight text-white/90">
                                            Extracting Script...
                                        </p>
                                    </div>
                                ) : youtubeChannelStatus.needsReauth ? (
                                    <>
                                        <svg className="w-8 h-8 text-orange-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span className="text-sm font-bold">Session Timed Out</span>
                                        <span className="text-[10px] uppercase tracking-widest font-bold">Reconnect to Channel</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform mb-1" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                        </svg>
                                        <span className="text-sm font-bold">Publish to YouTube</span>
                                        <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold flex items-center gap-1">
                                            {youtubeChannelStatus.channelThumb && <img src={youtubeChannelStatus.channelThumb} className="w-4 h-4 rounded-full border border-white/20" alt="" />}
                                            {youtubeChannelStatus.channelTitle}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onConnectYouTube}
                            disabled={isConnectingYouTube}
                            className="w-full h-full px-8 py-6 bg-white hover:bg-slate-100 text-[#FF0000] border border-slate-200 rounded-2xl font-bold shadow-lg transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            {isConnectingYouTube ? (
                                <>
                                    <span className="w-6 h-6 border-2 border-slate-200 border-t-[#FF0000] rounded-full animate-spin"></span>
                                    <span className="text-sm uppercase tracking-widest text-slate-400">Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-8 h-8 text-[#FF0000] group-hover:scale-110 transition-transform mb-1" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                    </svg>
                                    <span className="text-sm font-bold">Connect YouTube Channel</span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Enable One-Click Publishing</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* YouTube Disconnect (Subtle) */}
            {youtubeChannelStatus?.connected && (
                <div className="flex justify-center">
                    <button
                        onClick={onDisconnectYouTube}
                        className="text-[10px] text-slate-500 hover:text-red-400 underline decoration-slate-700 hover:decoration-red-400 transition-all font-mono"
                    >
                        Disconnect {youtubeChannelStatus.channelTitle}
                    </button>
                </div>
            )}

            {/* AI Metadata Slow Modal Overlay */}
            {isGeneratingMetadata && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-12 max-w-lg w-full text-center shadow-[0_0_100px_rgba(255,0,0,0.15)] flex flex-col items-center gap-8 relative overflow-hidden group">
                        {/* Background light effect */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30"></div>
                        
                        <div className="w-24 h-24 bg-red-600/10 rounded-3xl flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-red-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-700"></div>
                            <span className="text-5xl animate-pulse">🪄</span>
                        </div>
                        
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                                AI METADATA<br/>PROCESSING
                            </h2>
                            <p className="text-lg text-slate-400 font-medium">
                                This is taking longer than expected. You can wait or return to the project.
                            </p>
                        </div>

                        <div className="flex flex-col w-full gap-4">
                            <div className="flex items-center justify-center gap-3 text-red-500 py-4">
                                <span className="w-5 h-5 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin"></span>
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Still Thinking...</span>
                            </div>

                            <button
                                onClick={onCancelMetadata}
                                className="w-full py-5 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group/back"
                            >
                                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Return to Project
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em]">
                            System ID: GEMINI-2.5-FLASH-CRITICAL
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
