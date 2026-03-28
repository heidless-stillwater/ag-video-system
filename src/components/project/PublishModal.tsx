'use client';

import React, { useState } from 'react';

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
    onOptimize: (metadata: PublishMetadata) => Promise<void>;
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
    const [privacy, setPrivacy] = React.useState<'public' | 'unlisted' | 'private'>('unlisted');

    // Ensure progress only increases (monotonic)
    const [displayProgress, setDisplayProgress] = React.useState(0);
    React.useEffect(() => {
        if (publishProgress !== undefined && publishProgress > displayProgress) {
            setDisplayProgress(publishProgress);
        }
        if (!isPublishing && status !== 'publishing' && status !== 'published') {
            setDisplayProgress(0);
        }
    }, [publishProgress, isPublishing, status]);

    // Convert relative proxy URL to absolute URL for video element
    const absoluteVideoUrl = React.useMemo(() => {
        if (!videoUrl) return undefined;
        if (videoUrl.startsWith('http')) return videoUrl;
        return `${window.location.origin}${videoUrl}`;
    }, [videoUrl]);

    // Sync metadata when initialMetadata changes (after optimization)
    React.useEffect(() => {
        if (initialMetadata) {
            setMetadata(initialMetadata);
        }
    }, [initialMetadata]);

    if (!isOpen) return null;

    const isActivelyPublishing = isPublishing || status === 'publishing';

    return (
        <div className="fixed inset-0 z-[110] overflow-y-auto flex items-center justify-center p-4 py-8">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={isActivelyPublishing ? undefined : onClose}></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-[32px] p-8 max-w-3xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">
                            {status === 'published' ? '🎉' : isActivelyPublishing ? '📡' : '🚀'}
                        </span>
                        <h2 className="text-2xl font-bold text-white">
                            {status === 'published' ? 'Successfully Published!' : isActivelyPublishing ? 'Uploading to YouTube...' : 'Publish to YouTube'}
                        </h2>
                    </div>
                    {status !== 'published' && !isActivelyPublishing && (
                        <button
                            onClick={() => onOptimize(metadata)}
                            disabled={isOptimizing}
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
                                <span>✨ Viral Suite Optimize</span>
                            )}
                        </button>
                    )}
                </div>

                {/* ── PUBLISHING PROGRESS VIEW ── */}
                {isActivelyPublishing && status !== 'published' && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 py-8">
                        {/* Animated YouTube icon */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-red-600/20 border-2 border-red-500/30 flex items-center justify-center animate-pulse">
                                <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </div>
                            {/* Orbiting dots */}
                            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                                <div className="absolute -top-1 left-1/2 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2"></div>
                            </div>
                        </div>

                        {/* Progress percentage */}
                        <div>
                            <div className="text-6xl font-black text-white tabular-nums mb-2">
                                {displayProgress}%
                            </div>
                            <p className="text-slate-400 text-sm">
                                {publishMessage || 'Preparing your video...'}
                            </p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full max-w-md">
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                <div
                                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                                    style={{ width: `${Math.max(displayProgress, 3)}%` }}
                                >
                                    {/* Shimmer */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]"></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                                <span>0%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Stage badges */}
                        <div className="flex items-center gap-3 flex-wrap justify-center">
                            {[
                                { label: 'Authenticate', done: displayProgress >= 5 },
                                { label: 'Upload Video', done: displayProgress >= 95 },
                                { label: 'Upload Thumbnail', done: displayProgress >= 98 },
                                { label: 'Finalise', done: displayProgress >= 100 },
                            ].map((step) => (
                                <div
                                    key={step.label}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        step.done
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-slate-800 text-slate-600 border border-slate-700'
                                    }`}
                                >
                                    {step.done ? (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse"></div>
                                    )}
                                    {step.label}
                                </div>
                            ))}
                        </div>

                        {/* Cancel button */}
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 rounded-xl font-bold transition-all text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel Upload
                        </button>
                    </div>
                )}

                {/* ── SUCCESS VIEW ── */}
                {status === 'published' && (
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
                        <div className="flex gap-4">
                            <a
                                href={youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                            >
                                <span>📺 View on YouTube</span>
                            </a>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* ── FORM VIEW ── */}
                {!isActivelyPublishing && status !== 'published' && (
                    <>
                        <div className="space-y-6 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                            {/* Video Review Section */}
                            <div className="space-y-3">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Review Final Movie</label>
                                {absoluteVideoUrl ? (
                                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative group">
                                        <video
                                            key={absoluteVideoUrl}
                                            src={absoluteVideoUrl}
                                            controls
                                            preload="auto"
                                            className="w-full h-full object-contain"
                                            poster={thumbnailUrl}
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-slate-950 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
                                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-500">Video render not found</p>
                                            <p className="text-[10px] text-slate-600 max-w-[200px]">You can still prepare metadata, but rendering first is recommended.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Optimized Title</label>
                                        <input
                                            type="text"
                                            value={metadata.title}
                                            onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                            placeholder="Pick a catchy title..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Viral Tags</label>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {metadata.tags.length > 0 ? metadata.tags.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] border border-slate-700">{tag}</span>
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
                                            className="w-full bg-slate-950 border border-slate-800 rounded-[20px] px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-red-500/50 transition-colors resize-none custom-scrollbar"
                                            placeholder="Gemini will craft a narrative description here..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Privacy Setting</label>
                                        <select
                                            value={privacy}
                                            onChange={(e) => setPrivacy(e.target.value as any)}
                                            className="w-full bg-[#161b22] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors appearance-none"
                                        >
                                            <option value="private" className="bg-[#0d1117] text-white">Private</option>
                                            <option value="unlisted" className="bg-[#0d1117] text-white">Unlisted</option>
                                            <option value="public" className="bg-[#0d1117] text-white">Public</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8 flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onConfirm(metadata, privacy)}
                                disabled={!metadata.title || isOptimizing}
                                className="flex-[2] px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                            >
                                <span>🚀 Launch Documentary</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

