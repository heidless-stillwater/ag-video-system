import { useState, useRef, useEffect } from 'react';
import { Project, Script, User } from '@/types';

import { EnvironmentMode } from '../config/environment';

interface UseYouTubeLogicProps {
    project: Project | null;
    script: Script | null;
    projectId: string;
    currentUser: User | null;
    loadProjectAndScript: (preserve?: boolean) => Promise<void>;
    setError: (error: string | null) => void;
    isPublishModalOpen: boolean;
    setIsPublishModalOpen: (isOpen: boolean) => void;
    envMode: EnvironmentMode;
}

interface UseYouTubeLogicReturn {
    isConnectingYouTube: boolean;
    isGeneratingMetadata: boolean;
    publishMetadata: { title: string; description: string; tags: string[] } | null;
    isPublishing: boolean;
    isOptimizing: boolean;
    publishDisplayProgress: number;
    handleConnectYouTube: () => Promise<void>;
    handleDisconnectYouTube: () => Promise<void>;
    handleOpenPublishModal: () => void;
    handleConfirmPublish: (metadata: any) => Promise<void>;
    handleCancelPublish: () => Promise<void>;
    handleCancelMetadata: () => void;
    handleOptimizeViral: (currentMetadata: any) => Promise<void>;
}

export function useYouTubeLogic({
    project,
    script,
    projectId,
    currentUser,
    loadProjectAndScript,
    setError,
    isPublishModalOpen,
    setIsPublishModalOpen,
    envMode
}: UseYouTubeLogicProps): UseYouTubeLogicReturn {
    const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
    const [publishMetadata, setPublishMetadata] = useState<{ title: string; description: string; tags: string[] } | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [publishDisplayProgress, setPublishDisplayProgress] = useState(0);

    useEffect(() => {
        if (project?.publishProgress !== undefined && project.publishProgress > publishDisplayProgress) {
            setPublishDisplayProgress(project.publishProgress);
        }
        if (project?.status !== 'publishing' && project?.status !== 'published') {
            setPublishDisplayProgress(0);
        }
    }, [project?.publishProgress, project?.status, publishDisplayProgress]);

    const handleConnectYouTube = async () => {
        setIsConnectingYouTube(true);
        if (!currentUser?.id) {
            setError('User authentication required to connect YouTube');
            setIsConnectingYouTube(false);
            return;
        }

        try {
            console.log(`[useYouTubeLogic] Initiating YouTube connection for UID: ${currentUser.id}`);
            const res = await fetch(`/api/auth/youtube/authorize?uid=${currentUser.id}&returnUrl=${window.location.pathname}`);
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown API error' }));
                throw new Error(errorData.error || `Server responded with ${res.status}`);
            }

            const { url } = await res.json();
            if (!url) throw new Error('No authorization URL returned from server');
            
            window.location.href = url;
        } catch (err: any) {
            console.error('Failed to get YouTube auth URL:', err);
            setError(err.message || 'Failed to initiate YouTube connection');
            setIsConnectingYouTube(false);
        }
    };

    const handleDisconnectYouTube = async () => {
        setIsConnectingYouTube(true);
        if (!currentUser?.id) {
            setError('User authentication required to disconnect YouTube');
            setIsConnectingYouTube(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/youtube/disconnect', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.id })
            });
            if (res.ok) {
                window.location.reload();
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to disconnect');
            }
        } catch (err: any) {
            console.error('Failed to disconnect YouTube:', err);
            setError('Failed to disconnect YouTube account');
        } finally {
            setIsConnectingYouTube(false);
        }
    };

    const metadataAbortControllerRef = useRef<AbortController | null>(null);

    const handleOpenPublishModal = async () => {
        if (!project || !script) return;

        // 1. Prepare initial fallback metadata so modal opens INSTANTLY
        const initialMetadata = {
            title: project.seoMetadata?.selectedTitle || project.seoMetadata?.titles[0] || project.title,
            description: project.seoMetadata?.description || project.description || '',
            tags: project.seoMetadata?.tags || []
        };

        setPublishMetadata(initialMetadata);
        setIsPublishModalOpen(true);

        // 2. If we already have AI metadata or project is already publishing, we're done
        if (project.seoMetadata || project.status === 'publishing') {
            return;
        }

        // 3. Otherwise, enhance with AI in the background
        setIsGeneratingMetadata(true);
        setError(null);
        
        // Use AbortController so user can cancel
        metadataAbortControllerRef.current = new AbortController();
        
        try {
            console.log(`[useYouTubeLogic] Fetching metadata for project: ${project.id}`);
            const response = await fetch(`/api/projects/${project.id}/youtube/metadata?scriptId=${script.id}`, {
                signal: metadataAbortControllerRef.current.signal
            });
            
            const data = await response.json();
            if (data.metadata) {
                setPublishMetadata(data.metadata);
                // We intentionally do not call setError here if rateLimited is true, 
                // because the heuristic fallback is perfectly valid and rendering a red error
                // confuses the user into thinking publishing is completely broken.
                setIsPublishModalOpen(true);
            } else {
                throw new Error(data.error || 'Failed to generate metadata');
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('[useYouTubeLogic] Metadata generation aborted by user');
                return;
            }
            
            console.error('Metadata error:', err);
            // Last resort: open the modal with basic project info rather than blocking the user
            if (project.title) {
                setPublishMetadata({
                    title: project.title,
                    description: project.description || '',
                    tags: []
                });
                setError('⚠️ Could not generate AI metadata. Please fill in the details manually.');
                setIsPublishModalOpen(true);
            } else {
                setError(err.message);
            }
        } finally {
            setIsGeneratingMetadata(false);
            metadataAbortControllerRef.current = null;
        }
    };

    const handleCancelMetadata = () => {
        if (metadataAbortControllerRef.current) {
            metadataAbortControllerRef.current.abort();
            setIsGeneratingMetadata(false);
        }
    };

    const handleConfirmPublish = async (metadata: any) => {
        if (!project) return;
        setIsPublishing(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/youtube/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    scriptId: script?.id,
                    uid: currentUser?.id,
                    metadata,
                    envMode // Pass explicitly
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to start publishing');
            }

            // Close modal will be handled by project status listener in page.tsx
            // but we can close it here if we want immediate feedback
        } catch (err: any) {
            setError(err.message);
            setIsPublishing(false);
        }
    };

    const handleCancelPublish = async () => {
        if (!project || (project.status !== 'publishing' && !isPublishing)) {
            setIsPublishModalOpen(false);
            return;
        }

        // Optimistically update UI
        setIsPublishing(false);
        setIsPublishModalOpen(false);

        try {
            console.log(`[useYouTubeLogic] Cancelling publish for project: ${project.id}`);
            const res = await fetch(`/api/projects/${project.id}/youtube/cancel`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.warn('[useYouTubeLogic] Cancel API returned error:', errorData);
            }
        } catch (err) {
            console.error('[useYouTubeLogic] Failed to call cancel API:', err);
            // We don't necessarily show an error to the user here because 
            // from their perspective, they've already "cancelled" the UI.
        } finally {
            // Ensure we load latest state to reflect 'ready' status set by backend
            setTimeout(() => loadProjectAndScript(true), 1000);
        }
    };

    const handleOptimizeViral = async (currentMetadata: any) => {
        if (!project || !script) return;
        setIsOptimizing(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/youtube/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: currentMetadata,
                    scriptId: script.id
                })
            });
            const data = await res.json();
            if (data.metadata) {
                setPublishMetadata(data.metadata);
            }
        } catch (err) {
            console.error('Optimization failed:', err);
        } finally {
            setIsOptimizing(false);
        }
    };

    return {
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
    };
};
