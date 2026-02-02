'use client';

import React from 'react';
import { Project, Script, VisualStyle } from '@/types';
import { ViralShortsManager } from '@/components/shorts/ViralShortsManager';
import { StyleSelector } from './StyleSelector';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

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
    handleUpdateStyle: (style: VisualStyle) => Promise<void>;
    handleSnapshot: (label: string) => Promise<boolean>;
    handleRevert: (snapshotId: string) => Promise<void>;
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
    handleUpdateStyle,
    handleSnapshot,
    handleRevert
}) => {
    return (
        <>
            {/* Director's Suite Drawer Background Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity cursor-pointer"
                    onClick={onClose}
                />
            )}

            {/* Drawer Content */}
            <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-slate-950 border-l border-white/10 shadow-2xl z-[101] transform transition-transform duration-500 ease-out overflow-y-auto no-scrollbar flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <span className="text-2xl">🎛️</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Director&apos;s Suite</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Documentary Control Center</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-10">
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
                                        className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {SUPPORTED_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>
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

                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎨</span>
                            <h3 className="font-bold text-xs uppercase tracking-widest text-purple-400">Aesthetic Styles</h3>
                        </div>
                        <StyleSelector
                            selectedStyle={(project?.visualStyle as VisualStyle) || 'cinematic'}
                            onStyleSelect={(style) => handleUpdateStyle(style)}
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
                                onClick={() => {
                                    const label = prompt('Enter a label for this snapshot (e.g., "Original Cinematic")');
                                    if (label !== null) handleSnapshot(label);
                                }}
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
                                                {new Date(snap.timestamp).toLocaleDateString()} {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Restore to "${snap.label}"?`)) handleRevert(snap.id);
                                            }}
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
                <div className="mt-auto p-6 bg-slate-900/80 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                        <span>Project ID: {project.id.substring(0, 8)}</span>
                        <span>v2.1.0-DIRECTOR</span>
                    </div>
                </div>
            </div>
        </>
    );
};
