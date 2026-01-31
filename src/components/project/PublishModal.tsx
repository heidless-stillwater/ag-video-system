'use client';

import React, { useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface PublishMetadata {
    title: string;
    description: string;
    tags: string[];
}

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (metadata: PublishMetadata, privacy: 'public' | 'unlisted' | 'private') => Promise<void>;
    onCancel: () => Promise<void>;
    onOptimize: () => Promise<void>;
    isOptimizing: boolean;
    initialMetadata: PublishMetadata | null;
    thumbnailUrl?: string;
    isPublishing: boolean;
    publishProgress?: number;
    publishMessage?: string;
    status: string;
    youtubeUrl?: string;
    videoUrl?: string;
}

export const PublishModal: React.FC<PublishModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    onOptimize,
    isOptimizing,
    initialMetadata,
    thumbnailUrl,
    isPublishing,
    publishProgress,
    publishMessage,
    status,
    youtubeUrl,
    videoUrl
}) => {
    const [metadata, setMetadata] = React.useState<PublishMetadata>(initialMetadata || {
        title: '',
        description: '',
        tags: []
    });
    const [privacy, setPrivacy] = React.useState<'public' | 'unlisted' | 'private'>('private');

    // Debug: Log all props when modal opens
    React.useEffect(() => {
        if (isOpen) {
            console.log('[PublishModal] Modal opened with props:', {
                videoUrl,
                thumbnailUrl,
                status,
                youtubeUrl,
                initialMetadata,
                isPublishing,
                publishProgress,
                publishMessage
            });
        }
    }, [isOpen, videoUrl, thumbnailUrl, status, youtubeUrl, initialMetadata, isPublishing, publishProgress, publishMessage]);

    // Ensure progress only increases (monotonic)
    const [displayProgress, setDisplayProgress] = React.useState(0);
    React.useEffect(() => {
        if (publishProgress !== undefined && publishProgress > displayProgress) {
            setDisplayProgress(publishProgress);
        }
        // Reset when starting fresh or finished
        if (!isPublishing && status !== 'publishing' && status !== 'published') {
            setDisplayProgress(0);
        }
    }, [publishProgress, isPublishing, status, displayProgress]);

    // Convert relative proxy URL to absolute URL for video element
    const absoluteVideoUrl = React.useMemo(() => {
        console.log('[PublishModal] Computing absoluteVideoUrl from:', videoUrl);
        if (!videoUrl) {
            console.log('[PublishModal] No videoUrl provided');
            return undefined;
        }
        if (videoUrl.startsWith('http')) {
            console.log('[PublishModal] Using absolute URL as-is:', videoUrl);
            return videoUrl;
        }
        // Convert relative proxy URL to absolute
        const absolute = `${window.location.origin}${videoUrl}`;
        console.log('[PublishModal] Converted to absolute URL:', absolute);
        return absolute;
    }, [videoUrl]);

    // Sync metadata when initialMetadata changes (after optimization)
    React.useEffect(() => {
        if (initialMetadata) {
            setMetadata(initialMetadata);
        }
    }, [initialMetadata]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] overflow-y-auto flex items-center justify-center p-4 py-8">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-[32px] p-8 max-w-3xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{status === 'published' ? '🎉' : '🚀'}</span>
                        <h2 className="text-2xl font-bold text-white">{status === 'published' ? 'Successfully Published!' : 'Publish to YouTube'}</h2>
                    </div>
                    {status !== 'published' && (
                        <button
                            onClick={onOptimize}
                            disabled={isOptimizing || isPublishing}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isOptimizing
                                ? 'bg-purple-500/20 text-purple-400 animate-pulse'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20'
                                }`}
                        >
                            {isOptimizing ? (
                                <>
                                    <span className="w-3 h-3 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></span>
                                    <span>Optimizing...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨ Viral Suite Optimize</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {status === 'published' ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6 py-8">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">Your documentary is now live!</p>
                            <p className="text-slate-400 text-sm mt-1">Video ID: <span className="font-mono text-red-400 uppercase tracking-widest">{youtubeUrl?.split('v=')[1] || 'Unknown'}</span></p>
                        </div>
                        <a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                        >
                            <span>📺 View on YouTube</span>
                        </a>
                    </div>
                ) : (
                    <div className="space-y-6 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                        {/* Video Review Section */}
                        {absoluteVideoUrl && (
                            <div className="space-y-3">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Review Final Movie</label>
                                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative group">
                                    <video
                                        src={absoluteVideoUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                        poster={thumbnailUrl}
                                    />
                                    <div className="absolute top-4 left-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="px-3 py-1.5 bg-red-600/90 text-white text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm">
                                            Master Preview
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Viral Preview */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Cinematic Thumbnail</label>
                                    <div className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative group">
                                        {thumbnailUrl ? (
                                            <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
                                                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">No Thumbnail Generated</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                            <span className="text-[10px] text-white font-bold tracking-widest uppercase">Imagen 3.0 Generative Art</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Optimized Title</label>
                                    <input
                                        type="text"
                                        value={metadata.title}
                                        onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                        disabled={isPublishing}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors disabled:opacity-50"
                                        placeholder="Pick a catchy title..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Viral Tags</label>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {metadata.tags.length > 0 ? metadata.tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] border border-slate-700">
                                                {tag}
                                            </span>
                                        )) : (
                                            <span className="text-[10px] text-slate-600 italic">No tags generated...</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: SEO Metadata */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">SEO Description</label>
                                    <textarea
                                        value={metadata.description}
                                        onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                                        rows={10}
                                        disabled={isPublishing}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-[20px] px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-red-500/50 transition-colors resize-none custom-scrollbar disabled:opacity-50"
                                        placeholder="Gemini will craft a narrative description here..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Privacy Setting</label>
                                    <select
                                        value={privacy}
                                        onChange={(e) => setPrivacy(e.target.value as any)}
                                        disabled={isPublishing}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none disabled:opacity-50"
                                    >
                                        <option value="private">Private</option>
                                        <option value="unlisted">Unlisted</option>
                                        <option value="public">Public</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                <div className="flex gap-4 mt-8 flex-shrink-0">
                    {!isPublishing ? (
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-slate-700"
                        >
                            {status === 'published' ? 'Close' : 'Cancel'}
                        </button>
                    ) : (
                        <button
                            onClick={onCancel}
                            className="flex-1 px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold transition-all border border-orange-500 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Cancel Upload</span>
                        </button>
                    )}
                    {status !== 'published' && (
                        <button
                            onClick={() => onConfirm(metadata, privacy)}
                            disabled={isPublishing || !metadata.title || isOptimizing}
                            className="flex-[2] px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                        >
                            {isPublishing ? (
                                <div className="flex flex-col items-center gap-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        <span>{publishMessage || 'Publishing...'}</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 transition-all duration-500"
                                            style={{ width: `${displayProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <span>🚀 Launch Documentary</span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
