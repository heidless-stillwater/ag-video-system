'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { projectService } from '@/lib/services/firestore';
import { scriptService } from '@/lib/services/script';
import { videoEngine, Scene } from '@/lib/services/video-engine';
import { VideoPreview } from '@/components/project/VideoPreview';
import { MP4Player } from '@/components/project/MP4Player';
import { Project, ProjectStatus, Script, User, SavedRender, VisualStyle, VisualCue } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineConfirmButton } from '@/components/ui/InlineConfirmButton';
import { useEnvironmentContext } from '@/lib/contexts/EnvironmentContext';
import { AMBIENT_TRACKS, audioService, AMBIANCE_LAYERS, SOUND_EFFECTS } from '@/lib/services/audio';
import { TimelineEditor } from '@/components/project/TimelineEditor';
import { userService } from '@/lib/services/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { PublishModal } from '@/components/project/PublishModal';
import { fetchUsageLogs } from '@/app/actions/analytics';
import { UsageLog, ViralClip } from '@/types';
import { MOCK_USER } from '@/lib/auth/mockUser';
import { ProjectSettings } from '@/components/project/ProjectSettings';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectStatusCard } from '@/components/project/ProjectStatusCard';
import { ResearchDashboard } from '@/components/project/ResearchDashboard';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { CostEstimateCard, RenderConfirmModal } from '@/components/project/CostEstimateCard';
import { calculateProjectBudget, ProjectBudget } from '@/lib/services/analytics';
import { estimateCost, CostEstimate } from '@/lib/config/environment';
import { useYouTubeLogic } from '@/lib/hooks/useYouTubeLogic';
import { useMediaActions } from '@/lib/hooks/useMediaActions';
import { useContentCreation } from '@/lib/hooks/useContentCreation';
import { DirectorSuite } from '@/components/project/DirectorSuite';
import { MediaPalette } from '@/components/project/MediaPalette';
import { useProjectSync } from '@/lib/hooks/useProjectSync';
import { ResearchOverlay } from '@/components/research/ResearchOverlay';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { Microscope, X, Sparkles } from 'lucide-react';
import { SynthesisOverlay } from '@/components/project/SynthesisOverlay';
import { MasteringModal } from '@/components/project/mastering/MasteringModal';
import { useSectionAudio } from '@/lib/hooks/useSectionAudio';
import { ScriptConfigurationModal } from '@/components/script/ScriptConfigurationModal';
import { VisualIdentityModal, VisualIdentityConfiguration } from '@/components/media/VisualIdentityModal';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { mode: envMode, config: envConfig } = useEnvironmentContext();
    const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'settings'>('overview');
    const [isSavingTimeline, setIsSavingTimeline] = useState(false);
    const { user: currentUser, loading: authLoading, authFetch } = useAuth();
    const [timeline, setTimeline] = useState<Scene[]>([]);
    const [isInlinePreviewActive, setIsInlinePreviewActive] = useState(false);
    const [previewStartTime, setPreviewStartTime] = useState(0);
    const [activeViewType, setActiveViewType] = useState<'preview' | 'mp4'>('preview');
    const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
    const handleOpenPreview = (time?: number) => {
        setPreviewStartTime(time || 0);
        setIsInlinePreviewActive(true);
    };

    const [stepConfirm, setStepConfirm] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmLabel?: string;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const [infoModal, setInfoModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });

    const [dubConfirmModal, setDubConfirmModal] = useState<{
        isOpen: boolean;
        languageCode: string;
        languageName: string;
        isRegen: boolean;
    }>({
        isOpen: false,
        languageCode: '',
        languageName: '',
        isRegen: false,
    });

    const [selectedDubLanguage, setSelectedDubLanguage] = useState<string>('es-ES');
    const [youtubeChannelStatus, setYoutubeChannelStatus] = useState<{
        connected: boolean;
        canUploadThumbnails: boolean;
        reason?: string;
    } | null>(null);

    const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingVolumeUpdatesRef = useRef<Record<string, any>>({});
    const [isDirectorDrawerOpen, setIsDirectorDrawerOpen] = useState(false);
    const [showCostConfirm, setShowCostConfirm] = useState(false);
    const [pendingCostEstimate, setPendingCostEstimate] = useState<CostEstimate | null>(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, loading: false });
    const [mediaRegenerateModal, setMediaRegenerateModal] = useState({ isOpen: false, loading: false });
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isDirectorSuiteModal, setIsDirectorSuiteModal] = useState(false);
    const [showMasteringModal, setShowMasteringModal] = useState(false);
    const [showSynthesisOverlay, setShowSynthesisOverlay] = useState(true);
    const handleOpenPublishModalRef = useRef(() => { });

    // --- Hooks ---
    const {
        project,
        setProject,
        script,
        setScript,
        isLoading,
        error,
        setError,
        availableTranslations,
        projectCost,
        projectedTotal,
        costLogs,
        dubbingProgress,
        setDubbingProgress,
        loadProjectAndScript
    } = useProjectSync({
        projectId,
        currentUser,
        authLoading,
        isPublishModalOpen,
        handleOpenPublishModal: () => handleOpenPublishModalRef.current()
    });

    const { playingId, isPaused, progress, playPause, stop, rewind } = useSectionAudio();

    const {
        isConnectingYouTube,
        isGeneratingMetadata,
        publishMetadata,
        isPublishing,
        isOptimizing,
        publishDisplayProgress,
        handleConnectYouTube,
        handleDisconnectYouTube,
        handleOpenPublishModal,
        handleConfirmPublish,
        handleCancelPublish,
        handleCancelMetadata,
        handleOptimizeViral
    } = useYouTubeLogic({
        project,
        script,
        projectId,
        currentUser,
        loadProjectAndScript: (preserve?: boolean) => loadProjectAndScript(preserve),
        setError,
        isPublishModalOpen,
        setIsPublishModalOpen,
        envMode
    });

    // Sync the ref for useProjectSync
    handleOpenPublishModalRef.current = handleOpenPublishModal;

    const {
        isGeneratingMedia,
        isAssembling,
        isRendering,
        isDownloading,
        handleGenerateMedia,
        handleCancelMedia,
        handleAssemble,
        handleDownloadMP4,
        handleKillRender,
        handleSnapshotAndReset,
        handleResetToAssembling,
        handleRevertToReady,
        handleSkipToAssembly,
        handleLoadSavedRender,
        executeRender,
        handleUpdateProject,
        handleUpdateStyle,
        handleSnapshot,
        handleRevert,
        handleRevertToScripting,
        isUpdatingProject
    } = useMediaActions({
        project,
        script,
        loadProjectAndScript: (preserve?: boolean) => loadProjectAndScript(preserve),
        setError,
        setProject
    });

    const {
        isResearching,
        isScripting,
        isSoundDesigning,
        generatingAudioId,
        isGeneratingAllAudio,
        handleLaunchResearch,
        handleGenerateScript,
        handleGenerateSoundDesign,
        handleGenerateAudio,
        handleGenerateAllAudio,
        onRegenerateAll,
        handleMusicSelect,
        handleAmbianceSelect,
        handleCancelResearch,
        handleVolumeChange,
        handleSubtitleToggle,
        handleSubtitleStyleChange,
        handleUpdateVoiceProfile,
        onUpdateVoiceProfile,
        onUpdateTTSEngine,
        isGenerating,
        isGeneratingShortsCandidates,
        handleGenerateShortsCandidates,
        handleRenderShort,
        isDubbing,
        setIsDubbing,
        confirmDubbing,
        handleCancelDubbing,
        researchLogs,
        researchPersona,
        setResearchPersona
    } = useContentCreation({
        project,
        script,
        loadProjectAndScript,
        setError
    });

    const [showResearchOverlay, setShowResearchOverlay] = useState(false);
    const [showScriptConfigModal, setShowScriptConfigModal] = useState(false);
    const [showVisualIdentityModal, setShowVisualIdentityModal] = useState(false);

    // --- Side Effects & Automation ---

    // Poll for YouTube status
    useEffect(() => {
        if (currentUser?.settings.youtubeConnected && projectId) {
            fetch(`/api/projects/${projectId}/youtube/status`)
                .then(res => res.json())
                .then(data => setYoutubeChannelStatus(data))
                .catch(err => console.warn('Could not fetch YouTube status:', err));
        }
    }, [projectId, currentUser?.settings.youtubeConnected]);

    // Recalculate timeline whenever script changes
    useEffect(() => {
        if (script) {
            const calcedTimeline = videoEngine.calculateTimeline(script);
            setTimeline(calcedTimeline);
        }
    }, [script]);

    // Update active view when project transitions
    useEffect(() => {
        if (project?.downloadUrl && !['rendering', 'generating_media', 'publishing'].includes(project.status)) {
            setActiveViewType('mp4');
        }
    }, [project?.status, project?.downloadUrl]);

    const [showVictory, setShowVictory] = useState(false);

    // Handle completion of major phases: Auto-switch view modes
    const prevStatusRef = useRef<ProjectStatus | undefined>(project?.status);
    useEffect(() => {
        // 0. Scripting -> Complete (Go to Timeline)
        if (prevStatusRef.current === 'scripting' && project?.status !== 'scripting' && script) {
            setViewMode('timeline');
            setShowScriptConfigModal(false);
        }

        // 1. Media Generation -> Assembly (Go to Timeline)
        if (prevStatusRef.current === 'generating_media' && project?.status === 'assembling') {
            setViewMode('timeline');
            setShowVisualIdentityModal(false);
        }
        // 2. Rendering -> Ready (Trigger Celebration & Go to Overview + Auto-Publish)
        if (prevStatusRef.current === 'rendering' && project?.status === 'ready') {
            setShowVictory(true);
            
            // Auto-trigger publish modal
            if (!isPublishModalOpen) {
                console.log('[Page] Auto-triggering publish modal on render completion');
                handleOpenPublishModal();
            }

            setTimeout(() => {
                setShowVictory(false);
                setViewMode('overview');
            }, 3000);
        }

        // 3. Remote check: If status becomes 'publishing' and modal isn't open
        if (prevStatusRef.current !== 'publishing' && project?.status === 'publishing' && !isPublishModalOpen) {
            handleOpenPublishModal();
        }

        prevStatusRef.current = project?.status;
    }, [project?.status, isPublishModalOpen, handleOpenPublishModal]);

    const interceptAction = (action: () => void, title: string, message: string) => {
        if (envMode !== 'DEV') {
            setStepConfirm({
                isOpen: true,
                title,
                message,
                onConfirm: action
            });
        } else {
            action();
        }
    };



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

    const handleGenerateMediaClick = () => {
        if (!project || !script) return;

        // Check if visual assets already exist
        const hasExistingAssets = script.sections.some((section: any) =>
            section.visualCues && section.visualCues.length > 0 &&
            section.visualCues.some((cue: any) => cue.url)
        );

        if (hasExistingAssets) {
            // Show confirmation modal
            setMediaRegenerateModal({ isOpen: true, loading: false });
        } else {
            // Show configuration modal instead of direct generation
            setShowVisualIdentityModal(true);
        }
    };

    const confirmMediaRegenerate = async () => {
        setMediaRegenerateModal({ isOpen: false, loading: false });
        setShowVisualIdentityModal(true);
    };

    const handleSaveTimeline = async (updatedScript: Script) => {
        setIsSavingTimeline(true);
        setError(null);
        try {
            await scriptService.updateScript(updatedScript.id, {
                sections: updatedScript.sections
            });
            setScript(updatedScript);
        } catch (err: any) {
            setError('Failed to save timeline: ' + err.message);
        } finally {
            setIsSavingTimeline(false);
        }
    };

    const handleRegenerateCueImage = async (sectionId: string, cueId: string, prompt: string) => {
        if (!project || !script) return;
        interceptAction(async () => {
            try {
                const response = await fetch(`/api/projects/${project.id}/media/regenerate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scriptId: script.id,
                        sectionId,
                        cueId,
                        prompt
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Regeneration failed');
                }

                const data = await response.json();

                // Update local script state with the new URL returned from API
                const updatedSections = script.sections.map(s => {
                    if (s.id === sectionId && s.visualCues) {
                        return {
                            ...s,
                            visualCues: s.visualCues.map(c =>
                                c.id === cueId ? { ...c, url: data.url, status: 'ready' as const } : c
                            )
                        };
                    }
                    return s;
                });

                const updatedScript = { ...script, sections: updatedSections };
                setScript(updatedScript);
            } catch (err: any) {
                setError('Regeneration failed: ' + err.message);
            }
        }, 'Regenerate Scene Image?', 'This will consume Imagen 3.0 quota to generate a new custom image for this specific scene.');
    };

    const handleArchiveCueImage = async (sectionId: string, cue: VisualCue) => {
        if (!project || !script || !cue.url) return;
        
        try {
            const res = await authFetch(`/api/prompttool/archive`, {
                method: 'POST',
                body: JSON.stringify({
                    imageUrl: cue.url,
                    prompt: cue.description,
                    settings: {
                        aspectRatio: project.aspectRatio || '16:9',
                        style: project.visualStyle || 'cinematic'
                    },
                    targetSetId: `VideoSystem-${project.id}`,
                    targetSetName: project.title,
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                console.error('[Archive Image] Failed:', data.error);
                setError('Failed to sync to library: ' + data.error);
            } else {
                console.log('[Archive Image] Success:', data.data);
                // SUCCESS feedback handled by VisualCueEditor local state
            }
        } catch (err: any) {
            console.error('[Archive Image] Error:', err);
            setError('Syncing error: ' + err.message);
        }
    };

    const handleRender = async () => {
        if (!project || !script) return;

        const charCount = script.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 0;
        const duration = project.estimatedDuration || 5;
        const estimate = estimateCost(charCount, duration, envMode);
        setPendingCostEstimate(estimate);
        setShowCostConfirm(true);
    };

    const handleCancelDubbingClick = async () => {
        interceptAction(
            handleCancelDubbing,
            'Cancel Dubbing?',
            'This will stop the current translation process. Any progress made will be lost.'
        );
    };

    const initiateDubbing = (languageCode: string) => {
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.name || languageCode;
        const isRegen = availableTranslations.some(t => t.language === languageCode);
        setDubConfirmModal({
            isOpen: true,
            languageCode,
            languageName: langName,
            isRegen
        });
    };








    if (isLoading || isSwitchingLanguage) {
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

    const steps: { id: string; label: string; status: 'active' | 'completed' | 'pending' }[] = [
        { id: 'research', label: 'Research', status: (project.status === 'researching' || project.status === 'draft') ? 'active' : 'completed' },
        { id: 'script', label: 'Scripting', status: project.status === 'scripting' ? 'active' : (['draft', 'researching'].includes(project.status) ? 'pending' : 'completed') },
        { id: 'media', label: 'Media', status: project.status === 'generating_media' ? 'active' : (['draft', 'researching', 'scripting'].includes(project.status) ? 'pending' : 'completed') },
        { id: 'video', label: 'Assembly', status: project.status === 'assembling' || project.status === 'rendering' ? 'active' : (['ready', 'review', 'publishing', 'published'].includes(project.status) ? 'completed' : 'pending') },
        { id: 'publish', label: 'Publishing', status: project.status === 'published' ? 'completed' : (['ready', 'review', 'publishing'].includes(project.status) || !!project.downloadUrl) ? 'active' : 'pending' },
    ];

    const handleStepClick = (stepId: string) => {
        // Close any active overlays when navigating via steps
        setIsInlinePreviewActive(false);
        setIsDirectorDrawerOpen(false);
        setShowResearchOverlay(false);

        if (stepId === 'research') {
            setViewMode('overview');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (stepId === 'script') {
            const isScriptingComplete = steps.find(s => s.id === 'script')?.status === 'completed';
            if (isScriptingComplete) {
                setViewMode('timeline');
                setTimeout(() => {
                    const el = document.getElementById('timeline-header');
                    el?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                setViewMode('overview');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else if (stepId === 'media') {
            setViewMode('timeline');
            setTimeout(() => {
                const el = document.getElementById('media-palette-anchor');
                el?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else if (stepId === 'video') {
            setViewMode('timeline');
            setTimeout(() => {
                const el = document.getElementById('video-render-anchor');
                el?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else if (stepId === 'publish') {
            setViewMode('overview');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-slate-950 text-white">
                <ProjectHeader
                    project={project}
                    currentUser={currentUser}
                    envMode={envMode}
                    envConfig={envConfig}
                    costLogs={costLogs}
                    projectCost={projectCost}
                    projectedTotal={projectedTotal}
                    script={script}
                    viewMode={viewMode}
                    isDirectorDrawerOpen={isDirectorDrawerOpen}
                    isConnectingYouTube={isConnectingYouTube}
                    youtubeChannelStatus={youtubeChannelStatus}
                    onDelete={handleDeleteProject}
                    onSetViewMode={setViewMode}
                    onToggleDirectorDrawer={() => setIsDirectorDrawerOpen(!isDirectorDrawerOpen)}
                    onConnectYouTube={handleConnectYouTube}
                    steps={steps}
                    onStepClick={handleStepClick}
                />

                <main className="max-w-7xl mx-auto px-4 py-8">
                    {viewMode === 'overview' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Research & Content */}
                            <div className="lg:col-span-2 space-y-8">

                                {/* Status Card */}
                                <ProjectStatusCard
                                    project={project}
                                    script={script}
                                    error={error}
                                    currentUser={currentUser}
                                    isResearching={isResearching}
                                    isScripting={isScripting}
                                    isSoundDesigning={isSoundDesigning}
                                    isGeneratingMedia={isGeneratingMedia}
                                    isAssembling={isAssembling}
                                    isRendering={isRendering}
                                    isDownloading={isDownloading}
                                    isGeneratingMetadata={isGeneratingMetadata}
                                    isGeneratingAllAudio={isGeneratingAllAudio}
                                    generatingAudioId={generatingAudioId}
                                    publishDisplayProgress={publishDisplayProgress}
                                    isConnectingYouTube={isConnectingYouTube}
                                    youtubeChannelStatus={youtubeChannelStatus}
                                    persona={researchPersona}
                                    onPersonaChange={setResearchPersona}
                                    onLaunchResearch={() => setShowResearchOverlay(true)}
                                    onCancelResearch={handleCancelResearch}
                                    onGenerateScript={() => setShowScriptConfigModal(true)}
                                    onGenerateMediaClick={handleGenerateMediaClick}
                                    onCancelMedia={handleCancelMedia}
                                    onAssemble={async () => {
                                        if (project?.status !== 'assembling') {
                                            await handleAssemble();
                                        }
                                        handleOpenPreview();
                                    }}
                                    onRender={handleRender}
                                    onLoadSavedRender={handleLoadSavedRender}
                                    onKillRender={handleKillRender}
                                    onDownloadMP4={handleDownloadMP4}
                                    onOpenPublishModal={handleOpenPublishModal}
                                    onCancelPublish={handleCancelPublish}
                                    onCancelMetadata={handleCancelMetadata}
                                    onConnectYouTube={handleConnectYouTube}
                                    onDisconnectYouTube={handleDisconnectYouTube}
                                    onSnapshotAndReset={handleSnapshotAndReset}
                                    onResetToAssembling={handleResetToAssembling}
                                    onRevertToReady={handleRevertToReady}
                                    onRevertToScripting={handleRevertToScripting}
                                    onSkipToAssembly={handleSkipToAssembly}
                                    interceptAction={interceptAction}
                                    setStepConfirm={setStepConfirm}
                                    onSetViewMode={setViewMode}
                                    onUpdateProject={handleUpdateProject}
                                />

                                {/* Research Sections */}
                                {/* Research Intelligence Dashboard */}
                                {project.status !== 'draft' && (
                                    <div className="space-y-6">
                                        <ResearchDashboard
                                            sources={project.research.sources}
                                            facts={project.research.facts}
                                            personaId={project.research.persona}
                                            isResearching={project.status === 'researching'}
                                            onViewLive={() => setShowResearchOverlay(true)}
                                            onCancelResearch={handleCancelResearch}
                                            onBackToTimeline={() => setViewMode('timeline')}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Project Sidebar */}
                            <ProjectSidebar
                                project={project}
                                script={script}
                                user={currentUser}
                            />
                        </div>
                    ) : viewMode === 'settings' ? (
                        <ProjectSettings
                            project={project}
                            onUpdateProject={handleUpdateProject}
                            onDeleteProject={handleDeleteProject}
                            isUpdating={isUpdatingProject}
                        />
                    ) : (
                        script && (
                            <TimelineEditor
                                script={script}
                                projectTitle={project.title}
                                onSave={handleSaveTimeline}
                                onRegenerateImage={handleRegenerateCueImage}
                                onArchiveImage={handleArchiveCueImage}
                                onRegenerateScript={() => setShowScriptConfigModal(true)}
                                onRender={() => {
                                    setViewMode('overview');
                                    handleRender();
                                }}
                                onFineTune={handleOpenPreview}
                                onOpenAcousticStudio={() => setShowMasteringModal(true)}
                                onDownloadMP4={handleDownloadMP4}
                                isSaving={isSavingTimeline}
                                isRendering={isRendering}
                                isDownloading={isDownloading}
                                downloadUrl={project.status === 'ready' ? project.downloadUrl : undefined}
                                isGeneratingMedia={isGeneratingMedia || project.status === 'generating_media'}
                                onGenerateMedia={handleGenerateMediaClick}
                            />
                        )
                    )}
                </main>

                {/* YouTube Publishing Preview / Success */}
                {/* Victory Celebration Overlay */}
                {showVictory && (
                    <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-3xl animate-in fade-in zoom-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-[100px] animate-pulse"></div>
                            <div className="w-48 h-48 bg-gradient-to-br from-green-500 to-emerald-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/30 mb-8 relative z-10 rotate-12">
                                <span className="text-8xl">🎬</span>
                            </div>
                        </div>
                        <h2 className="text-6xl font-black text-white tracking-tighter mb-4 text-center">
                            PRODUCTION<br/>COMPLETE!
                        </h2>
                        <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm mb-12 animate-pulse">
                            Handing off to Publishing Suite...
                        </p>
                    </div>
                )}

                <PublishModal
                    isOpen={isPublishModalOpen}
                    onClose={() => setIsPublishModalOpen(false)}
                    initialMetadata={publishMetadata}
                    onConfirm={handleConfirmPublish}
                    onCancel={handleCancelPublish}
                    onOptimize={handleOptimizeViral}
                    isOptimizing={isOptimizing}
                    thumbnailUrl={project.thumbnailUrl}
                    isPublishing={isPublishing || project.status === 'publishing'}
                    publishProgress={publishDisplayProgress}
                    publishMessage={project.publishMessage}
                    status={project.status}
                    youtubeUrl={project.youtubeUrl}
                    videoUrl={project.downloadUrl}
                />

                {publishedUrl && (
                    <div className="fixed bottom-8 right-8 z-[120] animate-in fade-in slide-in-from-bottom-5">
                        <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl max-w-sm flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎉</span>
                                <div>
                                    <h3 className="font-bold text-white">Published to YouTube!</h3>
                                    <p className="text-xs text-slate-400">Your documentary has been successfully uploaded.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={publishedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold text-center transition-all"
                                >
                                    View on YouTube
                                </a>
                                <button
                                    onClick={() => setPublishedUrl(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {project && (
                    <>
                        <ConfirmModal
                            isOpen={deleteModal.isOpen}
                            onClose={() => setDeleteModal({ isOpen: false, loading: false })}
                            onConfirm={confirmDelete}
                            title="Delete Project"
                            message="Are you sure you want to delete this project? This action cannot be undone. All scripts, media assets, and progress will be permanently lost."
                            confirmLabel="Delete Project"
                            isDestructive={true}
                            isLoading={deleteModal.loading}
                        />

                        <ConfirmModal
                            isOpen={mediaRegenerateModal.isOpen}
                            onClose={() => setMediaRegenerateModal({ isOpen: false, loading: false })}
                            onConfirm={confirmMediaRegenerate}
                            title="Regenerate Visual Assets"
                            message="Visual assets already exist for this script. Regenerating will replace all existing images. This may take several minutes in STAGING/PRODUCTION mode due to rate limiting. Continue?"
                            confirmLabel="Regenerate Assets"
                            isDestructive={false}
                            isLoading={mediaRegenerateModal.loading}
                        />

                        {/* Step Confirmation for Limit AI Mode */}
                        <ConfirmModal
                            isOpen={stepConfirm.isOpen}
                            onClose={() => setStepConfirm(prev => ({ ...prev, isOpen: false }))}
                            onConfirm={() => {
                                setStepConfirm(prev => ({ ...prev, isOpen: false }));
                                stepConfirm.onConfirm();
                            }}
                            title={stepConfirm.title}
                            message={stepConfirm.message}
                            confirmLabel={stepConfirm.confirmLabel || "Confirm"}
                            isDestructive={stepConfirm.isDestructive || false}
                        />

                        {/* Dubbing Confirmation Modal */}
                        <ConfirmModal
                            isOpen={dubConfirmModal.isOpen}
                            onClose={() => setDubConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            onConfirm={() => {
                                setDubConfirmModal(prev => ({ ...prev, isOpen: false }));
                                confirmDubbing(dubConfirmModal.languageCode);
                            }}
                            title={dubConfirmModal.isRegen ? "Regenerate Translation?" : "Initiate Dubbing?"}
                            message={dubConfirmModal.isRegen
                                ? `Are you sure you want to RE-GENERATE the ${dubConfirmModal.languageName} translation? This will overwrite the existing script and audio for this language.`
                                : `Are you sure you want to translate this documentary to ${dubConfirmModal.languageName}? This will generate a new script and start the audio synthesis process.`
                            }
                            confirmLabel={dubConfirmModal.isRegen ? "Regenerate" : "Start Dubbing"}
                            cancelLabel="Cancel"
                            isDestructive={dubConfirmModal.isRegen}
                        />

                        <ConfirmModal
                            isOpen={infoModal.isOpen}
                            onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
                            onConfirm={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
                            title={infoModal.title}
                            message={infoModal.message}
                            confirmLabel="OK"
                            singleButton={true}
                        />
                    </>
                )}

                <DirectorSuite
                    isOpen={isDirectorDrawerOpen}
                    onClose={() => setIsDirectorDrawerOpen(false)}
                    project={project}
                    projectId={projectId}
                    script={script}
                    selectedDubLanguage={selectedDubLanguage}
                    setSelectedDubLanguage={setSelectedDubLanguage}
                    isDubbing={isDubbing}
                    dubbingProgress={dubbingProgress}
                    availableTranslations={availableTranslations}
                    initiateDubbing={initiateDubbing}
                    handleCancelDubbing={handleCancelDubbingClick}
                    handleGenerateShortsCandidates={handleGenerateShortsCandidates}
                    handleRenderShort={handleRenderShort}
                    isGeneratingShortsCandidates={isGeneratingShortsCandidates}
                    handleSnapshot={handleSnapshot}
                    handleRevert={handleRevert}
                    isModal={isDirectorSuiteModal}
                    onToggleModal={() => setIsDirectorSuiteModal(!isDirectorSuiteModal)}
                />

                {/* Multimedia Tool Palette */}
                <MediaPalette
                    project={project}
                    script={script}
                    currentUser={currentUser}
                    isSoundDesigning={isSoundDesigning}
                    isGeneratingAllAudio={isGeneratingAllAudio}
                    generatingAudioId={generatingAudioId}
                    isGeneratingMedia={isGeneratingMedia || project.status === 'generating_media'}
                    onMusicSelect={handleMusicSelect}
                    onAmbianceSelect={handleAmbianceSelect}
                    onGenerateSoundDesign={handleGenerateSoundDesign}
                    onVolumeChange={handleVolumeChange}
                    onSubtitleToggle={handleSubtitleToggle}
                    onSubtitleStyleChange={handleSubtitleStyleChange}
                    onUpdateStyle={handleUpdateStyle}
                    onRegenerateLine={handleGenerateAudio}
                    onRegenerateAll={handleGenerateAllAudio}
                    onUpdateVoiceProfile={handleUpdateVoiceProfile}
                    onOpenMasteringModal={() => setShowMasteringModal(true)}
                    interceptAction={interceptAction}
                />

                {/* Cost Confirmation Modal */}
                {pendingCostEstimate && (
                    <RenderConfirmModal
                        isOpen={showCostConfirm}
                        estimate={pendingCostEstimate}
                        onConfirm={() => {
                            if (script) {
                                setShowCostConfirm(false);
                                setPendingCostEstimate(null);
                                executeRender(script.id);
                            }
                        }}
                        onCancel={() => {
                            setShowCostConfirm(false);
                            setPendingCostEstimate(null);
                        }}
                    />
                )}

                <SynthesisOverlay
                    project={project}
                    script={script}
                    isGenerating={(isGeneratingMedia || project.status === 'generating_media') && showSynthesisOverlay}
                    onCancel={handleCancelMedia}
                    onClose={() => setShowSynthesisOverlay(false)}
                />

                {/* Floating Progress Button (when minimized) */}
                {(isGeneratingMedia || project.status === 'generating_media') && !showSynthesisOverlay && (
                    <button
                        onClick={() => setShowSynthesisOverlay(true)}
                        className="fixed bottom-24 right-8 z-[90] flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 border border-white/10 rounded-full shadow-2xl shadow-blue-500/20 text-white transition-all transform hover:scale-105 group"
                    >
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Materializing Vision ({project.mediaProgress || 0}%)</span>
                        <div className="p-1.5 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                            <Sparkles className="w-3 h-3" />
                        </div>
                    </button>
                )}

                <ResearchOverlay
                    isOpen={showResearchOverlay}
                    onClose={() => setShowResearchOverlay(false)}
                    onLaunch={handleLaunchResearch}
                    onCancel={handleCancelResearch}
                    isResearching={isResearching}
                    logs={researchLogs}
                    selectedPersona={researchPersona}
                    onPersonaChange={setResearchPersona}
                    topic={project.title}
                />

                <ScriptConfigurationModal
                    isOpen={showScriptConfigModal}
                    onClose={() => setShowScriptConfigModal(false)}
                    onStart={async (config) => {
                        const success = await handleGenerateScript(config);
                        if (success) {
                            setShowScriptConfigModal(false);
                            setViewMode('timeline');
                        }
                    }}
                    initialPersona={researchPersona || project.research.persona || 'standard'}
                    initialDuration={project.estimatedDuration || 1}
                    initialPacing={project.targetPacing || 130}
                    isGenerating={isScripting}
                />

                <VisualIdentityModal
                    isOpen={showVisualIdentityModal}
                    onClose={() => setShowVisualIdentityModal(false)}
                    onStart={async (config) => {
                        setShowSynthesisOverlay(true);
                        await handleGenerateMedia(config);
                        setShowVisualIdentityModal(false);
                    }}
                    onCancel={handleCancelMedia}
                    isGenerating={isGeneratingMedia || project.status === 'generating_media'}
                    progress={project.mediaProgress}
                    statusMessage={project.mediaMessage}
                    sectionCount={script?.sections.length || 0}
                />

                {script && (
                    <MasteringModal
                        isOpen={showMasteringModal}
                        onClose={() => setShowMasteringModal(false)}
                        project={project}
                        script={script}
                        onRegenerateLine={handleGenerateAudio}
                        onRegenerateAll={onRegenerateAll}
                        onUpdateVoiceProfile={onUpdateVoiceProfile}
                        onUpdateTTSEngine={onUpdateTTSEngine}
                        isGenerating={isGenerating}
                        generatingId={generatingAudioId}
                        playingId={playingId}
                        isPaused={isPaused}
                        progress={progress}
                        onPlayPause={playPause}
                        onStop={stop}
                        onRewind={rewind}
                    />
                )}

                {/* Cinematic fine-tune Modal */}
                <AnimatePresence>
                    {isInlinePreviewActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 30 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="w-full max-w-6xl max-h-[95vh] bg-slate-900 border border-white/10 rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-500/20" />
                                        <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white/90">
                                            fine-tune
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* View Type Toggle */}
                                        {project.downloadUrl && (
                                            <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/5">
                                                <button
                                                    onClick={() => setActiveViewType('preview')}
                                                    className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeViewType === 'preview' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    Real-time Preview
                                                </button>
                                                <button
                                                    onClick={() => setActiveViewType('mp4')}
                                                    className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeViewType === 'mp4' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    Rendered MP4
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setIsInlinePreviewActive(false)}
                                            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 rounded-full transition-all text-slate-400 hover:text-red-400 border border-white/5 group"
                                            title="Close Fine-Tune"
                                        >
                                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-10 bg-black/40">
                                    <div className="w-full max-w-5xl mx-auto">
                                        {project.downloadUrl && activeViewType === 'mp4' ? (
                                            <MP4Player
                                                url={project.downloadUrl}
                                                title={project.title}
                                            />
                                        ) : (
                                            <VideoPreview
                                                isInline={true}
                                                scenes={timeline}
                                                initialTime={previewStartTime}
                                                backgroundMusicUrl={project.backgroundMusicUrl}
                                                backgroundMusicVolume={project.backgroundMusicVolume}
                                                ambianceUrl={project.ambianceUrl}
                                                ambianceVolume={project.ambianceVolume}
                                                narrationVolume={project.narrationVolume}
                                                globalSfxVolume={project.globalSfxVolume}
                                                subtitlesEnabled={project.subtitlesEnabled || false}
                                                subtitleStyle={project.subtitleStyle || 'minimal'}
                                                autoDucking={project.audioSettings?.autoDucking ?? true}
                                                onClose={() => setIsInlinePreviewActive(false)}
                                                onLiveVolumeChange={handleVolumeChange}
                                                onSaveAudioSettings={async (settings) => {
                                                    await projectService.updateProject(project.id, {
                                                        narrationVolume: settings.narrationVolume,
                                                        backgroundMusicVolume: settings.backgroundMusicVolume,
                                                        ambianceVolume: settings.ambianceVolume,
                                                        globalSfxVolume: settings.globalSfxVolume,
                                                        videoVolume: settings.videoVolume,
                                                        audioSettings: {
                                                            ...project.audioSettings,
                                                            autoDucking: settings.autoDucking,
                                                            masterVolume: project.audioSettings?.masterVolume ?? 1.0
                                                        }
                                                    } as any);
                                                    await loadProjectAndScript();
                                                }}
                                                availableLanguages={[
                                                    { code: 'en-US', name: 'Original (English)', scriptId: project.currentScriptId! },
                                                    ...availableTranslations.map(t => ({
                                                        code: t.language,
                                                        name: SUPPORTED_LANGUAGES.find(l => l.code === t.language)?.name || t.language,
                                                        scriptId: t.scriptId
                                                    }))
                                                ]}
                                                currentLanguageCode={script?.languageCode || 'en-US'}
                                                onLanguageChange={async (scriptId) => {
                                                    if (!script || scriptId === script.id) return;
                                                    try {
                                                        setIsSwitchingLanguage(true);
                                                        const newScript = await scriptService.getScript(scriptId);
                                                        if (newScript) {
                                                            setScript(newScript);
                                                        }
                                                    } catch (err: any) {
                                                        setError('Failed to switch language: ' + err.message);
                                                    } finally {
                                                        setIsSwitchingLanguage(false);
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}
