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
    initialMetadata: PublishMetadata | null;
    isPublishing: boolean;
    publishProgress?: number;
    publishMessage?: string;
}

export const PublishModal: React.FC<PublishModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialMetadata,
    isPublishing,
    publishProgress,
    publishMessage
}) => {
    const [metadata, setMetadata] = useState<PublishMetadata>(initialMetadata || {
        title: '',
        description: '',
        tags: []
    });
    const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('unlisted');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-[32px] p-8 max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                    <span className="text-2xl">🚀</span>
                    <h2 className="text-2xl font-bold text-white">Publish to YouTube</h2>
                </div>

                <div className="space-y-6 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                    <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Video Title (Gemini Optimized)</label>
                        <input
                            type="text"
                            value={metadata.title}
                            onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                            placeholder="Enter video title..."
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Description</label>
                        <textarea
                            value={metadata.description}
                            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                            rows={6}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                            placeholder="Enter video description..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Privacy Setting</label>
                            <select
                                value={privacy}
                                onChange={(e) => setPrivacy(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                            >
                                <option value="private">Private</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Tags</label>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {metadata.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] border border-slate-700">
                                        {tag}
                                    </span>
                                ))}
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
                        disabled={isPublishing || !metadata.title}
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
                                        style={{ width: `${publishProgress || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <span>Confirm & Publish</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
