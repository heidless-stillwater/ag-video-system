import { useState, useEffect } from 'react';
import { Project, Script, SavedRender, VisualStyle } from '@/types';

interface UseMediaActionsProps {
    project: Project | null;
    script: Script | null;
    loadProjectAndScript: (preserve?: boolean) => Promise<void>;
    setError: (error: string | null) => void;
    setProject: (project: Project | null) => void;
}

interface UseMediaActionsReturn {
    isGeneratingMedia: boolean;
    isAssembling: boolean;
    isRendering: boolean;
    isDownloading: boolean;
    handleGenerateMedia: (config?: any) => Promise<void>;
    handleCancelMedia: () => Promise<void>;
    handleAssemble: () => Promise<void>;
    handleDownloadMP4: () => Promise<void>;
    handleKillRender: () => Promise<void>;
    handleSnapshotAndReset: (label: string) => Promise<void>;
    handleResetToAssembling: () => Promise<void>;
    handleRevertToReady: () => Promise<void>;
    handleRevertToScripting: () => Promise<void>;
    handleSkipToAssembly: () => Promise<void>;
    handleLoadSavedRender: (render: SavedRender) => Promise<void>;
    executeRender: (scriptId: string) => Promise<void>;
    handleUpdateProject: (updates: Partial<Project>) => Promise<void>;
    handleUpdateStyle: (style: VisualStyle) => Promise<void>;
    handleSnapshot: (label?: string) => Promise<boolean>;
    handleRevert: (snapshotId: string) => Promise<void>;
    isUpdatingProject: boolean;
}

export const useMediaActions = ({
    project,
    script,
    loadProjectAndScript,
    setError,
    setProject
}: UseMediaActionsProps): UseMediaActionsReturn => {
    const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
    const [isAssembling, setIsAssembling] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUpdatingProject, setIsUpdatingProject] = useState(false);

    // Reset local loading state when project status confirms the action
    useEffect(() => {
        if (project?.status === 'generating_media') {
            setIsGeneratingMedia(false);
        }
    }, [project?.status]);

    const handleGenerateMedia = async (config?: any) => {
        if (!project || !script) return;
        setIsGeneratingMedia(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id, config })
            });
            if (!res.ok) throw new Error('Failed to start media generation');
        } catch (err: any) {
            setError(err.message);
            setIsGeneratingMedia(false);
        }
    };

    const handleCancelMedia = async () => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/media/cancel`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to cancel media generation');
            await loadProjectAndScript();
        } catch (err: any) {
            console.error('Failed to cancel media:', err);
            setError('Failed to abort synthesis. Please refresh.');
        }
    };

    const handleAssemble = async () => {
        if (!project || !script) return;
        setIsAssembling(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/assemble`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.timeline) {
                    // Timeline will be picked up by the listener in page.tsx
                }
            } else {
                throw new Error('Failed to assemble documentary');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsAssembling(false);
        }
    };

    const handleDownloadMP4 = async () => {
        if (!project?.downloadUrl) return;
        setIsDownloading(true);
        try {
            const response = await fetch(project.downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.title.toLowerCase().replace(/\s+/g, '-')}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            setError('Failed to download video file');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleKillRender = async () => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/kill`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to kill render process');
            await loadProjectAndScript();
        } catch (err: any) {
            console.error('Failed to kill render:', err);
            setError('Failed to terminate bake. Please refresh.');
        }
    };

    const handleSnapshotAndReset = async (label: string) => {
        if (!project || !project.downloadUrl) return;
        try {
            await fetch(`/api/projects/${project.id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label, url: project.downloadUrl })
            });
            await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to archive:', err);
        }
    };

    const handleResetToAssembling = async () => {
        if (!project) return;
        try {
            await fetch(`/api/projects/${project.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'assembling', downloadUrl: null })
            });
            await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to reset status:', err);
        }
    };

    const handleRevertToReady = async () => {
        if (!project) return;
        try {
            await fetch(`/api/projects/${project.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ready' })
            });
            await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to revert status:', err);
        }
    };

    const handleRevertToScripting = async () => {
        if (!project) return;
        try {
            await fetch(`/api/projects/${project.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'scripting' })
            });
            await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to revert to scripting:', err);
            setError('Failed to update project status');
        }
    };

    const handleSkipToAssembly = async () => {
        if (!project) return;
        try {
            await fetch(`/api/projects/${project.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'assembling' })
            });
            await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to skip to assembly:', err);
            setError('Failed to update project status');
        }
    };

    const handleLoadSavedRender = async (render: SavedRender) => {
        if (!project) return;
        try {
            await fetch(`/api/projects/${project.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'ready',
                    downloadUrl: render.url,
                    renderProgress: 100,
                    activeRenderId: null
                })
            });
            await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to load saved render:', err);
        }
    };

    const executeRender = async (scriptId: string) => {
        if (!project) return;
        setIsRendering(true);
        setError(null);
        try {
            const response = await fetch(`/api/projects/${project.id}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Rendering failed');
            }
            await loadProjectAndScript();
        } catch (err: any) {
            setError('Render failed: ' + err.message);
        } finally {
            setIsRendering(false);
        }
    };
    const handleUpdateProject = async (updates: Partial<Project>) => {
        if (!project) return;
        setIsUpdatingProject(true);
        try {
            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                await loadProjectAndScript();
                setProject({ ...project, ...updates });
            }
        } catch (err) {
            console.error('Failed to update project:', err);
        } finally {
            setIsUpdatingProject(false);
        }
    };

    const handleUpdateStyle = async (style: VisualStyle) => {
        await handleUpdateProject({ visualStyle: style });
    };

    const handleSnapshot = async (label?: string) => {
        if (!project) return false;
        try {
            const res = await fetch(`/api/projects/${project.id}/visuals/snapshots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label })
            });

            if (res.ok) {
                await loadProjectAndScript();
                return true;
            }
        } catch (err) {
            console.error('Snapshot error:', err);
        }
        return false;
    };

    const handleRevert = async (snapshotId: string) => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/visuals/revert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshotId })
            });

            if (res.ok) {
                await loadProjectAndScript();
            } else {
                throw new Error('Restore failed');
            }
        } catch (err: any) {
            setError('Restore Error: ' + err.message);
        }
    };

    return {
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
        handleRevertToScripting,
        handleLoadSavedRender,
        executeRender,
        handleUpdateProject,
        handleUpdateStyle,
        handleSnapshot,
        handleRevert,
        isUpdatingProject
    };
};
