'use client';

import React, { useEffect, useState, use } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { projectService } from '@/lib/services/firestore';
import { scriptService } from '@/lib/services/script';
import { videoEngine, Scene } from '@/lib/services/video-engine';
import { VideoPreview } from '@/components/project/VideoPreview';
import { MP4Player } from '@/components/project/MP4Player';
import { Project, ProjectStatus, Script, User, SavedRender } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineConfirmButton } from '@/components/ui/InlineConfirmButton';
import { useEnvironment } from '@/lib/hooks/useEnvironment';
import { AMBIENT_TRACKS, audioService, AMBIANCE_LAYERS, SOUND_EFFECTS } from '@/lib/services/audio';
import { TimelineEditor } from '@/components/project/TimelineEditor';
import { userService } from '@/lib/services/firestore';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { PublishModal } from '@/components/project/PublishModal';
import { fetchUsageLogs } from '@/app/actions/analytics';
import { UsageLog } from '@/types';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { mode: envMode, config: envConfig } = useEnvironment();
    const [project, setProject] = useState<Project | null>(null);
    const [script, setScript] = useState<Script | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResearching, setIsResearching] = useState(false);
    const [isScripting, setIsScripting] = useState(false);
    const [isSoundDesigning, setIsSoundDesigning] = useState(false);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState(false);
    const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [timeline, setTimeline] = useState<Scene[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'timeline'>('overview');
    const [isSavingTimeline, setIsSavingTimeline] = useState(false);
    const { user: currentUser } = useAuth();
    const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
    const [publishMetadata, setPublishMetadata] = useState<{ title: string; description: string; tags: string[] } | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [isInlinePreviewActive, setIsInlinePreviewActive] = useState(false);
    const [activeViewType, setActiveViewType] = useState<'preview' | 'mp4'>('preview');
    const [costLogs, setCostLogs] = useState<UsageLog[]>([]);
    const [projectCost, setProjectCost] = useState(0);

    // Step Confirmation State
    const [stepConfirm, setStepConfirm] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const interceptAction = (action: () => void, title: string, message: string) => {
        if (envConfig.ai.limitAI) {
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

    const loadProjectAndScript = async () => {
        try {
            const projectData = await projectService.getProject(projectId);
            if (projectData) {
                setProject(projectData);

                // If the project has a script associated, load it
                let scriptData = null;
                if (projectData.currentScriptId) {
                    scriptData = await scriptService.getScript(projectData.currentScriptId);
                    setScript(scriptData);
                }

                // SELF-HEALING: Detect and repair broken Pixabay URLs
                await repairLegacyAudio(projectData, scriptData);

                // Fetch Cost Logs
                if (currentUser) {
                    const logs = await fetchUsageLogs(currentUser.id, 100, projectId);
                    setCostLogs(logs);
                    const total = logs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0);
                    setProjectCost(total);
                }
                if (projectData.downloadUrl) {
                    setActiveViewType('mp4');
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

    // Recalculate timeline whenever script changes
    useEffect(() => {
        if (script) {
            const calcedTimeline = videoEngine.calculateTimeline(script);
            setTimeline(calcedTimeline);
        }
    }, [script]);

    // Poll for project updates when rendering
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (project?.status === 'rendering' || project?.status === 'generating_media' || project?.status === 'publishing') {
            interval = setInterval(async () => {
                const refreshedProject = await projectService.getProject(projectId);
                if (refreshedProject) {
                    setProject(refreshedProject);
                    // If finished, stop polling
                    if (!['rendering', 'generating_media', 'publishing'].includes(refreshedProject.status)) {
                        clearInterval(interval);
                        if (refreshedProject.downloadUrl) {
                            setActiveViewType('mp4');
                        }
                        // If it became 'ready', 'assembling', or 'published', refresh everything
                        if (['ready', 'assembling', 'published'].includes(refreshedProject.status)) {
                            await loadProjectAndScript();
                        }
                    }
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [project?.status, projectId]);

    const repairLegacyAudio = async (proj: Project, scr: Script | null) => {
        let projectNeedsUpdate = false;
        let scriptNeedsUpdate = false;

        // 1. Repair Ambiance
        if (proj.ambianceUrl?.includes('pixabay.com') || proj.ambianceUrl?.includes('soundbible.com')) {
            console.log('[Self-Healing] Detected legacy ambiance URL. Migrating to local asset...');
            const match = AMBIANCE_LAYERS.find(a => a.label === proj.ambianceLabel);
            if (match) {
                proj.ambianceUrl = match.url;
                projectNeedsUpdate = true;
            }
        }

        // 2. Repair SFX in Script
        if (scr) {
            scr.sections.forEach(section => {
                section.visualCues?.forEach(cue => {
                    if (cue.sfxUrl?.includes('pixabay.com') || cue.sfxUrl?.includes('soundbible.com')) {
                        console.log('[Self-Healing] Detected legacy SFX URL. Migrating to local asset...');
                        const match = SOUND_EFFECTS.find(s => s.label === cue.sfxLabel);
                        if (match) {
                            cue.sfxUrl = match.url;
                            scriptNeedsUpdate = true;
                        }
                    }
                });
            });
        }

        // 3. Initialize Subtitles if missing
        if (proj.subtitlesEnabled === undefined) {
            console.log('[Self-Healing] Initializing subtitles and volumes.');
            proj.subtitlesEnabled = true;
            proj.subtitleStyle = 'minimal';
            proj.narrationVolume = 1.0;
            proj.globalSfxVolume = 0.4;
            projectNeedsUpdate = true;
        }

        if (projectNeedsUpdate) {
            await projectService.updateProject(proj.id, {
                ambianceUrl: proj.ambianceUrl ?? null,
                subtitlesEnabled: proj.subtitlesEnabled ?? true,
                subtitleStyle: proj.subtitleStyle ?? 'minimal',
                narrationVolume: proj.narrationVolume ?? 1.0,
                globalSfxVolume: proj.globalSfxVolume ?? 0.4
            } as any);
        }
        if (scriptNeedsUpdate && scr) {
            await scriptService.updateScript(scr.id, { sections: scr.sections });
        }
    };

    const handleLaunchResearch = async () => {
        if (!project) return;
        interceptAction(async () => {
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
        }, 'Launch AI Research?', 'This will use Gemini to research the topic and extract key facts. This consumes real Vertex AI AI quota.');
    };

    const handleGenerateSoundDesign = async () => {
        if (!project || !script) return;
        interceptAction(async () => {
            setIsSoundDesigning(true);
            setError(null);
            try {
                const response = await fetch(`/api/projects/${project.id}/sound-design`, {
                    method: 'POST',
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Sound design failed');
                }

                await loadProjectAndScript();
            } catch (err: any) {
                setError('Sound design failed: ' + err.message);
            } finally {
                setIsSoundDesigning(false);
            }
        }, 'AI Sound Design?', 'This will analyze your script and generate contextual sound effects and ambiance layers.');
    };

    const handleAmbianceSelect = async (ambianceId: string) => {
        if (!project) return;
        const amb = AMBIANCE_LAYERS.find(a => a.id === ambianceId);
        if (!amb) return;

        try {
            await projectService.updateProject(project.id, {
                ambianceUrl: amb.url,
                ambianceLabel: amb.label,
                ambianceVolume: 0.1
            } as any);
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to update ambiance: ' + err.message);
        }
    };

    const handleVolumeChange = async (key: 'narrationVolume' | 'backgroundMusicVolume' | 'ambianceVolume' | 'globalSfxVolume', value: number) => {
        if (!project) return;
        try {
            await projectService.updateProject(project.id, {
                [key]: value
            } as any);
            await loadProjectAndScript();
        } catch (err: any) {
            setError(`Failed to update ${key}: ` + err.message);
        }
    };

    const handleSubtitleToggle = async () => {
        if (!project) return;
        try {
            // Default to true if currently undefined/null
            const nextState = project.subtitlesEnabled === undefined ? false : !project.subtitlesEnabled;
            await projectService.updateProject(project.id, {
                subtitlesEnabled: nextState
            } as any);
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to toggle subtitles: ' + err.message);
        }
    };

    const handleSubtitleStyleChange = async (style: 'minimal' | 'classic' | 'bold') => {
        if (!project) return;
        try {
            await projectService.updateProject(project.id, {
                subtitleStyle: style
            } as any);
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to change subtitle style: ' + err.message);
        }
    };

    const handleGenerateScript = async () => {
        if (!project) return;
        interceptAction(async () => {
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
        }, 'Generate AI Script?', 'This will generate a sleep-optimized documentary script section by section. This is multiple real Gemini API calls.');
    };

    const handleGenerateAudio = async (sectionId: string) => {
        if (!project || !script) return;
        interceptAction(async () => {
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
        }, 'Generate AI Voice?', 'This will generate a narrator voice for this section using Google Cloud TTS. This is a real API call.');
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
        interceptAction(async () => {
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
        }, 'Generate AI Media?', 'This will use Imagen 3.0 to generate a unique image for every scene in the script. This is multiple real AI API calls.');
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
            setIsInlinePreviewActive(true);
            setActiveViewType('preview');
            setIsPreviewOpen(false); // Ensure full-screen is closed

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Assembly failed: ' + err.message);
        } finally {
            setIsAssembling(false);
        }
    };

    const handleRender = async () => {
        if (!project || !script) return;
        setIsRendering(true);
        setError(null);
        try {
            const response = await fetch(`/api/projects/${project.id}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Rendering failed');
            }
            // Refresh to catch the 'rendering' status immediately
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Render failed: ' + err.message);
        } finally {
            setIsRendering(false);
        }
    };

    const handleResetToAssembling = async () => {
        if (!project) return;
        setIsLoading(true);
        try {
            await projectService.updateProject(project.id, {
                status: 'assembling',
                downloadUrl: null as any,
                renderProgress: 0,
                renderMessage: ''
            });
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to reset project: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSnapshotAndReset = async (label: string = 'Auto-Saved Version') => {
        if (!project || !project.downloadUrl) return;

        setIsLoading(true);
        try {
            // 1. Physical Archival on Server
            const archiveRes = await fetch(`/api/projects/${project.id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label })
            });

            if (!archiveRes.ok) throw new Error('Failed to archive file on server');
            const { archiveUrl, archiveId } = await archiveRes.json();

            // 2. Metadata Persistence in Firestore
            const newSnapshot: SavedRender = {
                id: archiveId,
                url: archiveUrl,
                timestamp: new Date(),
                label: label || `Render ${new Date().toLocaleTimeString()}`
            };

            const updatedSavedRenders = [newSnapshot, ...(project.savedRenders || [])];

            await projectService.updateProject(project.id, {
                status: 'assembling',
                downloadUrl: null as any,
                renderProgress: 0,
                renderMessage: '',
                savedRenders: updatedSavedRenders
            });

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to archive render: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadSavedRender = async (render: SavedRender) => {
        if (!project) return;
        setIsLoading(true);
        try {
            await projectService.updateProject(project.id, {
                downloadUrl: render.url,
                status: 'ready',
                renderProgress: 100,
                renderMessage: `Restored: ${render.label}`
            });
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to load saved render: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevertToReady = async () => {
        if (!project) return;
        setIsLoading(true);
        try {
            await projectService.updateProject(project.id, {
                status: 'ready'
                // Note: We keep the downloadUrl intact
            });
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to revert status: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKillRender = async () => {
        if (!project) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/kill`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to kill render process');
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to kill render: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, loading: false });
    const [mediaRegenerateModal, setMediaRegenerateModal] = useState({ isOpen: false, loading: false });

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

    const handleMusicSelect = async (trackId: string) => {
        if (!project) return;
        const track = audioService.getTrackById(trackId);
        if (!track) return;

        try {
            await projectService.updateProject(project.id, {
                backgroundMusicUrl: track.url,
                backgroundMusicVolume: 0.2 // Default volume
            });
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to update music: ' + err.message);
        }
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

    const handleDisconnectYouTube = async () => {
        if (!currentUser) return;
        setIsConnectingYouTube(true);
        try {
            const response = await fetch('/api/auth/youtube/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.id })
            });

            if (!response.ok) throw new Error('Failed to disconnect');

            // Success - project data will refresh via loadProjectAndScript
            console.log('[Project Page] YouTube disconnected successfully');
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Failed to disconnect YouTube: ' + err.message);
        } finally {
            setIsConnectingYouTube(false);
        }
    };


    const handleConnectYouTube = async () => {
        if (!currentUser) return;
        setIsConnectingYouTube(true);
        try {
            const returnUrl = window.location.pathname;
            const response = await fetch(`/api/auth/youtube/authorize?uid=${currentUser.id}&returnUrl=${encodeURIComponent(returnUrl)}`);
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to get auth URL');
            }
        } catch (err: any) {
            setError('YouTube connection failed: ' + err.message);
        } finally {
            setIsConnectingYouTube(false);
        }
    };

    const handleOpenPublishModal = async () => {
        if (!project || !script) return;

        // Use existing SEO metadata if available
        if (project.seoMetadata) {
            setPublishMetadata({
                title: project.seoMetadata.selectedTitle || project.seoMetadata.titles[0],
                description: project.seoMetadata.description,
                tags: project.seoMetadata.tags
            });
            setIsPublishModalOpen(true);
            return;
        }

        setIsGeneratingMetadata(true);
        setError(null);
        try {
            const response = await fetch(`/api/projects/${project.id}/youtube/metadata?scriptId=${script.id}`);
            const data = await response.json();
            if (data.metadata) {
                setPublishMetadata(data.metadata);
                setIsPublishModalOpen(true);
            } else {
                throw new Error(data.error || 'Failed to generate metadata');
            }
        } catch (err: any) {
            setError('Metadata generation failed: ' + err.message);
        } finally {
            setIsGeneratingMetadata(false);
        }
    };

    const handleConfirmPublish = async (metadata: any, privacy: string) => {
        if (!project || !script || !currentUser) return;
        setIsPublishing(true);
        setError(null);
        try {
            const response = await fetch(`/api/projects/${project.id}/youtube/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: script.id,
                    uid: currentUser.id,
                    metadata,
                    privacy
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Keep modal open to show progress
                await loadProjectAndScript();
            }
            else {
                throw new Error(data.error || 'Publishing failed');
            }
        } catch (err: any) {
            setError('Publishing failed: ' + err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleOptimizeViral = async () => {
        if (!project || !script) return;
        interceptAction(async () => {
            setIsOptimizing(true);
            try {
                const res = await fetch(`/api/projects/${project.id}/viral-suite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scriptId: script.id })
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to optimize for viral growth');
                }
                const data = await res.json();

                // Update local state with new metadata
                setPublishMetadata({
                    title: data.seoMetadata.titles[0],
                    description: data.seoMetadata.description,
                    tags: data.seoMetadata.tags
                });

                await loadProjectAndScript();
            } catch (err: any) {
                setError('Viral Suite Error: ' + err.message);
            } finally {
                setIsOptimizing(false);
            }
        }, 'Viral Suite Optimize?', 'This will use Gemini and Imagen to generate optimized SEO metadata and a cinematic custom thumbnail.');
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
        { id: 'media', label: 'Media', status: project.status === 'generating_media' ? 'active' : (['draft', 'researching', 'scripting'].includes(project.status) ? 'pending' : 'completed') },
        { id: 'video', label: 'Assembly', status: project.status === 'assembling' ? 'active' : (['draft', 'researching', 'scripting', 'generating_media'].includes(project.status) ? 'pending' : 'completed') },
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
                                    <span>•</span>
                                    <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${envMode === 'DEV' ? 'bg-green-500/20 text-green-400' :
                                        envMode === 'STAGING' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {envMode === 'STAGING_LIMITED' ? 'STAGING' : envMode} {envConfig.ai.limitAI ? '(Limit AI)' : (envConfig.ai.model === 'mock' ? '(Mock)' : '(Real AI)')}
                                    </span>
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

                            {/* YouTube Connection Indicator in Header */}
                            {currentUser?.settings.youtubeConnected ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 border border-red-500/20 rounded-lg">
                                    <span className="text-red-500">📺</span>
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{currentUser.youtubeChannelInfo?.title || 'YouTube Linked'}</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectYouTube}
                                    disabled={isConnectingYouTube}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                >
                                    {isConnectingYouTube ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : '📺 Connect YouTube'}
                                </button>
                            )}

                        </div>
                    </div>
                    {/* Cost Breakdown Bar (New) */}
                    <div className="max-w-7xl mx-auto px-4 pb-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between text-xs">
                            <span className="text-white/60 font-mono uppercase tracking-wider">Estimated Project Cost</span>
                            <div className="flex items-center gap-4 font-mono">
                                <span className="text-blue-300">Script: ${costLogs.filter(l => l.operation === 'script-generation').reduce((s, l) => s + l.estimatedCost, 0).toFixed(4)}</span>
                                <span className="text-purple-300">Media: ${costLogs.filter(l => l.operation === 'image-generation').reduce((s, l) => s + l.estimatedCost, 0).toFixed(4)}</span>
                                <span className="text-orange-300">Render: ${costLogs.filter(l => l.operation === 'rendering').reduce((s, l) => s + l.estimatedCost, 0).toFixed(4)}</span>
                                <span className="text-green-400 font-bold border-l border-white/10 pl-4">Total: ${projectCost.toFixed(4)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-0">
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

                        {/* View Switcher */}
                        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 self-start md:self-auto">
                            <button
                                onClick={() => setViewMode('overview')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setViewMode('timeline')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'timeline' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                Timeline Editor
                            </button>
                        </div>
                    </div>
                </div>

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
                                                    onClose={() => setIsInlinePreviewActive(false)}
                                                    onSaveAudioSettings={async (settings) => {
                                                        await projectService.updateProject(project.id, {
                                                            narrationVolume: settings.narrationVolume,
                                                            backgroundMusicVolume: settings.backgroundMusicVolume,
                                                            ambianceVolume: settings.ambianceVolume,
                                                            globalSfxVolume: settings.globalSfxVolume
                                                        } as any);
                                                        await loadProjectAndScript();
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

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
                                        {project.status === 'ready' && "The documentary has been rendered and is ready for download or upload to YouTube."}
                                    </p>

                                    {/* Ambient Music Selection */}
                                    <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">🎵</span>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Background Soundscape</h3>
                                            </div>
                                            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">NEW</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {AMBIENT_TRACKS.map(track => (
                                                <button
                                                    key={track.id}
                                                    onClick={() => handleMusicSelect(track.id)}
                                                    className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${project.backgroundMusicUrl === track.url
                                                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10'
                                                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-white leading-tight">{track.title}</span>
                                                        {project.backgroundMusicUrl === track.url && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 leading-tight">{track.bpm} BPM • {track.description.split('.')[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* AI Sound Designer */}
                                    {(project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling' || project.status === 'ready') && script && (
                                        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl relative overflow-hidden group/sfx">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/sfx:bg-teal-500/10 transition-all duration-700"></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">🎻</span>
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Sound Designer</h3>
                                                </div>
                                                {project.ambianceUrl && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-md">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">{project.ambianceLabel || 'Custom Ambiance'}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">
                                                Orchestrate contextual sound effects (SFX) and atmospheric layers based on your visual cues.
                                            </p>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    {AMBIANCE_LAYERS.map(amb => (
                                                        <button
                                                            key={amb.id}
                                                            onClick={() => handleAmbianceSelect(amb.id)}
                                                            className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-1 ${project.ambianceUrl === amb.url
                                                                ? 'bg-teal-600/20 border-teal-500 shadow-lg shadow-teal-500/10'
                                                                : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-xs font-bold leading-tight ${project.ambianceUrl === amb.url ? 'text-teal-400' : 'text-white'}`}>{amb.label}</span>
                                                                {project.ambianceUrl === amb.url && <span className="w-2 h-2 rounded-full bg-teal-500"></span>}
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 leading-tight capitaliz">{amb.category} Ambiance</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => interceptAction(
                                                        handleGenerateSoundDesign,
                                                        'Run AI Sound Design?',
                                                        'Gemini will analyze your visual scenes and assign the most appropriate sound effects from our curated library.'
                                                    )}
                                                    disabled={isSoundDesigning}
                                                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${project.ambianceUrl
                                                        ? 'bg-slate-700 hover:bg-slate-600 text-teal-400 border border-teal-500/20'
                                                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/10'}`}
                                                >
                                                    {isSoundDesigning ? (
                                                        <>
                                                            <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                            <span>Scoring Documentary...</span>
                                                        </>
                                                    ) : (
                                                        <span>{project.ambianceUrl ? '🤖 Re-orchestrate SFX with Gemini' : '🎻 Orchestrate AI Sound Design'}</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Master Audio Mixer */}
                                    {(project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling' || project.status === 'ready') && (
                                        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl relative overflow-hidden group/mixer">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/mixer:bg-blue-500/10 transition-all duration-700"></div>
                                            <div className="flex items-center gap-2 mb-6">
                                                <span className="text-xl">🎚️</span>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Master Audio Mixer</h3>
                                            </div>

                                            <div className="space-y-6">
                                                {[
                                                    { id: 'narrationVolume', label: '🎙️ Narration', value: project.narrationVolume ?? 1.0 },
                                                    { id: 'backgroundMusicVolume', label: '🎵 Music', value: project.backgroundMusicVolume ?? 0.2 },
                                                    { id: 'ambianceVolume', label: '🌧️ Ambiance', value: project.ambianceVolume ?? 0.1 },
                                                    { id: 'globalSfxVolume', label: '🔥 Scene SFX', value: project.globalSfxVolume ?? 0.4 }
                                                ].map(channel => (
                                                    <div key={channel.id} className="space-y-2">
                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                                            <span className="text-slate-400">{channel.label}</span>
                                                            <span className="text-blue-400">{Math.round(channel.value * 100)}%</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.05"
                                                            value={channel.value}
                                                            onChange={(e) => handleVolumeChange(channel.id as any, parseFloat(e.target.value))}
                                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Kinetic Typography (Subtitles) */}
                                    {(project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling' || project.status === 'ready') && script && (
                                        <div className="bg-slate-800/50 rounded-2xl border border-white/5 p-6 mb-8 max-w-2xl relative overflow-hidden group/sub">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover/sub:bg-amber-500/10 transition-all duration-700"></div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">📝</span>
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kinetic Typography</h3>
                                                </div>
                                                <button
                                                    onClick={handleSubtitleToggle}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${project.subtitlesEnabled ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}
                                                >
                                                    {project.subtitlesEnabled ? 'Enabled' : 'Disabled'}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                                                Burn-in professional, sleep-optimized subtitles into your final rendering.
                                            </p>

                                            <div className="flex gap-2">
                                                {(['minimal', 'classic', 'bold'] as const).map(style => (
                                                    <button
                                                        key={style}
                                                        onClick={() => handleSubtitleStyleChange(style)}
                                                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${project.subtitleStyle === style || (!project.subtitleStyle && style === 'minimal')
                                                            ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                                    >
                                                        {style}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        {project.status === 'draft' && (
                                            <button
                                                onClick={() => interceptAction(
                                                    handleLaunchResearch,
                                                    'Launch AI Research?',
                                                    'This will use Vertex AI to extract facts about the topic. In STAGING mode, this is a real API call.'
                                                )}
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
                                                onClick={() => interceptAction(
                                                    handleGenerateScript,
                                                    'Generate Sleep Script?',
                                                    'This will use Gemini to write a sleep-optimized documentary script. In STAGING mode, this is a real API call.'
                                                )}
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

                                        {(project.status === 'scripting' || project.status === 'generating_media' || project.status === 'assembling') && script && project.status !== 'generating_media' && (
                                            <button
                                                onClick={handleGenerateMediaClick}
                                                disabled={isGeneratingMedia}
                                                className="px-8 py-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-3 border border-slate-700"
                                            >
                                                {isGeneratingMedia ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                        <span>Synthesizing Visual Assets...</span>
                                                    </>
                                                ) : (
                                                    <span>{project.status === 'assembling' ? '🔄 Regenerate Visual Assets' : '🖼️ Generate Visual Assets'}</span>
                                                )}
                                            </button>
                                        )}

                                        {project.status === 'generating_media' && (
                                            <div className="flex-1 max-w-xl bg-slate-800/40 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-purple-600 to-pink-400 transition-all duration-700 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${project.mediaProgress || 0}%` }}></div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-5 h-5 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                                                            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-sm animate-pulse"></div>
                                                        </div>
                                                        <span className="text-sm font-black text-white uppercase tracking-widest">{project.mediaProgress === 100 ? 'Finalizing...' : 'Synthesizing Visual Assets...'}</span>
                                                    </div>
                                                    <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                                        <span className="text-xs font-mono font-bold text-purple-400">{project.mediaProgress || 0}%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Art Factory:</span>
                                                    <p className="text-[10px] text-purple-200/70 font-medium italic animate-pulse">
                                                        {project.mediaMessage || 'Initializing cinematic generation...'}
                                                    </p>
                                                </div>
                                            </div>
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

                                        {(project.status === 'assembling' || project.status === 'review') && !project.downloadUrl && (
                                            <div className="flex flex-col gap-6 w-full max-w-2xl">
                                                <button
                                                    onClick={handleRender}
                                                    disabled={isRendering}
                                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                                >
                                                    {isRendering ? (
                                                        <>
                                                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                            <span>Initializing...</span>
                                                        </>
                                                    ) : (
                                                        <span>🎞️ Render MP4 Video</span>
                                                    )}
                                                </button>

                                                {/* Saved Renders Library */}
                                                {project.savedRenders && project.savedRenders.length > 0 && (
                                                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">📦 Saved Renders Archive</span>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            {project.savedRenders.map((render) => (
                                                                <div key={render.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all group">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-white">{render.label}</span>
                                                                        <span className="text-[10px] text-slate-500 font-medium">{new Date(render.timestamp).toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <a
                                                                            href={render.url}
                                                                            target="_blank"
                                                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                                                            title="Preview file"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                        </a>
                                                                        <button
                                                                            onClick={() => handleLoadSavedRender(render)}
                                                                            className="px-4 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            Load This Version
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {project.status === 'rendering' && (
                                            <div className="flex-1 flex gap-4 max-w-2xl">
                                                <div className="flex-1 bg-slate-800/40 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${project.renderProgress || 0}%` }}></div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                                                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-sm animate-pulse"></div>
                                                            </div>
                                                            <span className="text-sm font-black text-white uppercase tracking-widest">{project.renderProgress === 100 ? 'Finalizing...' : 'Baking High-Quality MP4...'}</span>
                                                        </div>
                                                        <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                                            <span className="text-xs font-mono font-bold text-blue-400">{project.renderProgress || 0}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Current Step:</span>
                                                        <p className="text-[10px] text-blue-200/70 font-medium italic animate-pulse">
                                                            {project.renderMessage || 'Processing documentary segments...'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setStepConfirm({
                                                        isOpen: true,
                                                        title: '🛑 TERMINATE BAKE?',
                                                        message: 'EXTREME ACTION: This will forcibly terminate ALL server-side render processes and reset the project status. Any progress on the current MP4 will be lost. Continue?',
                                                        onConfirm: handleKillRender
                                                    })}
                                                    className="px-6 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-2 group whitespace-nowrap"
                                                    title="Kill all render processes and reset project"
                                                >
                                                    <span className="text-lg group-hover:scale-125 transition-transform">🔴</span>
                                                    <span>Terminate Bake</span>
                                                </button>
                                            </div>
                                        )}

                                        {project.downloadUrl && (
                                            <a
                                                href={project.downloadUrl}
                                                download={`Documentary_${project.title.replace(/\s+/g, '_')}.mp4`}
                                                className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-3"
                                            >
                                                <span>⬇️ Download MP4 Movie</span>
                                            </a>
                                        )}

                                        {project.status === 'publishing' && (
                                            <div className="flex-1 max-w-xl bg-slate-800/40 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-red-600 to-red-500 transition-all duration-700 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${project.publishProgress || 0}%` }}></div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-5 h-5 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                                                            <div className="absolute inset-0 bg-red-500/10 rounded-full blur-sm animate-pulse"></div>
                                                        </div>
                                                        <span className="text-sm font-black text-white uppercase tracking-widest">{project.publishProgress === 100 ? 'Finalizing...' : 'Publishing to YouTube...'}</span>
                                                    </div>
                                                    <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md">
                                                        <span className="text-xs font-mono font-bold text-red-400">{project.publishProgress || 0}%</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Broadcast:</span>
                                                    <p className="text-[10px] text-red-200/70 font-medium italic animate-pulse">
                                                        {project.publishMessage || 'Preparing video for broadcast...'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {(project.status === 'assembling' || project.status === 'review' || project.status === 'published' || project.status === 'ready') && currentUser?.settings.youtubeConnected && (
                                            <button
                                                onClick={handleOpenPublishModal}
                                                disabled={isGeneratingMetadata}
                                                className={`px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-3 ${project.status === 'published'
                                                    ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                                                    : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/20'
                                                    }`}
                                            >
                                                {isGeneratingMetadata ? (
                                                    <>
                                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                        <span>Consulting Gemini...</span>
                                                    </>
                                                ) : (
                                                    <span>{project.status === 'published' ? '🔄 Republish to YouTube' : '🚀 Review & Publish to YouTube'}</span>
                                                )}
                                            </button>
                                        )}

                                        {project.status === 'ready' && (
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setStepConfirm({
                                                        isOpen: true,
                                                        title: '📦 ARCHIVE & RE-EDIT?',
                                                        message: 'This will save your current MP4 to the "Saved Renders" library and take you back to the Assembly phase. You can reload this video at any time. Continue?',
                                                        onConfirm: () => handleSnapshotAndReset('Snapshot before Re-edit')
                                                    })}
                                                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-3"
                                                >
                                                    <span>📦 Save Version & Re-edit</span>
                                                </button>

                                                <button
                                                    onClick={() => setStepConfirm({
                                                        isOpen: true,
                                                        title: '🗑️ DISCARD & RE-EDIT?',
                                                        message: 'This will move the project back to the Assembling phase and CLEAR the current MP4 download. Use this if the current render is not worth saving. Continue?',
                                                        onConfirm: handleResetToAssembling
                                                    })}
                                                    className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-slate-700 flex items-center gap-3"
                                                >
                                                    <span>🔄 Discard & Re-edit</span>
                                                </button>
                                            </div>
                                        )}

                                        {project.status === 'published' && (
                                            <button
                                                onClick={() => setStepConfirm({
                                                    isOpen: true,
                                                    title: 'Mark as Un-published?',
                                                    message: 'This will revert the status to READY. It will NOT delete the video from YouTube, but will allow you to republish or manage the project as if it were just rendered. Continue?',
                                                    onConfirm: handleRevertToReady
                                                })}
                                                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-slate-700 flex items-center gap-3"
                                            >
                                                <span>🔙 Mark as Un-published</span>
                                            </button>
                                        )}

                                        {currentUser?.settings.youtubeConnected && (project.status === 'assembling' || project.status === 'review' || project.status === 'published' || project.status === 'ready' || project.status === 'rendering') && (
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={handleConnectYouTube}
                                                    disabled={isConnectingYouTube}
                                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                                                >
                                                    <span>🔄 Switch Account</span>
                                                </button>
                                                <InlineConfirmButton
                                                    label={<span>🚫 Disconnect</span>}
                                                    onConfirm={handleDisconnectYouTube}
                                                    isLoading={isConnectingYouTube}
                                                    className="px-4 py-2 text-xs font-bold text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-2 border-l border-slate-800"
                                                />
                                            </div>
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
                                                    onClick={() => interceptAction(
                                                        handleGenerateAllAudio,
                                                        'Generate All Pending Audio?',
                                                        'This will sequentially generate audio for all sections using Google Cloud TTS. In STAGING mode, these are multiple real API calls.'
                                                    )}
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
                                                                onClick={() => interceptAction(
                                                                    () => handleGenerateAudio(section.id),
                                                                    'Generate Audio for Section?',
                                                                    `This will use Google Cloud TTS to generate audio for "${section.title}". In STAGING mode, this is a real API call.`
                                                                )}
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
                        </div>
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
                    onOptimize={handleOptimizeViral}
                    isOptimizing={isOptimizing}
                    thumbnailUrl={project.thumbnailUrl}
                    isPublishing={isPublishing || project.status === 'publishing'}
                    publishProgress={project.publishProgress}
                    publishMessage={project.publishMessage}
                    status={project.status}
                    youtubeUrl={project.youtubeUrl}
                />

                {publishedUrl && (
                    <div className="fixed bottom-8 right-8 z-[120] animate-in fade-in slide-in-from-bottom-5">
                        <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl max-w-sm flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎉</span>
                                <div>
                                    <h3 className="font-bold text-white">Published to YouTube!</h3>
                                    <p className="text-xs text-slate-400">Your documentary is now live (unlisted).</p>
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
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
