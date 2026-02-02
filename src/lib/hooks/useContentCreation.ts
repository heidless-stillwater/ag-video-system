import { useState } from 'react';
import { Project, Script } from '@/types';

interface UseContentCreationProps {
    project: Project | null;
    script: Script | null;
    loadProjectAndScript: (preserve?: boolean) => Promise<void>;
    setError: (error: string | null) => void;
}

interface UseContentCreationReturn {
    isResearching: boolean;
    isScripting: boolean;
    isSoundDesigning: boolean;
    generatingAudioId: string | null;
    isGeneratingAllAudio: boolean;
    handleLaunchResearch: () => Promise<void>;
    handleGenerateScript: () => Promise<void>;
    handleGenerateSoundDesign: () => Promise<void>;
    handleGenerateAudio: (sectionId: string) => Promise<void>;
    handleGenerateAllAudio: () => Promise<void>;
    handleMusicSelect: (trackId: string) => Promise<void>;
    handleAmbianceSelect: (layerId: string) => Promise<void>;
    handleVolumeChange: (type: any, value: any) => Promise<void>;
    handleSubtitleToggle: () => Promise<void>;
    handleSubtitleStyleChange: (style: any) => Promise<void>;
    handleUpdateVoiceProfile: (profile: any) => Promise<void>;
    isGeneratingShortsCandidates: boolean;
    handleGenerateShortsCandidates: () => Promise<void>;
    handleRenderShort: (clipId: string) => Promise<void>;
    isDubbing: boolean;
    setIsDubbing: (isDubbing: boolean) => void;
    confirmDubbing: (languageCode: string) => Promise<void>;
    handleCancelDubbing: () => Promise<void>;
}

export const useContentCreation = ({
    project,
    script,
    loadProjectAndScript,
    setError
}: UseContentCreationProps): UseContentCreationReturn => {
    const [isResearching, setIsResearching] = useState(false);
    const [isScripting, setIsScripting] = useState(false);
    const [isSoundDesigning, setIsSoundDesigning] = useState(false);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState(false);
    const [isGeneratingShortsCandidates, setIsGeneratingShortsCandidates] = useState(false);
    const [isDubbing, setIsDubbing] = useState(false);

    const handleLaunchResearch = async () => {
        if (!project) return;
        setIsResearching(true);
        setError(null);
        try {
            const res = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.id,
                    topic: project.title,
                    description: project.description
                })
            });

            if (res.ok) {
                await loadProjectAndScript();
            } else {
                throw new Error('Research orchestration failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsResearching(false);
        }
    };

    const handleGenerateScript = async () => {
        if (!project) return;
        setIsScripting(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/script`, {
                method: 'POST'
            });

            if (res.ok) {
                await loadProjectAndScript();
            } else {
                throw new Error('Script generation failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsScripting(false);
        }
    };

    const handleGenerateSoundDesign = async () => {
        if (!project || !script) return;
        setIsSoundDesigning(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/sound-design`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id })
            });

            if (res.ok) {
                await loadProjectAndScript();
            } else {
                throw new Error('Sound design orchestration failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSoundDesigning(false);
        }
    };

    const handleGenerateAudio = async (sectionId: string) => {
        if (!project || !script) return;
        setGeneratingAudioId(sectionId);
        try {
            const response = await fetch(`/api/projects/${project.id}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sectionId, scriptId: script.id })
            });

            if (response.ok) {
                await loadProjectAndScript();
            } else {
                throw new Error('Audio generation failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGeneratingAudioId(null);
        }
    };

    const handleGenerateAllAudio = async () => {
        if (!project || !script) return;
        setIsGeneratingAllAudio(true);
        try {
            const sectionsToGenerate = script.sections.filter(s => !s.audioUrl);
            for (const section of sectionsToGenerate) {
                await handleGenerateAudio(section.id);
            }
        } finally {
            setIsGeneratingAllAudio(false);
        }
    };

    const handleMusicSelect = async (trackId: string) => {
        if (!project) return;
        try {
            const AMBIENT_TRACKS = (await import('@/lib/services/audio')).AMBIENT_TRACKS;
            const track = AMBIENT_TRACKS.find(t => t.id === trackId);
            if (!track) return;

            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    backgroundMusicUrl: track.url,
                    backgroundMusicLabel: track.title
                })
            });

            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to update music:', err);
        }
    };

    const handleAmbianceSelect = async (layerId: string) => {
        if (!project) return;
        try {
            const AMBIANCE_LAYERS = (await import('@/lib/services/audio')).AMBIANCE_LAYERS;
            const layer = AMBIANCE_LAYERS.find(l => l.id === layerId);
            if (!layer) return;

            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ambianceUrl: layer.url,
                    ambianceLabel: layer.label
                })
            });

            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to update ambiance:', err);
        }
    };

    const handleVolumeChange = async (type: 'narrationVolume' | 'backgroundMusicVolume' | 'ambianceVolume' | 'globalSfxVolume' | 'autoDucking', value: number | boolean) => {
        if (!project) return;
        try {
            let updates: any = { [type]: value };
            if (type === 'autoDucking') {
                updates = {
                    audioSettings: {
                        ...(project.audioSettings || {}),
                        autoDucking: value
                    }
                };
            }

            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to update volume:', err);
        }
    };

    const handleSubtitleToggle = async () => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtitlesEnabled: !project.subtitlesEnabled })
            });
            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to toggle subtitles:', err);
        }
    };

    const handleSubtitleStyleChange = async (style: 'minimal' | 'classic' | 'bold') => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subtitleStyle: style })
            });
            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to change subtitle style:', err);
        }
    };

    const handleUpdateVoiceProfile = async (profile: Project['voiceProfile']) => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voiceProfile: profile })
            });
            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to update voice profile:', err);
        }
    };

    const handleGenerateShortsCandidates = async () => {
        if (!project || !script) return;
        setIsGeneratingShortsCandidates(true);
        try {
            const response = await fetch(`/api/projects/${project.id}/shorts/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id }),
            });
            const data = await response.json();
            if (data.success) {
                await loadProjectAndScript();
            } else {
                throw new Error(data.error || 'Failed to generate shorts');
            }
        } catch (err: any) {
            setError('Shorts Generation Error: ' + err.message);
        } finally {
            setIsGeneratingShortsCandidates(false);
        }
    };

    const handleRenderShort = async (clipId: string) => {
        if (!project || !script) return;
        try {
            const response = await fetch(`/api/projects/${project.id}/shorts/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: script.id, clipId }),
            });
            const data = await response.json();
            if (data.success) {
                await loadProjectAndScript();
            } else {
                throw new Error(data.error || 'Failed to start short render');
            }
        } catch (err: any) {
            setError('Short Render Error: ' + err.message);
        }
    };

    const confirmDubbing = async (languageCode: string) => {
        if (!project || !script) return;
        setIsDubbing(true);
        try {
            const response = await fetch(`/api/projects/${project.id}/dub`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetLanguage: languageCode,
                    currentScriptId: project.currentScriptId,
                    force: project.translations?.some(t => t.language === languageCode)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Dubbing failed');
            }

            await loadProjectAndScript();
        } catch (err: any) {
            setError('Dubbing Error: ' + err.message);
        } finally {
            setIsDubbing(false);
        }
    };

    const handleCancelDubbing = async () => {
        if (!project) return;
        try {
            const response = await fetch(`/api/projects/${project.id}/dub/cancel`, {
                method: 'POST'
            });
            if (response.ok) {
                await loadProjectAndScript();
            }
        } catch (err: any) {
            console.error('Failed to cancel dubbing:', err);
        }
    };

    return {
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
    };
};
