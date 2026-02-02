import { useState, useRef, useEffect } from 'react';
import { Project, Script, User } from '@/types';

interface UseYouTubeLogicProps {
    project: Project | null;
    script: Script | null;
    projectId: string;
    currentUser: User | null;
    loadProjectAndScript: () => Promise<void>;
    setError: (error: string | null) => void;
    isPublishModalOpen: boolean;
    setIsPublishModalOpen: (open: boolean) => void;
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
    handleOptimizeViral: (currentMetadata: any) => Promise<void>;
}

export const useYouTubeLogic = ({
    project,
    script,
    projectId,
    currentUser,
    loadProjectAndScript,
    setError,
    isPublishModalOpen,
    setIsPublishModalOpen
}: UseYouTubeLogicProps): UseYouTubeLogicReturn => {
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
        try {
            const res = await fetch('/api/auth/youtube/url');
            const { url } = await res.json();
            window.location.href = url;
        } catch (err) {
            console.error('Failed to get YouTube auth URL:', err);
            setError('Failed to initiate YouTube connection');
            setIsConnectingYouTube(false);
        }
    };

    const handleDisconnectYouTube = async () => {
        setIsConnectingYouTube(true);
        try {
            const res = await fetch('/api/auth/youtube/disconnect', { method: 'POST' });
            if (res.ok) {
                window.location.reload();
            } else {
                throw new Error('Failed to disconnect');
            }
        } catch (err) {
            console.error('Failed to disconnect YouTube:', err);
            setError('Failed to disconnect YouTube account');
        } finally {
            setIsConnectingYouTube(false);
        }
    };

    const handleOpenPublishModal = async () => {
        if (!project || !script) return;

        if (project.seoMetadata) {
            setPublishMetadata({
                title: project.seoMetadata.selectedTitle || project.seoMetadata.titles[0] || project.title,
                description: project.seoMetadata.description || project.description || '',
                tags: project.seoMetadata.tags || []
            });
            setIsPublishModalOpen(true);
            return;
        }

        if (project.status === 'publishing') {
            setPublishMetadata({
                title: project.title,
                description: project.description || '',
                tags: []
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
            console.error('Metadata error:', err);
            setError(err.message);
        } finally {
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
                body: JSON.stringify({ metadata })
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
        if (!project || project.status !== 'publishing') {
            setIsPublishModalOpen(false);
            return;
        }

        try {
            await fetch(`/api/projects/${project.id}/youtube/cancel`, { method: 'POST' });
            setIsPublishModalOpen(false);
        } catch (err) {
            console.error('Failed to cancel publishing:', err);
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
        handleOptimizeViral
    };
};
