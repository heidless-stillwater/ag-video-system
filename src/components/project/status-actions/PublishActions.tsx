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
    publishDisplayProgress
}) => {
    if (!project.downloadUrl) return null;

    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                    disabled={isDownloading}
                    className={`px-8 py-6 bg-slate-800 hover:bg-slate-700 border border-white/5 disabled:opacity-50 text-white rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-2 group ${isDownloading ? 'animate-pulse' : ''}`}
                >
                    {isDownloading ? (
                        <>
                            <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            <span className="text-sm uppercase tracking-widest text-slate-400">Downloading...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span className="text-sm font-bold">Download MP4 File</span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Save to Device</span>
                        </>
                    )}
                </button>

                <div className="relative group">
                    {/* YouTube Publish Button or Connect Button */}
                    {youtubeChannelStatus?.isConnected ? (
                        <button
                            onClick={onOpenPublishModal}
                            disabled={isConnectingYouTube || (project.status === 'publishing') || isGeneratingMetadata}
                            className="w-full h-full px-8 py-6 bg-[#FF0000] hover:bg-[#E60000] disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3">
                                <span className="flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                </span>
                            </div>

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
                                <>
                                    <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    <span className="text-sm uppercase tracking-widest text-white/80">Generating Metadata...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform mb-1" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                    </svg>
                                    <span className="text-sm font-bold">Publish to YouTube</span>
                                    <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold flex items-center gap-1">
                                        <img src={youtubeChannelStatus.channelThumb} className="w-4 h-4 rounded-full border border-white/20" alt="" />
                                        {youtubeChannelStatus.channelTitle}
                                    </span>
                                </>
                            )}
                        </button>
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
            {youtubeChannelStatus?.isConnected && (
                <div className="flex justify-center">
                    <button
                        onClick={onDisconnectYouTube}
                        className="text-[10px] text-slate-500 hover:text-red-400 underline decoration-slate-700 hover:decoration-red-400 transition-all font-mono"
                    >
                        Disconnect {youtubeChannelStatus.channelTitle}
                    </button>
                </div>
            )}
        </div>
    );
};
