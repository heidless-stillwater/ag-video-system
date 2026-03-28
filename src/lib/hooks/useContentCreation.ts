import { useState, useRef, useEffect } from 'react';
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
    researchLogs: any[];
    researchPersona: string;
    setResearchPersona: (persona: string) => void;
    handleLaunchResearch: () => Promise<void>;
    handleCancelResearch: () => Promise<void>;
    handleGenerateScript: (config?: any) => Promise<boolean>;
    handleGenerateSoundDesign: () => Promise<void>;
    handleGenerateAudio: (sectionId: string) => Promise<void>;
    handleMusicSelect: (trackId: string) => Promise<void>;
    handleAmbianceSelect: (layerId: string) => Promise<void>;
    handleVolumeChange: (type: any, value: any) => Promise<void>;
    handleSubtitleToggle: () => Promise<void>;
    handleSubtitleStyleChange: (style: any) => Promise<void>;
    onRegenerateAll: (voiceProfile?: Project['voiceProfile']) => Promise<void>;
    onUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    onUpdateTTSEngine: (engine: Project['ttsEngine']) => Promise<void>;
    handleGenerateAllAudio: () => Promise<void>;
    handleUpdateVoiceProfile: (profile: Project['voiceProfile']) => Promise<void>;
    isGenerating: boolean;
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
    const [researchLogs, setResearchLogs] = useState<any[]>([]);
    const [researchPersona, setResearchPersona] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('last_research_persona');
            if (saved) return saved;
        }
        return project?.research?.persona || 'standard';
    });
    const [isScripting, setIsScripting] = useState(false);
    const [isSoundDesigning, setIsSoundDesigning] = useState(false);
    const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
    const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState(false);
    const [isGeneratingShortsCandidates, setIsGeneratingShortsCandidates] = useState(false);
    const [isDubbing, setIsDubbing] = useState(false);
    const researchAbortControllerRef = useRef<AbortController | null>(null);

    // Sync persona with project data when it loads
    useEffect(() => {
        if (project?.research?.persona && project.research.persona !== researchPersona) {
            setResearchPersona(project.research.persona);
        }
    }, [project?.id, project?.research?.persona]);

    // Save persona to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined' && researchPersona) {
            localStorage.getItem('last_research_persona') !== researchPersona && 
            localStorage.setItem('last_research_persona', researchPersona);
        }
    }, [researchPersona]);

    const handleLaunchResearch = async (onComplete?: () => void) => {
        if (!project) return;
        setIsResearching(true);
        setResearchLogs([]);
        setError(null);

        const controller = new AbortController();
        researchAbortControllerRef.current = controller;

        try {
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    projectId: project.id,
                    topic: project.title,
                    persona: researchPersona
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to start research');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No stream available');

            const decoder = new TextDecoder();
            let buffer = '';
            let completedSuccessfully = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const log = JSON.parse(line.slice(6));
                            setResearchLogs(prev => [...prev, log]);
                        } catch (e) {
                            console.error('Failed to parse log:', e);
                        }
                    } else if (line.startsWith('event: complete')) {
                        // Research completed successfully — DB is already updated server-side
                        await loadProjectAndScript();
                        
                        // Small aesthetic delay before auto-closing
                        if (onComplete) {
                            setTimeout(onComplete, 1500);
                        }
                    }
                }
            }

            // Always reload after stream ends in case 'event: complete' was never sent
            // (e.g. server-side error closed the stream early)
            if (!completedSuccessfully) {
                console.warn('[Research] Stream ended without event: complete. Reloading project to surface any partial results.');
                await loadProjectAndScript();
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Research aborted by user');
            } else {
                setError(err.message);
            }
        } finally {
            setIsResearching(false);
            researchAbortControllerRef.current = null;
        }
    };

    const handleCancelResearch = async () => {
        if (researchAbortControllerRef.current) {
            researchAbortControllerRef.current.abort();
        }
        setIsResearching(false);
    };

    const handleGenerateScript = async (config?: any) => {
        if (!project) return false;
        setIsScripting(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    persona: config?.persona || researchPersona,
                    config: config 
                })
            });

            if (res.ok) {
                await loadProjectAndScript();
                return true;
            } else {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 402 || errorData.requiresCredits) {
                    throw new Error('You don\'t have enough credits to generate a script. Please top up your balance.');
                }
                throw new Error(errorData.error || 'Something went wrong while generating your script. Please try again.');
            }
        } catch (err: any) {
            setError(err.message);
            return false;
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
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 402 || errorData.requiresCredits) {
                    throw new Error('You don\'t have enough credits for sound design. Please top up your balance.');
                }
                throw new Error(errorData.error || 'Something went wrong while creating sound design. Please try again.');
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
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 402 || errorData.requiresCredits) {
                    throw new Error('You don\'t have enough credits to generate audio. Please top up your balance.');
                }
                throw new Error(errorData.error || 'Something went wrong while generating audio. Please try again.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGeneratingAudioId(null);
        }
    };

    const onRegenerateAll = async (voiceProfile?: Project['voiceProfile']) => {
        if (!project || !script) return;
        setIsGeneratingAllAudio(true);
        try {
            // Iterate over all sections to force regeneration
            for (const section of script.sections) {
                await handleGenerateAudio(section.id);
            }
        } finally {
            setIsGeneratingAllAudio(false);
        }
    };

    const handleGenerateAllAudio = async () => {
        await onRegenerateAll();
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

    const handleVolumeChange = async (type: 'narrationVolume' | 'backgroundMusicVolume' | 'ambianceVolume' | 'globalSfxVolume' | 'videoVolume' | 'autoDucking', value: number | boolean) => {
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

    const onUpdateVoiceProfile = async (profile: Project['voiceProfile']) => {
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

    const handleUpdateVoiceProfile = async (profile: Project['voiceProfile']) => {
        await onUpdateVoiceProfile(profile);
    };

    const onUpdateTTSEngine = async (engine: Project['ttsEngine']) => {
        if (!project) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ttsEngine: engine })
            });
            if (res.ok) await loadProjectAndScript();
        } catch (err) {
            console.error('Failed to update TTS engine:', err);
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

    const isGenerating = isGeneratingAllAudio || !!generatingAudioId;

    return {
        isResearching,
        researchLogs,
        researchPersona,
        setResearchPersona,
        isScripting,
        isSoundDesigning,
        generatingAudioId,
        isGeneratingAllAudio,
        handleLaunchResearch,
        handleCancelResearch,
        handleGenerateScript,
        handleGenerateSoundDesign,
        handleGenerateAudio,
        onRegenerateAll,
        handleGenerateAllAudio,
        handleMusicSelect,
        handleAmbianceSelect,
        handleVolumeChange,
        handleSubtitleToggle,
        handleSubtitleStyleChange,
        onUpdateVoiceProfile,
        handleUpdateVoiceProfile,
        onUpdateTTSEngine,
        isGenerating,
        isGeneratingShortsCandidates,
        handleGenerateShortsCandidates,
        handleRenderShort,
        isDubbing,
        setIsDubbing,
        confirmDubbing,
        handleCancelDubbing
    };
};
