import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Script, UsageLog } from '@/types';
import { projectService } from '@/lib/services/firestore';
import { scriptService } from '@/lib/services/script';
import { fetchUsageLogs } from '@/app/actions/analytics';
import { calculateProjectBudget } from '@/lib/services/analytics';
import { AMBIANCE_LAYERS, SOUND_EFFECTS } from '@/lib/services/audio';

interface UseProjectSyncProps {
    projectId: string;
    currentUser: any;
    authLoading: boolean;
    isPublishModalOpen: boolean;
    handleOpenPublishModal: () => void;
}

export const useProjectSync = ({
    projectId,
    currentUser,
    authLoading,
    isPublishModalOpen,
    handleOpenPublishModal
}: UseProjectSyncProps) => {
    const [project, setProject] = useState<Project | null>(null);
    const [script, setScript] = useState<Script | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [availableTranslations, setAvailableTranslations] = useState<{ language: string; scriptId: string }[]>([]);
    const [projectCost, setProjectCost] = useState(0);
    const [projectedTotal, setProjectedTotal] = useState(0);
    const [costLogs, setCostLogs] = useState<UsageLog[]>([]);
    const [dubbingProgress, setDubbingProgress] = useState<Record<string, number>>({});

    const isPublishModalOpenRef = useRef(isPublishModalOpen);
    useEffect(() => {
        isPublishModalOpenRef.current = isPublishModalOpen;
    }, [isPublishModalOpen]);

    const repairLegacyAudio = async (proj: Project, scr: Script | null) => {
        let projectNeedsUpdate = false;
        let scriptNeedsUpdate = false;

        if (proj.ambianceUrl?.includes('pixabay.com') || proj.ambianceUrl?.includes('soundbible.com')) {
            const match = AMBIANCE_LAYERS.find(a => a.label === proj.ambianceLabel);
            if (match) {
                proj.ambianceUrl = match.url;
                projectNeedsUpdate = true;
            }
        }

        if (scr) {
            scr.sections.forEach(section => {
                section.visualCues?.forEach(cue => {
                    if (cue.sfxUrl?.includes('pixabay.com') || cue.sfxUrl?.includes('soundbible.com')) {
                        const match = SOUND_EFFECTS.find(s => s.label === cue.sfxLabel);
                        if (match) {
                            cue.sfxUrl = match.url;
                            scriptNeedsUpdate = true;
                        }
                    }
                });
            });
        }

        if (proj.subtitlesEnabled === undefined) {
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

    const loadProjectAndScript = async (preserveCurrentScript = false) => {
        if (!projectId) return;
        try {
            let projectData: Project | null = null;
            const isMockUser = currentUser?.id === 'mock-user-123';

            if (isMockUser) {
                const res = await fetch(`/api/projects/${projectId}`);
                if (res.ok) projectData = await res.json();
            } else {
                projectData = await projectService.getProject(projectId);
            }

            if (projectData) {
                setProject(projectData);
                setAvailableTranslations(projectData.translations || []);

                let currentScript = script;

                if (projectData.currentScriptId && !preserveCurrentScript) {
                    let scriptData: Script | null = null;
                    if (isMockUser) {
                        const res = await fetch(`/api/projects/${projectId}/script`);
                        if (res.ok) scriptData = await res.json();
                    } else {
                        scriptData = await scriptService.getScript(projectData.currentScriptId);
                    }

                    if (scriptData) {
                        setScript(scriptData);
                        currentScript = scriptData;
                        await repairLegacyAudio(projectData, scriptData);
                    }
                }

                if (currentUser) {
                    const logs = await fetchUsageLogs(currentUser.id, 100, projectId);
                    setCostLogs(logs);
                    const totalSpent = logs.reduce((sum, log) => sum + (log.creditsDeducted || 0), 0);
                    setProjectCost(totalSpent);

                    if (currentScript) {
                        const charCount = currentScript.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 0;
                        const budget = calculateProjectBudget(charCount, logs);
                        setProjectedTotal(budget.projectedTotal);
                    }
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

    // Main sync effect for project
    useEffect(() => {
        if (!projectId || authLoading) return;

        loadProjectAndScript();

        let unsubscribe = () => { };
        let pollingInterval: NodeJS.Timeout;
        const isMockUser = currentUser?.id === 'mock-user-123';

        if (!currentUser && !authLoading) return;

        if (isMockUser) {
            pollingInterval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/projects/${projectId}`);
                    if (res.ok) {
                        const data = await res.json() as Project;
                        setProject(prev => {
                            if (JSON.stringify(prev) !== JSON.stringify(data)) {
                                return data;
                            }
                            return prev;
                        });
                        
                        // In mock mode, if generating media, we also need to refresh the script data occasionally
                        const isGenerating = data.status === 'generating_media' || data.status === 'assembling' || data.status === 'rendering';
                        if (data.currentScriptId && (isGenerating || !script || script.id !== data.currentScriptId)) {
                            // We don't want to load everything every 3s, but for mock demo we can refresh script specifically
                            loadProjectAndScript(true);
                        }
                    }
                } catch (e) {
                    console.error('[ProjectSync] Polling error:', e);
                }
            }, 3000);
        } else if (currentUser) {
            unsubscribe = onSnapshot(doc(db, 'projects', projectId),
                (snapshot) => {
                    if (snapshot.exists()) {
                        console.log('[ProjectSync] Successfully synced project:', snapshot.id);
                        const data = { ...snapshot.data() as Project, id: snapshot.id };
                        setProject(prev => {
                            if (JSON.stringify(prev) !== JSON.stringify(data)) {
                                return data;
                            }
                            return prev;
                        });
                    }
                },
                (error) => {
                    if (error.code === 'permission-denied') {
                        console.error('[ProjectSync] Permission denied for project:', projectId);
                        setError('Missing or insufficient permissions for this project.');
                    } else {
                        console.error('[ProjectSync] Listener error:', error);
                        setError('Failed to sync project data: ' + error.message);
                    }
                    unsubscribe();
                }
            );
        }

        return () => {
            unsubscribe();
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [projectId, currentUser?.id, authLoading]);

    // Script listener for real-time updates (important for visual synthesis)
    useEffect(() => {
        if (!project?.currentScriptId || authLoading || currentUser?.id === 'mock-user-123') return;

        const unsubscribe = onSnapshot(doc(db, 'scripts', project.currentScriptId),
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = { ...snapshot.data() as Script, id: snapshot.id };
                    console.log('[ScriptSync] Successfully synced script:', data.title || data.id);
                    setScript(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(data)) {
                            return data;
                        }
                        return prev;
                    });
                }
            },
            (error) => {
                if (error.code === 'permission-denied') {
                    console.error('[ScriptSync] Permission denied for script:', project?.currentScriptId);
                    setError('Missing or insufficient permissions for the project script.');
                } else {
                    console.error('[ScriptSync] Listener error:', error);
                }
            }
        );

        return () => unsubscribe();
    }, [project?.currentScriptId, currentUser?.id, authLoading]);

    // Background status polling - REMOVED: conflicting with onSnapshot
    // Real-time updates are handled by the main sync effect above.
    /* 
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (project?.status === 'rendering' || project?.status === 'generating_media' || project?.status === 'publishing') {
            interval = setInterval(async () => {
                const refreshedProject = await projectService.getProject(projectId);
                if (refreshedProject) {
                    setProject(refreshedProject);
                    if (!['rendering', 'generating_media', 'publishing'].includes(refreshedProject.status)) {
                        clearInterval(interval);
                        if (['ready', 'assembling', 'published'].includes(refreshedProject.status)) {
                            await loadProjectAndScript();
                        }
                    }
                }
            }, 2000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [project?.status, projectId]);
    */

    // Dubbing progress polling
    useEffect(() => {
        const activeLanguages = Object.keys(dubbingProgress);
        if (activeLanguages.length === 0) return;

        const interval = setInterval(async () => {
            for (const lang of activeLanguages) {
                const translation = availableTranslations.find(t => t.language === lang);
                if (!translation) continue;
                try {
                    const scr = await scriptService.getScript(translation.scriptId);
                    if (scr) {
                        const totalSections = scr.sections.length;
                        const readySections = scr.sections.filter(s => s.audioStatus === 'ready').length;
                        const progress = Math.round((readySections / totalSections) * 100);
                        setDubbingProgress(prev => {
                            if (progress >= 100) {
                                const next = { ...prev };
                                delete next[lang];
                                return next;
                            }
                            return { ...prev, [lang]: progress };
                        });
                        if (progress >= 100 && script?.id === translation.scriptId) {
                            await loadProjectAndScript();
                        }
                    }
                } catch (err) {
                    console.error(`Failed to poll dubbing progress for ${lang}`, err);
                }
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [dubbingProgress, availableTranslations, script?.id]);

    return {
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
        loadProjectAndScript,
        isPublishModalOpenRef
    };
};
