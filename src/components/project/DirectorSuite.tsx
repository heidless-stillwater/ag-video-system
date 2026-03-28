'use client';

import React, { useState } from 'react';
import { Project, Script } from '@/types';
import { ViralShortsManager } from '@/components/shorts/ViralShortsManager';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface DirectorSuiteProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    projectId: string;
    script: Script | null;
    selectedDubLanguage: string;
    setSelectedDubLanguage: (lang: string) => void;
    isDubbing: boolean;
    dubbingProgress: Record<string, number>;
    availableTranslations: { language: string; scriptId: string }[];
    initiateDubbing: (lang: string) => void;
    handleCancelDubbing: () => Promise<void>;
    handleGenerateShortsCandidates: () => Promise<void>;
    handleRenderShort: (candidateId: string) => Promise<void>;
    isGeneratingShortsCandidates: boolean;
    handleSnapshot: (label: string) => Promise<boolean>;
    handleRevert: (snapshotId: string) => Promise<void>;
    isModal?: boolean;
    onToggleModal?: () => void;
}

export const DirectorSuite: React.FC<DirectorSuiteProps> = ({
    isOpen,
    onClose,
    project,
    projectId,
    script,
    selectedDubLanguage,
    setSelectedDubLanguage,
    isDubbing,
    dubbingProgress,
    availableTranslations,
    initiateDubbing,
    handleCancelDubbing,
    handleGenerateShortsCandidates,
    handleRenderShort,
    isGeneratingShortsCandidates,
    handleSnapshot,
    handleRevert,
    isModal = false,
    onToggleModal
}) => {
    // Modal States
    const [revertSnapshotId, setRevertSnapshotId] = useState<string | null>(null);
    const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [snapshotLabel, setSnapshotLabel] = useState('');

    const handleRevertClick = (snapshotId: string, label: string) => {
        setRevertSnapshotId(snapshotId);
        setIsRevertModalOpen(true);
    };

    const confirmRevert = () => {
        if (revertSnapshotId) {
            handleRevert(revertSnapshotId);
            setIsRevertModalOpen(false);
            setRevertSnapshotId(null);
        }
    };

    const handleSnapshotClick = () => {
        setSnapshotLabel('');
        setIsSnapshotModalOpen(true);
    };

    const confirmSnapshot = async () => {
        if (snapshotLabel.trim()) {
            const success = await handleSnapshot(snapshotLabel.trim());
            if (success) {
                setIsSnapshotModalOpen(false);
                setSnapshotLabel('');
            }
        }
    };
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity cursor-pointer transition-all duration-300"
                    onClick={onClose}
                />
            )}

            {/* Drawer/Modal Content */}
            <div 
                className={`
                    fixed bg-slate-950 border-white/10 shadow-2xl z-[101] transform transition-all duration-500 ease-out flex flex-col
                    ${isModal 
                        ? `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl h-[90vh] rounded-3xl border ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`
                        : `inset-y-0 right-0 w-full sm:w-[500px] border-l ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
                    }
                `}
            >
                {/* Header */}
                <div className={`p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between shrink-0 ${isModal ? 'rounded-t-3xl' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <span className="text-2xl">🎛️</span>
                        </div>
                        <div>
                            <h2 className={`font-bold text-white ${isModal ? 'text-xl' : 'text-lg'}`}>Director&apos;s Suite</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Documentary Control Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onToggleModal && (
                            <button
                                onClick={onToggleModal}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
                                title={isModal ? "Switch to Sidebar" : "Expand to Modal"}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
                    {/* 1. GLOBAL LAUNCHPAD (DUBBING) */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🌍</span>
                            <h3 className="font-bold text-xs uppercase tracking-widest text-indigo-400">Global Launchpad</h3>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-5 shadow-inner">
                            <p className="text-xs text-indigo-200/60 mb-4 leading-relaxed">Expand your reach by dubbing into new languages with AI precision.</p>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">Target Language</label>
                                    <select
                                        value={selectedDubLanguage}
                                        onChange={(e) => setSelectedDubLanguage(e.target.value)}
                                        className="w-full bg-[#161b22] border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {SUPPORTED_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code} className="bg-[#0d1117] text-white">
                                                {lang.name} {availableTranslations.some(t => t.language === lang.code) ? '✓' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => initiateDubbing(selectedDubLanguage)}
                                    disabled={isDubbing || (!!dubbingProgress[selectedDubLanguage]) || !project.currentScriptId}
                                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg justify-center ${availableTranslations.some(t => t.language === selectedDubLanguage)
                                        ? 'bg-amber-600/20 hover:bg-amber-600/40 text-amber-200 border border-amber-500/30 shadow-amber-900/10'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                        }`}
                                >
                                    {isDubbing ? (
                                        <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span className="ml-2">Starting...</span></>
                                    ) : dubbingProgress[selectedDubLanguage] !== undefined ? (
                                        <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span className="ml-2">Dubbing {dubbingProgress[selectedDubLanguage]}%...</span></>
                                    ) : (
                                        <>
                                            <span className="text-lg">{availableTranslations.some(t => t.language === selectedDubLanguage) ? '🔄' : '🚀'}</span>
                                            <span className="ml-2">{availableTranslations.some(t => t.language === selectedDubLanguage) ? 'Redub' : 'Launch Dub'}</span>
                                        </>
                                    )}
                                </button>

                                {(isDubbing || dubbingProgress[selectedDubLanguage] !== undefined) && (
                                    <button
                                        onClick={handleCancelDubbing}
                                        className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg border border-red-500/20 text-xs font-bold uppercase tracking-widest"
                                    >
                                        Stop active session
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 1.5. VIRAL SHORTS ENGINE */}
                    <section className="space-y-4">
                        <ViralShortsManager
                            projectId={projectId}
                            scriptId={script?.id || ''}
                            shorts={project?.shorts || []}
                            onGenerateCandidates={handleGenerateShortsCandidates}
                            onRenderShort={handleRenderShort}
                            isGenerating={isGeneratingShortsCandidates}
                        />
                    </section>


                    {/* 3. VISUAL VERSION HISTORY */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">⏳</span>
                                <h3 className="font-bold text-xs uppercase tracking-widest text-amber-400">Visual Timeline</h3>
                            </div>
                            <button
                                 onClick={handleSnapshotClick}
                                 className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-amber-500"
                                 title="Create Snapshot"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2">
                            {(!project?.visualSnapshots || project.visualSnapshots.length === 0) ? (
                                <div className="py-8 text-center border border-dashed border-white/5 rounded-xl text-slate-500 text-[10px] uppercase tracking-widest">
                                    No versions saved.
                                </div>
                            ) : (
                                [...project.visualSnapshots].reverse().slice(0, 5).map((snap) => (
                                    <div
                                        key={snap.id}
                                        className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-bold text-white truncate max-w-[120px]">{snap.label}</span>
                                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[7px] text-slate-400 font-bold uppercase">{snap.style}</span>
                                            </div>
                                            <p className="text-[8px] text-slate-600">
                                                {snap.timestamp ? (
                                                    <>
                                                        {new Date(snap.timestamp).toLocaleDateString()} {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </>
                                                ) : 'No date'}
                                            </p>
                                        </div>
                                         <button
                                             onClick={() => handleRevertClick(snap.id, snap.label)}
                                             className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
                                         >
                                            Restore
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-900/80 border-t border-white/5 text-center shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                        <span>Project ID: {project.id.substring(0, 8)}</span>
                        <span>v2.1.0-DIRECTOR</span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>

            {/* Modals */}
            <ConfirmModal
                isOpen={isSnapshotModalOpen}
                onClose={() => setIsSnapshotModalOpen(false)}
                onConfirm={confirmSnapshot}
                title="Create Visual Snapshot"
                message="Save the current visual state (style, colors, and scene compositions) so you can return to it later."
                confirmLabel="Save Snapshot"
            >
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Snapshot Label</label>
                    <input
                        type="text"
                        value={snapshotLabel}
                        onChange={(e) => setSnapshotLabel(e.target.value)}
                        placeholder="e.g., Original Cinematic"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmSnapshot();
                        }}
                    />
                </div>
            </ConfirmModal>

            <ConfirmModal
                isOpen={isRevertModalOpen}
                onClose={() => setIsRevertModalOpen(false)}
                onConfirm={confirmRevert}
                title="Restore Version"
                message="Are you sure you want to restore this version? Your current visual settings will be overwritten by this snapshot."
                confirmLabel="Restore"
                isDestructive={false}
            />
        </>
    );
};
