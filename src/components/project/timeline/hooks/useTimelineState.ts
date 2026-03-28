import { useState, useCallback, useMemo, useEffect } from 'react';
import { Script, VisualCue } from '@/types';
import { videoEngine, Scene } from '@/lib/services/video-engine';

export interface TimelineClipData extends Scene {
    trackId: 'video' | 'broll' | 'audio';
}

const DEFAULT_ZOOM = 40; // px per second
const MIN_ZOOM = 10;
const MAX_ZOOM = 160;

export function useTimelineState(script: Script) {
    const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    
    // overrides: cueId -> { timestamp?, overrideDuration?, trackId? }
    const [overrides, setOverrides] = useState<Record<string, Partial<VisualCue>>>({});
    
    // History Stack for Undo/Redo
    const [history, setHistory] = useState<Record<string, Partial<VisualCue>>[]>([]);
    const [future, setFuture] = useState<Record<string, Partial<VisualCue>>[]>([]);
    
    // Clipboard for Copy/Paste
    const [clipboard, setClipboard] = useState<Partial<VisualCue> | null>(null);

    console.log(`%c !!! [useTimelineState] UNDO SYSTEM v2.1 LOADED !!! %c`, 'background: #1e3a8a; color: #60a5fa; font-weight: bold; padding: 4px;', '');
    console.log(`[useTimelineState] Hook processing script: ${script.id} with ${script.sections.length} sections`);

    // Reset local state if script ID changes
    useEffect(() => {
        console.log(`[useTimelineState] Script ID changed to ${script.id} - resetting overrides and history`);
        setOverrides({});
        setHistory([]);
        setFuture([]);
        setSelectedClipId(null);
    }, [script.id]);

    const baseTimeline = useMemo(() => {
        console.log(`[useTimelineState] Calculating base timeline...`);
        try {
            const scriptWithOverrides: Script = {
                ...script,
                sections: script.sections.map(section => ({
                    ...section,
                    visualCues: section.visualCues?.map(cue => ({
                        ...cue,
                        ...(overrides[cue.id] || {})
                    }))
                }))
            };

            const timeline = videoEngine.calculateTimeline(scriptWithOverrides);
            console.log(`[useTimelineState] - Generated ${timeline.length} clips`);
            return timeline;
        } catch (error) {
            console.error('[useTimelineState] Error calculating timeline:', error);
            return [];
        }
    }, [script, overrides]);

    const clips: TimelineClipData[] = useMemo(() =>
        baseTimeline.map(scene => {
            // Find the original cue to see if it has a trackId or if it's in overrides
            let trackId: 'video' | 'broll' | 'audio' = 'video';
            
            // 1. Check overrides
            if (overrides[scene.id]?.trackId) {
                trackId = overrides[scene.id].trackId as any;
            } else {
                // 2. Check original script
                for (const section of script.sections) {
                    const cue = section.visualCues?.find(c => c.id === scene.id);
                    if (cue?.trackId) {
                        trackId = cue.trackId;
                        break;
                    }
                    if (cue?.sfxUrl) {
                        trackId = 'audio';
                        break;
                    }
                }
            }

            return {
                ...scene,
                trackId,
            };
        }),
        [baseTimeline, overrides, script.sections]
    );

    const totalDuration = clips.length > 0
        ? clips[clips.length - 1].startTime + clips[clips.length - 1].duration
        : 0;

    const applyOverride = useCallback((cueId: string, patch: Partial<VisualCue>, shouldPushHistory = true) => {
        console.log(`[useTimelineState] applyOverride: ${cueId}`, patch);
        
        if (shouldPushHistory) {
            const snapshot = JSON.stringify(overrides);
            const lastSnapshot = history.length > 0 ? JSON.stringify(history[0]) : null;
            if (snapshot !== lastSnapshot) {
                console.log(`[useTimelineState] Pushing history. Depth will be: ${history.length + 1}`);
                setHistory(prev => [JSON.parse(snapshot), ...prev].slice(0, 50));
                setFuture([]); // Clear future on new action
            }
        }
        
        setOverrides(prev => ({ ...prev, [cueId]: { ...(prev[cueId] || {}), ...patch } }));
    }, [overrides]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        console.log(`[useTimelineState] Undo triggered. History depth: ${history.length}`);
        const [last, ...rest] = history;
        setFuture(prev => [overrides, ...prev].slice(0, 50));
        setOverrides(last);
        setHistory(rest);
    }, [history, overrides]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        console.log(`[useTimelineState] Redo triggered. Future depth: ${future.length}`);
        const [next, ...rest] = future;
        setHistory(prev => [overrides, ...prev].slice(0, 50));
        setOverrides(next);
        setFuture(rest);
    }, [future, overrides]);

    const removeOverride = useCallback((cueId: string, shouldPushHistory = true) => {
        console.log(`[useTimelineState] removeOverride: ${cueId}`);
        if (shouldPushHistory) {
            setHistory(prev => [JSON.parse(JSON.stringify(overrides)), ...prev].slice(0, 50));
            setFuture([]);
        }
        setOverrides(prev => {
            const next = { ...prev };
            delete next[cueId];
            return next;
        });
    }, [overrides]);

    const clearOverrides = useCallback(() => setOverrides({}), []);

    /** 
     * Reset the timeline to narration ground-truth.
     * Clears all local overrides AND generates a cleaned script for the parent.
     */
    const resetToClassic = useCallback((): Script => {
        setOverrides({});
        setSelectedClipId(null);
        
        return {
            ...script,
            sections: script.sections.map(section => ({
                ...section,
                visualCues: (section.visualCues || []).map(cue => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { overrideDuration, inPoint, outPoint, trackId, ...rest } = cue;
                    return rest as VisualCue;
                })
            }))
        };
    }, [script]);

    /** 
     * Flush local overrides back to the Script so parent can save.
     * Supports cross-section movement by re-calculating which section 
     * each cue belongs to based on its global startTime.
     */
    const buildUpdatedScript = useCallback((): Script => {
        // 1. Calculate section boundaries (Global offsets)
        let offset = 0;
        const sectionBoundaries = script.sections.map(s => {
            const start = offset;
            const dur = Math.max(s.estimatedDuration || 5, 5);
            offset += dur;
            return { id: s.id, start, end: offset };
        });

        // 2. Collect all cues and apply overrides
        const allCuesWithGlobalTime = script.sections.flatMap(section => {
            const boundary = sectionBoundaries.find(b => b.id === section.id);
            const sectionStart = boundary?.start ?? 0;
            
            return (section.visualCues || []).map(cue => {
                const patch = overrides[cue.id] || {};
                const updatedCue = { ...cue, ...patch };
                // Calculate global start time
                // Use higher precision for global time calculation to avoid jitter
                const globalStart = Math.max(0, sectionStart + (patch.timestamp ?? cue.timestamp));
                return { updatedCue, globalStart, originalSectionId: section.id };
            });
        });

        // console.log(`[useTimelineState:buildUpdatedScript] Re-distributing ${allCuesWithGlobalTime.length} cues across ${script.sections.length} sections`);

        // 3. Re-distribute cues into their new sections
        return {
            ...script,
            sections: script.sections.map((section, idx) => {
                const boundary = sectionBoundaries[idx];
                const isLast = idx === sectionBoundaries.length - 1;
                const isFirst = idx === 0;

                const sectionCues = allCuesWithGlobalTime
                    .filter(item => {
                        // Logic: A cue belongs to this section if its global start is within boundaries
                        // Capture everything < start in the first section
                        // Capture everything >= end in the last section
                        const match = (isFirst && item.globalStart < boundary.start) || 
                                      (item.globalStart >= boundary.start && (isLast || item.globalStart < boundary.end));
                        return match;
                    })
                    .map(item => {
                        // Calculate new relative timestamp
                        const newRelTimestamp = Math.max(0, item.globalStart - boundary.start);
                        
                        // Clean up the cue data
                        const cleanedCue = {
                            ...item.updatedCue,
                            timestamp: newRelTimestamp
                        };

                        // Strip undefineds
                        return Object.fromEntries(
                            Object.entries(cleanedCue).filter(([_, v]) => v !== undefined)
                        ) as any as VisualCue;
                    });

                return {
                    ...section,
                    visualCues: sectionCues
                };
            })
        };
    }, [script, overrides]);

    const zoomIn = useCallback(() => setZoomLevel(z => Math.min(MAX_ZOOM, z * 1.5)), []);
    const zoomOut = useCallback(() => setZoomLevel(z => Math.max(MIN_ZOOM, z / 1.5)), []);
    const resetZoom = useCallback(() => setZoomLevel(DEFAULT_ZOOM), []);

    return {
        clips,
        totalDuration,
        zoomLevel,
        selectedClipId,
        setSelectedClipId,
        applyOverride,
        removeOverride,
        overrides,
        resetToClassic,
        buildUpdatedScript,
        clearOverrides,
        zoomIn,
        zoomOut,
        resetZoom,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: future.length > 0,
        historyDepth: history.length,
        futureDepth: future.length,
        clipboard,
        setClipboard
    };
}
