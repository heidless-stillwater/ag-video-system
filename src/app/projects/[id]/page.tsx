'use client';

import React, { useEffect, useState, use } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { projectService } from '@/lib/services/firestore';
import { scriptService } from '@/lib/services/script';
import { videoEngine, Scene } from '@/lib/services/video-engine';
import { VideoPreview } from '@/components/project/VideoPreview';
import { Project, ProjectStatus, Script } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const [project, setProject] = useState<Project | null>(null);
    const [script, setScript] = useState<Script | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResearching, setIsResearching] = useState(false);
    const [isScripting, setIsScripting] = useState(false);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState(false);
    const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [timeline, setTimeline] = useState<Scene[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadProjectAndScript = async () => {
        try {
            const projectData = await projectService.getProject(projectId);
            if (projectData) {
                setProject(projectData);

                // If the project has a script associated, load it
                if (projectData.currentScriptId) {
                    const scriptData = await scriptService.getScript(projectData.currentScriptId);
                    setScript(scriptData);
                }
            } else {
                setError('Project not found');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProjectAndScript();
    }, [projectId]);

    const handleLaunchResearch = async () => {
        if (!project) return;
        setIsResearching(true);
        setError(null);

        try {
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: project.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Research orchestration failed');
            }

            const result = await response.json();

            const updates: Partial<Project> = {
                status: 'researching',
                research: {
                    sources: result.sources,
                    facts: result.facts,
                    outline: [],
                    completionPercentage: 100,
                }
            };

            await projectService.updateProject(project.id, updates);
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Research failed: ' + err.message);
        } finally {
            setIsResearching(false);
        }
    };

    const handleGenerateScript = async () => {
        if (!project) return;
        setIsScripting(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${project.id}/script`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Script generation failed');
            }

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Scripting failed: ' + err.message);
        } finally {
            setIsScripting(false);
        }
    };

    const handleGenerateAudio = async (sectionId: string) => {
        if (!project || !script) return;
        setGeneratingAudioId(sectionId);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${project.id}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: script.id,
                    sectionId,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Audio generation failed');
            }

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Audio failed: ' + err.message);
        } finally {
            setGeneratingAudioId(null);
        }
    };

    const handleGenerateAllAudio = async () => {
        if (!project || !script) return;
        setIsGeneratingAllAudio(true);
        setError(null);

        try {
            // Find all sections that don't have audio yet
            const pendingSections = script.sections.filter(s => !s.audioUrl);

            for (const section of pendingSections) {
                setGeneratingAudioId(section.id);
                const response = await fetch(`/api/projects/${project.id}/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scriptId: script.id,
                        sectionId: section.id,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(`Failed on "${section.title}": ${data.error || 'Unknown error'}`);
                }

                // Refresh script data after each successful generation to update UI
                await loadProjectAndScript();
            }
        } catch (err: any) {
            setError('Batch audio failed: ' + err.message);
        } finally {
            setIsGeneratingAllAudio(false);
            setGeneratingAudioId(null);
        }
    };

    const handleGenerateMedia = async () => {
        if (!project || !script) return;
        setIsGeneratingMedia(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${project.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Media generation failed');
            }

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Media failed: ' + err.message);
        } finally {
            setIsGeneratingMedia(false);
        }
    };

    const handleAssemble = async () => {
        if (!project || !script) return;
        setIsAssembling(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${project.id}/assemble`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Assembly failed');
            }

            // Calculate timeline and open preview
            const calcedTimeline = videoEngine.calculateTimeline(script);
            setTimeline(calcedTimeline);
            setIsPreviewOpen(true);

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Assembly failed: ' + err.message);
        } finally {
            setIsAssembling(false);
        }
    };

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, loading: false });

    const handleDeleteProject = () => {
        setDeleteModal({ isOpen: true, loading: false });
    };

    const confirmDelete = async () => {
        if (!project) return;
        setDeleteModal({ isOpen: true, loading: true });
        try {
            await projectService.deleteProject(project.id);
            router.push('/');
        } catch (err: any) {
            setError('Failed to delete project: ' + err.message);
            setDeleteModal({ isOpen: false, loading: false });
        }
    };

    if (isLoading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500">Loading project...</p>
                </div>
            </ProtectedRoute>
        );
    }

    if (error || !project) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-md">
                        <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
                        <p className="text-red-400 mb-8">{error || 'Project not found'}</p>
                        <Link href="/" className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    const steps = [
        { id: 'research', label: 'Research', status: (project.status === 'researching' || project.status === 'draft') ? 'active' : 'completed' },
        { id: 'script', label: 'Scripting', status: project.status === 'scripting' ? 'active' : (project.status === 'draft' ? 'pending' : 'completed') },
        { id: 'media', label: 'Media', status: project.status === 'generating_media' ? 'active' : 'pending' },
        { id: 'video', label: 'Assembly', status: project.status === 'assembling' ? 'active' : 'pending' },
    ];

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-white">
                {/* Project Header */}
                <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">{project.title}</h1>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="capitalize">{project.status.replace('_', ' ')}</span>
                                    <span>•</span>
                                    <span>{project.estimatedDuration} minutes</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleDeleteProject}
                                className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                            >
                                Delete Project
                            </button>
                            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
                                Settings
                            </button>
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-colors">
                                Export Project
                            </button>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4 overflow-x-auto no-scrollbar">
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
                </div>

                <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Research & Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Status Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-blue-600/10 transition-all duration-700"></div>
                            <h2 className="text-2xl font-bold mb-2">Phase: {project.status.replace('_', ' ').toUpperCase()}</h2>
                            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                            <p className="text-slate-400 mb-8 max-w-lg">
                                {project.status === 'draft' && "Your project is ready to begin. Start the research phase to gather facts and build your documentary outline."}
                                {project.status === 'researching' && "Your research is complete. You can now generate a sleep-optimized script based on the extracted facts."}
                                {project.status === 'scripting' && "Your script has been generated. Review and refine the sections before moving to media generation."}
                                {project.status === 'generating_media' && "Visual assets have been synthesized. Review the gallery below before moving to final video assembly."}
                                {project.status === 'assembling' && "The documentary is assembled. You can preview the finalized cinematic experience now."}
                            </p>

                            <div className="flex gap-4">
                                {project.status === 'draft' && (
                                    <button
                                        onClick={handleLaunchResearch}
                                        disabled={isResearching}
                                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isResearching ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Orchestrating AI Research...</span>
                                            </>
                                        ) : (
                                            <span>🚀 Launch Research Phase</span>
                                        )}
                                    </button>
                                )}

                                {(project.status === 'researching' || (project.status === 'scripting' && !script)) && (
                                    <button
                                        onClick={handleGenerateScript}
                                        disabled={isScripting}
                                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isScripting ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Generating Sleep Script...</span>
                                            </>
                                        ) : (
                                            <span>✍️ Generate Documentary Script</span>
                                        )}
                                    </button>
                                )}

                                {(project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling') && script && (
                                    <button
                                        onClick={handleGenerateMedia}
                                        disabled={isGeneratingMedia}
                                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-3 border border-slate-700"
                                    >
                                        {isGeneratingMedia ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Synthesizing Visual Assets...</span>
                                            </>
                                        ) : (
                                            <span>{(project.status === 'generating_media' || project.status === 'assembling') ? '🔄 Regenerate Visual Assets' : '🖼️ Generate Visual Assets'}</span>
                                        )}
                                    </button>
                                )}

                                {(project.status === 'generating_media' || project.status === 'assembling') && script && (
                                    <button
                                        onClick={handleAssemble}
                                        disabled={isAssembling}
                                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isAssembling ? (
                                            <>
                                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Baking Documentary...</span>
                                            </>
                                        ) : (
                                            <span>🎬 {project.status === 'assembling' ? 'Preview Documentary' : 'Assemble & Preview'}</span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Script Sections (Visible if status is scripting or generating_media) */}
                        {(project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling') && script && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <span className="text-purple-400">📝</span> Documentary Script Sections
                                    </h3>
                                    {script.sections.some(s => !s.audioUrl) && (
                                        <button
                                            onClick={handleGenerateAllAudio}
                                            disabled={isGeneratingAllAudio}
                                            className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isGeneratingAllAudio ? (
                                                <>
                                                    <span className="w-3 h-3 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></span>
                                                    <span>Generating All...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>🎙️ Generate All Audio</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {script.sections.map((section, idx) => (
                                        <div key={section.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-200">
                                                        Section {idx + 1}: {section.title}
                                                    </h4>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                                        <span>{section.wordCount} words</span>
                                                        <span>{Math.floor(section.estimatedDuration / 60)}m {section.estimatedDuration % 60}s</span>
                                                    </div>
                                                </div>

                                                {section.audioUrl ? (
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-400/10 px-2 py-0.5 rounded">Audio Ready</span>
                                                        <audio
                                                            src={section.audioUrl}
                                                            controls
                                                            className="h-8 max-w-[200px] opacity-80 hover:opacity-100 transition-opacity"
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleGenerateAudio(section.id)}
                                                        disabled={generatingAudioId === section.id}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
                                                    >
                                                        {generatingAudioId === section.id ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                                <span>Generating...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>🎙️ Generate Audio</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap mb-6">
                                                {section.content}
                                            </p>

                                            {/* Visual Cues Gallery */}
                                            {section.visualCues && section.visualCues.length > 0 && (
                                                <div className="space-y-4">
                                                    <h5 className="text-[10px] font-bold text-teal-500 uppercase tracking-widest px-1">Visual Assets</h5>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {section.visualCues.map((cue) => (
                                                            <div key={cue.id} className="relative aspect-video rounded-xl overflow-hidden bg-slate-800 border border-slate-700 group/cue">
                                                                {cue.url ? (
                                                                    <>
                                                                        <img
                                                                            src={cue.url}
                                                                            alt={cue.description}
                                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/cue:scale-110"
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover/cue:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                                <span className="text-[7px] font-bold uppercase tracking-widest px-1 py-0.5 bg-blue-500/30 text-blue-200 rounded border border-blue-500/20">
                                                                                    {cue.transitionType || 'fade'}
                                                                                </span>
                                                                                <span className="text-[7px] text-slate-400">{cue.transitionDuration || 1200}ms</span>
                                                                            </div>
                                                                            <p className="text-[8px] text-slate-200 line-clamp-2 leading-tight">{cue.description}</p>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                                                        <div className={`w-2 h-2 rounded-full mb-2 ${cue.status === 'generating' ? 'bg-teal-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                                                        <p className="text-[8px] text-slate-500 font-medium leading-tight">{cue.description.substring(0, 30)}...</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Research Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Information Sources</h3>
                                {project.research.sources.length > 0 ? (
                                    <div className="space-y-3">
                                        {project.research.sources.map(source => (
                                            <a key={source.id} href={source.url} target="_blank" className="block p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/30 group">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-200 truncate">{source.title}</span>
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">Wiki</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 truncate">{source.url}</p>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-slate-600 text-sm">No sources added yet.</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Extracted Facts</h3>
                                {project.research.facts.length > 0 ? (
                                    <div className="space-y-3">
                                        {project.research.facts.map((fact, i) => (
                                            <div key={i} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 leading-snug">
                                                <p className="text-sm text-slate-300 italic">"{fact.statement}"</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-slate-600 text-sm">No facts extracted yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Project Sidebar */}
                    <div className="space-y-6">
                        {script && (
                            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-2xl p-6">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span className="text-purple-400">📊</span> Script Stats
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total Words</span>
                                        <span className="text-white font-bold">{script.totalWordCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Actual Duration</span>
                                        <span className="text-white font-bold">{script.estimatedDuration}m</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Sleep Score</span>
                                        <span className="text-green-400 font-bold">{script.sleepFriendlinessScore}/100</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-4">Sleep Optimizer</h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Pacing</span>
                                    <span className="text-xs text-indigo-400 font-bold">130 WPM</span>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Voice</span>
                                    <span className="text-xs text-indigo-400 font-bold">Low/Calm</span>
                                </div>
                                <p className="text-[10px] text-slate-500 text-center uppercase tracking-tighter">Guidelines optimally applied for sleep</p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Cinematic Preview Overlay */}
                {isPreviewOpen && timeline.length > 0 && (
                    <VideoPreview
                        scenes={timeline}
                        onClose={() => setIsPreviewOpen(false)}
                    />
                )}

                {project && (
                    <ConfirmModal
                        isOpen={deleteModal.isOpen}
                        title="Delete Project"
                        message={`Are you sure you want to delete "${project.title}"? This action is permanent and cannot be undone.`}
                        confirmLabel="Delete Project"
                        isDestructive={true}
                        isLoading={deleteModal.loading}
                        onConfirm={confirmDelete}
                        onClose={() => setDeleteModal({ isOpen: false, loading: false })}
                    />
                )}
            </div>
        </ProtectedRoute>
    );
}
