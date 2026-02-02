'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { projectService } from '@/lib/services/firestore';
import { scriptService } from '@/lib/services/script';
import { videoEngine, Scene } from '@/lib/services/video-engine';
import { VideoPreview } from '@/components/project/VideoPreview';
import { MP4Player } from '@/components/project/MP4Player';
import { Project, ProjectStatus, Script, User, SavedRender, VisualStyle } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineConfirmButton } from '@/components/ui/InlineConfirmButton';
import { useEnvironment } from '@/lib/hooks/useEnvironment';
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
import { MasteringBooth } from '@/components/project/MasteringBooth';
import { ProjectSettings } from '@/components/project/ProjectSettings';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectStatusCard } from '@/components/project/ProjectStatusCard';
import { ResearchExplorer } from '@/components/project/ResearchExplorer';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { CostEstimateCard, RenderConfirmModal } from '@/components/project/CostEstimateCard';
import { calculateProjectBudget, ProjectBudget } from '@/lib/services/analytics';
import { estimateCost, CostEstimate } from '@/lib/config/environment';
import { useYouTubeLogic } from '@/lib/hooks/useYouTubeLogic';
import { useMediaActions } from '@/lib/hooks/useMediaActions';
import { useContentCreation } from '@/lib/hooks/useContentCreation';
import { DirectorSuite } from '@/components/project/DirectorSuite';
import { useProjectSync } from '@/lib/hooks/useProjectSync';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { mode: envMode, config: envConfig } = useEnvironment();
    const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'settings'>('overview');
    const [isSavingTimeline, setIsSavingTimeline] = useState(false);
    const { user: currentUser, loading: authLoading } = useAuth();
    const [timeline, setTimeline] = useState<Scene[]>([]);
    const [isInlinePreviewActive, setIsInlinePreviewActive] = useState(false);
    const [activeViewType, setActiveViewType] = useState<'preview' | 'mp4'>('preview');
    const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);

    const [stepConfirm, setStepConfirm] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
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
        handleOptimizeViral
    } = useYouTubeLogic({
        project,
        script,
        projectId,
        currentUser,
        loadProjectAndScript: (preserve?: boolean) => loadProjectAndScript(preserve),
        setError,
        isPublishModalOpen,
        setIsPublishModalOpen
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
        handleLoadSavedRender,
        executeRender,
        handleUpdateProject,
        handleUpdateStyle,
        handleSnapshot,
        handleRevert,
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
        handleMusicSelect,
        handleAmbianceSelect,
        handleVolumeChange,
        handleSubtitleToggle,
        handleSubtitleStyleChange,
        handleUpdateVoiceProfile,
        isGeneratingShortsCandidates,
        handleGenerateShortsCandidates,
        handleRenderShort,
        isDubbing,
        setIsDubbing,
        confirmDubbing,
        handleCancelDubbing
    } = useContentCreation({
        project,
        script,
        loadProjectAndScript,
        setError
    });

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
            // No existing assets, use interceptor for Limit AI mode
            interceptAction(
                handleGenerateMedia,
                'Synthesize Visual Assets?',
                'This will use Vertex AI Imagen to generate atmospheric imagery. In STAGING mode, this is a real API call.'
            );
        }
    };

    const confirmMediaRegenerate = async () => {
        setMediaRegenerateModal({ isOpen: false, loading: false });
        interceptAction(
            handleGenerateMedia,
            'Regenerate Visual Assets?',
            'This will replace your existing images using real Vertex AI calls. In STAGING mode, this will follow the rate-limiting rules.'
        );
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
        { id: 'script', label: 'Scripting', status: project.status === 'scripting' ? 'active' : (project.status === 'draft' ? 'pending' : 'completed') },
        { id: 'media', label: 'Media', status: project.status === 'generating_media' ? 'active' : (['draft', 'researching', 'scripting'].includes(project.status) ? 'pending' : 'completed') },
        { id: 'video', label: 'Assembly', status: project.status === 'assembling' ? 'active' : (['draft', 'researching', 'scripting', 'generating_media'].includes(project.status) ? 'pending' : 'completed') },
    ];

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
                    viewMode={viewMode}
                    isDirectorDrawerOpen={isDirectorDrawerOpen}
                    isConnectingYouTube={isConnectingYouTube}
                    onDelete={handleDeleteProject}
                    onSetViewMode={setViewMode}
                    onToggleDirectorDrawer={() => setIsDirectorDrawerOpen(!isDirectorDrawerOpen)}
                    onConnectYouTube={handleConnectYouTube}
                    steps={steps}
                />

                <main className="max-w-7xl mx-auto px-4 py-8">
                    {viewMode === 'overview' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Research & Content */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* NEW: Cinematic Viewing Window */}
                                {(project.downloadUrl || isInlinePreviewActive) && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-black uppercase tracking-widest text-white/90 flex items-center gap-3">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                Viewing Window
                                            </h3>

                                            <div className="flex items-center gap-4">
                                                {project.downloadUrl && (
                                                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                                                        <button
                                                            onClick={() => setActiveViewType('preview')}
                                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeViewType === 'preview' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                        >
                                                            Real-time Preview
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveViewType('mp4')}
                                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeViewType === 'mp4' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                        >
                                                            Rendered MP4
                                                        </button>
                                                    </div>
                                                )}

                                                {isInlinePreviewActive && !project.downloadUrl && (
                                                    <button
                                                        onClick={() => setIsInlinePreviewActive(false)}
                                                        className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                                                    >
                                                        Close Preview
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            {project.downloadUrl && activeViewType === 'mp4' ? (
                                                <MP4Player
                                                    url={project.downloadUrl}
                                                    title={project.title}
                                                />
                                            ) : (
                                                <VideoPreview
                                                    isInline={true}
                                                    scenes={timeline}
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
                                )}

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
                                    onMusicSelect={handleMusicSelect}
                                    onAmbianceSelect={handleAmbianceSelect}
                                    onGenerateSoundDesign={handleGenerateSoundDesign}
                                    onVolumeChange={handleVolumeChange}
                                    onSubtitleToggle={handleSubtitleToggle}
                                    onSubtitleStyleChange={handleSubtitleStyleChange}
                                    onLaunchResearch={handleLaunchResearch}
                                    onGenerateScript={handleGenerateScript}
                                    onGenerateMediaClick={handleGenerateMediaClick}
                                    onCancelMedia={handleCancelMedia}
                                    onAssemble={handleAssemble}
                                    onRender={handleRender}
                                    onLoadSavedRender={handleLoadSavedRender}
                                    onKillRender={handleKillRender}
                                    onDownloadMP4={handleDownloadMP4}
                                    onOpenPublishModal={handleOpenPublishModal}
                                    onConnectYouTube={handleConnectYouTube}
                                    onDisconnectYouTube={handleDisconnectYouTube}
                                    onSnapshotAndReset={handleSnapshotAndReset}
                                    onResetToAssembling={handleResetToAssembling}
                                    onRevertToReady={handleRevertToReady}
                                    interceptAction={interceptAction}
                                    setStepConfirm={setStepConfirm}
                                />

                                {project.status !== 'draft' && project.status !== 'researching' && script && (
                                    <MasteringBooth
                                        project={project}
                                        script={script}
                                        isGenerating={isGeneratingAllAudio || !!generatingAudioId}
                                        generatingId={generatingAudioId}
                                        onRegenerateLine={handleGenerateAudio}
                                        onRegenerateAll={handleGenerateAllAudio}
                                        onUpdateVoiceProfile={handleUpdateVoiceProfile}
                                    />
                                )}

                                {/* Research Sections */}
                                <ResearchExplorer
                                    sources={project.research.sources}
                                    facts={project.research.facts}
                                />
                            </div>

                            {/* Right Column: Project Sidebar */}
                            <ProjectSidebar script={script} />
                        </div>
                    ) : viewMode === 'settings' ? (
                        <ProjectSettings
                            project={project}
                            onUpdateProject={handleUpdateProject}
                            isUpdating={isUpdatingProject}
                        />
                    ) : (
                        script && (
                            <TimelineEditor
                                script={script}
                                onSave={handleSaveTimeline}
                                onRegenerateImage={handleRegenerateCueImage}
                                isSaving={isSavingTimeline}
                            />
                        )
                    )}
                </main>

                {/* YouTube Publishing Preview / Success */}
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
                            confirmLabel="Confirm API Call"
                            isDestructive={false}
                        />

                        {/* Dubbing Confirmation Modal */}
                        <ConfirmModal
                            isOpen={dubConfirmModal.isOpen}
                            onClose={() => setDubConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            onConfirm={() => confirmDubbing(dubConfirmModal.languageCode)}
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
                    handleUpdateStyle={handleUpdateStyle}
                    handleSnapshot={handleSnapshot}
                    handleRevert={handleRevert}
                />

                {/* Cost Confirmation Modal */}
                {pendingCostEstimate && (
                    <RenderConfirmModal
                        isOpen={showCostConfirm}
                        estimate={pendingCostEstimate}
                        onConfirm={() => script && executeRender(script.id)}
                        onCancel={() => {
                            setShowCostConfirm(false);
                            setPendingCostEstimate(null);
                        }}
                    />
                )}
            </div>
        </ProtectedRoute>
    );
}
