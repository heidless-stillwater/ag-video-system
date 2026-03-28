'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Script, VisualCue } from '@/types';
import { Film, Mic, Volume2, Music, Play, Pause, SkipBack, SkipForward, Square, Lock, Unlock, Eye, EyeOff, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useTimelineState } from './hooks/useTimelineState';
import { useTimelineShortcuts } from './hooks/useTimelineShortcuts';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineClip } from './TimelineClip';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { MediaBinPanel } from './MediaBinPanel';
import { ClipInspector } from './ClipInspector';
import { ClipTrimModal } from './ClipTrimModal';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveTimelineProps {
    script: Script;
    onScriptChange: (updatedScript: Script) => Promise<void>;
    onReset?: () => void;
    onDelete?: (id: string) => void;
    onFineTune?: (time: number) => void;
}

const RULER_INTERVAL_S = 5;

export const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({ 
    script, 
    onScriptChange,
    onReset,
    onDelete,
    onFineTune
}) => {
    // ─── State & Hooks ────────────────────────────────────────────────────────
    const {
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
        canUndo,
        canRedo,
        historyDepth,
        futureDepth,
        clipboard,
        setClipboard,
    } = useTimelineState(script);

    const [isMediaBinOpen, setIsMediaBinOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSnapEnabled, setIsSnapEnabled] = useState(true);

    const [trackStates, setTrackStates] = useState<Record<string, { locked: boolean; hidden: boolean }>>({
        video: { locked: false, hidden: false },
        broll: { locked: false, hidden: false },
        audio: { locked: false, hidden: false },
        voiceover: { locked: true, hidden: false }, // Voiceover is always locked
    });
    const [isInspectorModal, setIsInspectorModal] = useState(false);

    // Timeline Keyboard Shortcuts
    useTimelineShortcuts({
        selectedId: selectedClipId,
        onDeselect: () => setSelectedClipId(null),
        onDelete: () => {
            if (selectedClipId) handleDelete(selectedClipId);
        },
        onDuplicate: () => {
            if (selectedClipId) handleDuplicate(selectedClipId);
        },
        onToggleMute: () => {
            if (selectedClipId) {
                const clip = clips.find(c => c.id === selectedClipId);
                if (clip) {
                    const currentVol = clip.volume ?? 1;
                    handleVolumeChangeWithSave(selectedClipId, currentVol === 0 ? 1 : 0);
                }
            }
        },
        onTogglePlay: () => {
             handlePlayPause();
        },
        onUndo: undo,
        onRedo: redo,
        onCopy: () => {
            if (!selectedClipId) return;
            const clip = clips.find(c => c.id === selectedClipId);
            if (!clip) return;
            // Find the orignal cue data from the script and merge with overrides
            for (const section of script.sections) {
                const cue = section.visualCues?.find(c => c.id === selectedClipId);
                if (cue) {
                    const merged = { ...cue, ...(overrides[selectedClipId] || {}) };
                    setClipboard(merged);
                    console.log('[Clipboard] Copied:', merged.id);
                    break;
                }
            }
        },
        onPaste: () => {
            if (!clipboard) return;
            const pasteId = `paste-${clipboard.id}-${Date.now()}`;
            // Find the latest end time on the same track to append after
            const trackId = (overrides[clipboard.id!]?.trackId ?? clipboard.trackId ?? 'video') as 'video' | 'broll' | 'audio';
            const trackClips = clips.filter(c => c.trackId === trackId).sort((a, b) => a.startTime - b.startTime);
            const lastClip = trackClips[trackClips.length - 1];
            const pasteTimestamp = lastClip ? lastClip.startTime + lastClip.duration + 0.5 : 0;

            const pasteCue: VisualCue = {
                ...clipboard,
                id: pasteId,
                timestamp: pasteTimestamp,
                trackId,
            } as VisualCue;

            const updated = buildUpdatedScript();
            // Append to the first section (or matching section)
            const targetSectionId = updated.sections[0]?.id;
            const updatedWithPaste: Script = {
                ...updated,
                sections: updated.sections.map(s => {
                    if (s.id !== targetSectionId) return s;
                    return { ...s, visualCues: [...(s.visualCues ?? []), pasteCue] };
                })
            };
            console.log('[Clipboard] Pasted as:', pasteId);
            applyOverride(pasteId, {}, true); // push history before paste
            onScriptChange(updatedWithPaste);
        }
    });

    // Auto-reset modal state when selection is cleared
    useEffect(() => {
        if (!selectedClipId) {
            setIsInspectorModal(false);
        }
    }, [selectedClipId]);

    const toggleTrackLock = (tid: string) => {
        setTrackStates(prev => ({ ...prev, [tid]: { ...prev[tid], locked: !prev[tid].locked } }));
    };
    const toggleTrackHidden = (tid: string) => {
        setTrackStates(prev => ({ ...prev, [tid]: { ...prev[tid], hidden: !prev[tid].hidden } }));
    };

    const animRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(0);

    // ─── Actions ─────────────────────────────────────────────────────────────
    const handleAddClip = useCallback(async (cue: VisualCue, trackId: string, timestamp?: number) => {
        const newClipId = `clip-${Date.now()}`;
        const finalTimestamp = timestamp ?? currentTime; 
        
        const updated = buildUpdatedScript();
        
        // Find which section this global timestamp belongs to
        let targetSectionId = script.sections[0]?.id;
        let cumulativeTime = 0;
        let relativeTimestamp = finalTimestamp;

        for (const section of script.sections) {
            const sectionDur = section.estimatedDuration || 5;
            if (finalTimestamp >= cumulativeTime && finalTimestamp < cumulativeTime + sectionDur) {
                targetSectionId = section.id;
                relativeTimestamp = finalTimestamp - cumulativeTime;
                break;
            }
            cumulativeTime += sectionDur;
            // If we're past the last section, we'll just put it in the last section but with a high timestamp
            targetSectionId = section.id;
            relativeTimestamp = finalTimestamp - (cumulativeTime - sectionDur);
        }
        
        const nextScript: Script = {
            ...updated,
            sections: updated.sections.map(s => {
                if (s.id !== targetSectionId) return s;
                return {
                    ...s,
                    visualCues: [...(s.visualCues || []), {
                        ...cue,
                        id: newClipId,
                        timestamp: relativeTimestamp,
                        trackId: trackId as 'video' | 'broll' | 'audio'
                    }]
                };
            })
        };
        await onScriptChange(nextScript);
    }, [currentTime, script.sections, buildUpdatedScript, onScriptChange]);

    const handleDrop = useCallback((e: React.DragEvent, trackId: string) => {
        if (trackStates[trackId]?.locked) return;
        e.preventDefault();
        try {
            const cueJson = e.dataTransfer.getData('cue');
            if (!cueJson) return;
            const cue = JSON.parse(cueJson) as VisualCue;
            
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const timestamp = getSnappedValue(x / zoomLevel);
            
            handleAddClip(cue, trackId, timestamp);
        } catch (err) {
            console.error('Failed to handle drop:', err);
        }
    }, [zoomLevel, handleAddClip]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const [isTrimModalOpen, setIsTrimModalOpen] = useState(false);

    const handleResetToClassic = useCallback(async () => {
        if (onReset) await onReset();
    }, [onReset]);

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isPlaying) {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            return;
        }
        const tick = (ts: number) => {
            if (lastTickRef.current === 0) lastTickRef.current = ts;
            const delta = (ts - lastTickRef.current) / 1000;
            lastTickRef.current = ts;
            setCurrentTime(prev => {
                const next = prev + delta;
                if (next >= totalDuration) { setIsPlaying(false); return totalDuration; }
                return next;
            });
            animRef.current = requestAnimationFrame(tick);
        };
        lastTickRef.current = performance.now();
        animRef.current = requestAnimationFrame(tick);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [isPlaying, totalDuration]);

    const handlePlayPause = () => {
        if (!isPlaying && currentTime >= totalDuration) setCurrentTime(0);
        setIsPlaying(p => !p);
    };
    const handleStop = () => { setIsPlaying(false); setCurrentTime(0); };
    const handleSeek = (s: number) => setCurrentTime(p => Math.max(0, Math.min(totalDuration, p + s)));
    const jumpToStart = () => { setCurrentTime(0); setIsPlaying(false); };
    const jumpToEnd = () => { setCurrentTime(totalDuration); setIsPlaying(false); };
    
    const jumpToPrevScene = () => {
        const sortedVideoClips = clips.filter(c => c.trackId === 'video').sort((a, b) => b.startTime - a.startTime);
        const target = sortedVideoClips.find(c => c.startTime < currentTime - 0.1);
        setCurrentTime(target ? target.startTime : 0);
    };
    
    const jumpToNextScene = () => {
        const sortedVideoClips = clips.filter(c => c.trackId === 'video').sort((a, b) => a.startTime - b.startTime);
        const target = sortedVideoClips.find(c => c.startTime > currentTime + 0.1);
        setCurrentTime(target ? target.startTime : totalDuration);
    };

    // Auto-select clip under playhead while playing (Viewer Mode)
    useEffect(() => {
        if (!isPlaying) return;
        
        // Prefer video track clips for the main viewer
        const activeClip = clips.find(c => 
            c.trackId === 'video' && 
            currentTime >= c.startTime && 
            currentTime < (c.startTime + c.duration)
        );
        
        if (activeClip && activeClip.id !== selectedClipId) {
            setSelectedClipId(activeClip.id);
        }
    }, [isPlaying, currentTime, clips, selectedClipId, setSelectedClipId]);

    // ─── Clip Logic ──────────────────────────────────────────────────────────
    // ─── Snapping Logic ──────────────────────────────────────────────────────
    const SNAP_THRESHOLD_PX = 10;
    
    const snapPoints = useMemo(() => {
        const points = new Set<number>();
        points.add(0);
        points.add(totalDuration);
        points.add(currentTime); // Snap to Playhead
        
        clips.forEach(c => {
            if (c.id === selectedClipId) return;
            points.add(c.startTime);
            points.add(c.startTime + c.duration);
        });
        
        let offset = 0;
        script.sections.forEach(s => {
            const dur = s.estimatedDuration || 5;
            points.add(offset);
            offset += dur;
            points.add(offset);
        });
        
        return Array.from(points);
    }, [totalDuration, clips, script.sections, selectedClipId]);

    const getSnappedValue = useCallback((valueSec: number) => {
        if (!isSnapEnabled) return valueSec;

        const thresholdSec = SNAP_THRESHOLD_PX / zoomLevel;
        let snapped = valueSec;
        let minDiff = thresholdSec;

        // 1. Point snapping (Clip edges, playhead, sections)
        for (const p of snapPoints) {
            const diff = Math.abs(valueSec - p);
            if (diff < minDiff) {
                minDiff = diff;
                snapped = p;
            }
        }

        // 2. Grid snapping (0.5s intervals) - only if we haven't snapped to a point already
        if (snapped === valueSec) {
            const gridInterval = 0.5;
            const gridSnapped = Math.round(valueSec / gridInterval) * gridInterval;
            if (Math.abs(valueSec - gridSnapped) < (0.2)) { // smaller threshold for grid
                snapped = gridSnapped;
            }
        }

        return snapped;
    }, [zoomLevel, snapPoints, isSnapEnabled]);


    const accumulatedY = useRef(0);
    const lastSelectedId = useRef<string | null>(null);

    const handleMove = useCallback((id: string, deltaTime: number, deltaY: number, startDuration?: number, shouldSnap = true, shouldPush = false) => {
        const clip = clips.find(c => c.id === id);
        if (!clip) return;
        
        const finalDuration = startDuration || clip.duration;
        let newAbsStart = Math.max(0, clip.startTime + deltaTime);

        // --- Vertical Track Dragging Logic ---
        if (lastSelectedId.current !== id) {
            accumulatedY.current = 0;
            lastSelectedId.current = id;
        }
        accumulatedY.current += deltaY;

        const tracks: { id: 'video' | 'broll' | 'audio' | 'voiceover'; h: number; locked?: boolean }[] = [
            { id: 'video', h: 96 },
            { id: 'broll', h: 64 },
            { id: 'voiceover', h: 64, locked: true },
            { id: 'audio', h: 56 },
        ];

        const currentTrackIdx = tracks.findIndex(t => t.id === clip.trackId);
        let targetTrackId: string = clip.trackId;

        // Threshold-based switching
        const THRESHOLD = 30; // Reduced for more sensitivity
        if (currentTrackIdx !== -1) {
            if (accumulatedY.current > THRESHOLD && currentTrackIdx < tracks.length - 1) {
                const jumpIdx = tracks[currentTrackIdx + 1].id === 'voiceover' ? currentTrackIdx + 2 : currentTrackIdx + 1;
                if (tracks[jumpIdx]) {
                    targetTrackId = tracks[jumpIdx].id;
                    accumulatedY.current = 0;
                }
            } else if (accumulatedY.current < -THRESHOLD && currentTrackIdx > 0) {
                const jumpIdx = tracks[currentTrackIdx - 1].id === 'voiceover' ? currentTrackIdx - 2 : currentTrackIdx - 1;
                if (tracks[jumpIdx] && !tracks[jumpIdx].locked) {
                    targetTrackId = tracks[jumpIdx].id;
                    accumulatedY.current = 0;
                }
            }
        }

        // --- Track Switching Overlap Check ---
        let finalTargetTrackId = targetTrackId;
        const SWAP_EPSILON = 0.05; // 50ms leeway for overlaps during track switch
        
        if (targetTrackId !== clip.trackId) {
            const potentialTrackClips = (clips || []).filter(c => c.trackId === targetTrackId);
            const overlap = potentialTrackClips.find(c => 
                c.id !== id && 
                (newAbsStart + SWAP_EPSILON < c.startTime + c.duration && newAbsStart + finalDuration - SWAP_EPSILON > c.startTime)
            );
            if (overlap) {
                finalTargetTrackId = clip.trackId; 
                // Keep the accumulated Y but don't jump yet if blocked by overlap
            }
        }

        // --- Horizontal Movement Logic ---
        // Calculate trackClips using the FINAL resolved track ID
        const trackClips = (clips || []).filter(c => c.trackId === finalTargetTrackId).sort((a, b) => a.startTime - b.startTime);
        
        const myIdx = trackClips.findIndex(c => c.id === id);
        const prev = trackClips[myIdx - 1];
        const next = trackClips[myIdx + 1];

        if (shouldSnap) {
            newAbsStart = getSnappedValue(newAbsStart);
        }

        const COLLISION_EPSILON = 0.01; // 10ms leeway for neighborhood collisions

        if (prev && newAbsStart < prev.startTime + prev.duration - COLLISION_EPSILON) {
            console.log(`[handleMove] Blocked by prev: ${newAbsStart} < ${prev.startTime + prev.duration}`);
            newAbsStart = prev.startTime + prev.duration;
        }
        if (next && newAbsStart + finalDuration > next.startTime + COLLISION_EPSILON) {
            console.log(`[handleMove] Blocked by next: ${newAbsStart + finalDuration} > ${next.startTime}`);
            newAbsStart = next.startTime - finalDuration;
        }

        const finalRel = newAbsStart - clip.sectionStartTime; // Allow negative or excessive relative timestamps for cross-border re-mapping
        applyOverride(id, { 
            timestamp: finalRel, 
            overrideDuration: finalDuration,
            trackId: (finalTargetTrackId as any) === 'voiceover' ? clip.trackId : (finalTargetTrackId as any)
        }, shouldPush);
    }, [applyOverride, clips, getSnappedValue]);

    const handleResize = useCallback((id: string, newDuration: number, shouldSnap = true, shouldPush = false) => {
        const clip = clips.find(c => c.id === id);
        if (!clip) return;
        
        let finalDuration = newDuration;

        if (shouldSnap) {
            const endTime = clip.startTime + newDuration;
            const snappedEnd = getSnappedValue(endTime);
            finalDuration = snappedEnd - clip.startTime;
        }

        const trackClips = (clips || []).filter(c => c.trackId === clip.trackId).sort((a,b) => a.startTime - b.startTime);
        
        finalDuration = Math.max(0.1, finalDuration);
        if (clip.sourceDuration != null && finalDuration > clip.sourceDuration) {
            finalDuration = clip.sourceDuration;
        }

        const delta = finalDuration - clip.duration;
        applyOverride(id, { overrideDuration: finalDuration }, shouldPush);

        // True Magnetic Ripple: ONLY push clips if they are actually being overlapped,
        // and ALWAYS preserve their duration so they don't shrink into nothingness!
        if (delta > 0) {
            let currentEnd = clip.startTime + finalDuration;
            const myIdx = trackClips.findIndex(c => c.id === id);
            
            for (let i = myIdx + 1; i < trackClips.length; i++) {
                const nextClip = trackClips[i];
                if (currentEnd > nextClip.startTime) {
                    const overlapAmount = currentEnd - nextClip.startTime;
                    const newStart = nextClip.startTime + overlapAmount;
                    
                    applyOverride(nextClip.id, { 
                        timestamp: newStart - nextClip.sectionStartTime,
                        overrideDuration: nextClip.duration // Lock duration so it doesn't shrink!
                    });
                    
                    // Update our rolling edge for the next cascade iteration
                    currentEnd = newStart + nextClip.duration;
                }
            }
        }
    }, [applyOverride, clips, getSnappedValue]);

    const handleDelete = useCallback((id: string) => {
        if (onDelete) {
            onDelete(id);
        } else {
            const updated = buildUpdatedScript();
            const cleanedScript: Script = {
                ...updated,
                sections: updated.sections.map(s => ({
                    ...s,
                    visualCues: s.visualCues?.filter(c => c.id !== id)
                }))
            };
            onScriptChange(cleanedScript);
        }
        setSelectedClipId(null);
    }, [buildUpdatedScript, onScriptChange, setSelectedClipId, onDelete]);

    const handleDuplicate = useCallback((id: string) => {
        const sourceClip = clips.find(c => c.id === id);
        if (!sourceClip) return;
        const updated = buildUpdatedScript();
        const newCueId = `dup-${id}-${Date.now()}`;
        const updatedWithDup: Script = {
            ...updated,
            sections: updated.sections.map(s => {
                if (s.id !== sourceClip.sectionId) return s;
                const originalCue = s.visualCues?.find(c => c.id === id);
                if (!originalCue) return s;
                const dupCue: VisualCue = {
                    ...originalCue,
                    id: newCueId,
                    timestamp: originalCue.timestamp + (originalCue.overrideDuration ?? sourceClip.duration) + 0.5,
                };
                return { ...s, visualCues: [...(s.visualCues ?? []), dupCue] };
            })
        };
        onScriptChange(updatedWithDup);
    }, [clips, buildUpdatedScript, onScriptChange]);

    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleSave = useCallback(() => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            console.log('[InteractiveTimeline] Auto-saving script (keeping overrides for undo history).');
            const updated = buildUpdatedScript();
            await onScriptChange(updated);
            // NOTE: We do NOT call clearOverrides() here, so undo history is preserved.
            // Overrides are only cleared on manual sync via the 'Update Preview' button.
            saveTimeout.current = null;
        }, 15000);
    }, [buildUpdatedScript, onScriptChange]);

    const handleMoveWithSave = useCallback((id: string, deltaX: number, deltaY: number, startDuration?: number) => {
        handleMove(id, deltaX, deltaY, startDuration, true, false);
        scheduleSave();
    }, [handleMove, scheduleSave]);

    const handleResizeWithSave = useCallback((id: string, dur: number) => {
        handleResize(id, dur, true, false);
        scheduleSave();
    }, [handleResize, scheduleSave]);

    // Called on pointerDown — captures pre-drag state for undo
    const handleDragStart = useCallback((id: string) => {
        console.log(`[InteractiveTimeline] Drag start on ${id} — pushing undo history`);
        applyOverride(id, {}, true);
    }, [applyOverride]);

    const handleVolumeChange = useCallback((id: string, volume: number) => {
        applyOverride(id, { volume });
    }, [applyOverride]);

    const handleVolumeChangeWithSave = useCallback((id: string, volume: number) => {
        applyOverride(id, { volume }, true);
        scheduleSave();
    }, [applyOverride, scheduleSave]);

    const handleTransitionChange = useCallback((id: string, transitionType?: 'fade' | 'blur' | 'zoom' | 'slide') => {
        applyOverride(id, { transitionType: transitionType as any });
    }, [applyOverride]);

    const handleTransitionDurationChange = useCallback((id: string, transitionDuration: number) => {
        applyOverride(id, { transitionDuration });
    }, [applyOverride]);

    const handleTransitionWithSave = useCallback((id: string, type?: any) => {
        applyOverride(id, { transitionType: type as any }, true);
        scheduleSave();
    }, [applyOverride, scheduleSave]);

    const handleTransitionDurationWithSave = useCallback((id: string, dur: number) => {
        applyOverride(id, { transitionDuration: dur }, true);
        scheduleSave();
    }, [applyOverride, scheduleSave]);

    const handleTrackChange = useCallback((id: string, trackId: 'video' | 'broll' | 'audio') => {
        applyOverride(id, { trackId }, true);
        scheduleSave();
    }, [applyOverride, scheduleSave]);

    const handleRestore = useCallback((id: string) => {
        removeOverride(id);
        scheduleSave();
    }, [removeOverride, scheduleSave]);

    const handleStartTimeChangeWithSave = useCallback((id: string, nextStart: number) => {
        const clip = clips.find(c => c.id === id);
        if (!clip) return;
        applyOverride(id, {}, true); // Manual input START
        handleMove(id, nextStart - clip.startTime, 0, undefined, false); 
        scheduleSave();
    }, [clips, handleMove, scheduleSave, applyOverride]);

    const handleDurationChangeWithSave = useCallback((id: string, dur: number) => {
        applyOverride(id, {}, true); // Manual input START
        handleResize(id, dur, false); 
        scheduleSave();
    }, [handleResize, scheduleSave, applyOverride]);

    const handleTrimSaveWithSave = useCallback((id: string, inPoint: number, outPoint: number) => {
        applyOverride(id, { inPoint, outPoint });
        handleResize(id, outPoint - inPoint, false);
        scheduleSave();
    }, [applyOverride, handleResize, scheduleSave]);

    const handleSwap = useCallback(async (id: string, direction: 'prev' | 'next') => {
        const clip = clips.find(c => c.id === id);
        if (!clip) return;
        
        const trackClips = (clips || []).filter(c => c.trackId === clip.trackId).sort((a, b) => a.startTime - b.startTime);
        const myIdx = trackClips.findIndex(c => c.id === id);
        const targetIdx = direction === 'prev' ? myIdx - 1 : myIdx + 1;
        
        if (targetIdx >= 0 && targetIdx < trackClips.length) {
            const targetClip = trackClips[targetIdx];
            
            // Build the current state into a structural script
            const currentScript = buildUpdatedScript();
            
            // Find source and target in the script structure
            let sourceSectionIdx = -1, sourceCueIdx = -1;
            let targetSectionIdx = -1, targetCueIdx = -1;
            
            currentScript.sections.forEach((s, sIdx) => {
                const scIdx = (s.visualCues || []).findIndex(c => c.id === clip.id);
                if (scIdx !== -1) { sourceSectionIdx = sIdx; sourceCueIdx = scIdx; }
                
                const tcIdx = (s.visualCues || []).findIndex(c => c.id === targetClip.id);
                if (tcIdx !== -1) { targetSectionIdx = sIdx; targetCueIdx = tcIdx; }
            });
            
            if (sourceSectionIdx === -1 || targetSectionIdx === -1) return;
            
            // Create next script (Deep clone to avoid mutations)
            const nextScript = JSON.parse(JSON.stringify(currentScript));
            const sourceCue = nextScript.sections[sourceSectionIdx].visualCues[sourceCueIdx];
            const targetCue = nextScript.sections[targetSectionIdx].visualCues[targetCueIdx];
            
            // Trade timestamps and durations to preserve the "look" of the swap
            const tempTimestamp = sourceCue.timestamp;
            const tempOverride = sourceCue.overrideDuration;
            
            sourceCue.timestamp = targetCue.timestamp;
            sourceCue.overrideDuration = targetCue.overrideDuration;
            
            targetCue.timestamp = tempTimestamp;
            targetCue.overrideDuration = tempOverride;
            
            // Trade places in the arrays
            nextScript.sections[sourceSectionIdx].visualCues[sourceCueIdx] = targetCue;
            nextScript.sections[targetSectionIdx].visualCues[targetCueIdx] = sourceCue;

            // Save INSTANTLY and clear local overrides
            clearOverrides(); 
            await onScriptChange(nextScript);
        }
    }, [clips, buildUpdatedScript, onScriptChange, clearOverrides]);

    const handleReplaceWithSave = useCallback(async (id: string, newCue: VisualCue) => {
        const currentScript = buildUpdatedScript();
        let targetSectionIdx = -1;
        let targetCueIdx = -1;
        
        currentScript.sections.forEach((s, sIdx) => {
            const scIdx = (s.visualCues || []).findIndex(c => c.id === id);
            if (scIdx !== -1) { targetSectionIdx = sIdx; targetCueIdx = scIdx; }
        });
        
        if (targetSectionIdx === -1) return;
        
        const nextScript = JSON.parse(JSON.stringify(currentScript));
        const targetCue = nextScript.sections[targetSectionIdx].visualCues[targetCueIdx];
        
        // Swap out the media but preserve timing and track
        if (newCue.type === 'video') {
            targetCue.videoUrl = newCue.videoUrl || newCue.url;
            targetCue.url = newCue.url; // Use as fallback thumbnail
        } else if (newCue.type === 'image') {
            targetCue.url = newCue.url;
            delete targetCue.videoUrl;
        } else {
            // Fallback for untyped cues
            if (newCue.url) targetCue.url = newCue.url; else delete targetCue.url;
            if (newCue.videoUrl) targetCue.videoUrl = newCue.videoUrl; else delete targetCue.videoUrl;
        }
        
        if (newCue.type) targetCue.type = newCue.type;
        
        // Reset manual trim limits since media changed
        delete targetCue.inPoint;
        delete targetCue.outPoint;
        
        // Only set sourceDuration if we know it
        if (newCue.sourceDuration != null) {
            targetCue.sourceDuration = newCue.sourceDuration;
        } else {
            delete targetCue.sourceDuration;
        }
        
        clearOverrides();
        await onScriptChange(nextScript);
        
    }, [buildUpdatedScript, clearOverrides, onScriptChange]);

    // ─── Rendering Helpers ─────────────────────────────────────────────────────
    const totalWidth = Math.max(800, totalDuration * zoomLevel + 200);

    const rulerTicks = useMemo(() => {
        const ticks = [];
        const count = Math.ceil(totalDuration / RULER_INTERVAL_S);
        for (let i = 0; i <= count; i++) {
            const t = i * RULER_INTERVAL_S;
            ticks.push(
                <div key={i} className="absolute top-0 bottom-0 border-l border-white/10" style={{ left: `${t * zoomLevel}px` }}>
                    <span className="absolute top-1 left-1 text-[9px] text-slate-500 font-mono font-bold select-none">{t}s</span>
                </div>
            );
        }
        return ticks;
    }, [totalDuration, zoomLevel]);

    const videoClips = clips.filter(c => c.trackId === 'video');
    const brollClips = clips.filter(c => c.trackId === 'broll');
    const audioClips = clips.filter(c => c.trackId === 'audio');

    const voiceSections = useMemo(() => {
        const result: { id: string; title: string; left: number; width: number }[] = [];
        let offset = 0;
        for (const section of [...script.sections].sort((a, b) => a.order - b.order)) {
            const dur = Math.max(section.estimatedDuration || 5, 5);
            result.push({ id: section.id, title: section.title, left: offset * zoomLevel, width: dur * zoomLevel });
            offset += dur;
        }
        return result;
    }, [script.sections, zoomLevel]);

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-md shadow-2xl flex flex-col h-full min-h-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Timeline</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Drag clips to reorder · Use Media Bin to add assets</p>
                    {clipboard && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                                📋 Copied: {(clipboard as any).imageDescription?.slice(0, 20) || clipboard.id}
                            </span>
                            <button
                                onClick={() => {
                                    // Trigger paste via the shortcut handler logic directly
                                    const event = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true });
                                    window.dispatchEvent(event);
                                }}
                                className="text-[9px] text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest transition-colors"
                            >Paste ⌘V</button>
                        </div>
                    )}
                </div>
                <div className="flex bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-0.5">
                    <button onClick={jumpToStart} className="p-2.5 hover:bg-slate-900 text-slate-500 hover:text-white transition-colors" title="Jump to Start"><ChevronsLeft size={14} /></button>
                    <button onClick={jumpToPrevScene} className="p-2.5 hover:bg-slate-900 text-slate-500 hover:text-white transition-colors border-r border-white/5" title="Previous Scene"><ChevronLeft size={14} /></button>
                    
                    <button
                        onClick={handlePlayPause}
                        className={`px-5 py-2 flex items-center gap-2 font-black transition-all duration-300 ${isPlaying ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
                    >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        <span className="text-[10px] uppercase tracking-[0.2em]">{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <button onClick={handleStop} className="p-2.5 hover:bg-slate-900 text-slate-500 hover:text-red-400 transition-colors border-l border-white/5" title="Stop & Reset"><Square size={12} fill="currentColor" className="opacity-50" /></button>
                    
                    <div className="flex items-center px-1 border-l border-white/5">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`px-2 py-1.5 transition-all rounded-lg flex items-center gap-1 ${
                                canUndo
                                    ? 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 shadow-lg shadow-blue-500/10'
                                    : 'text-slate-700 cursor-not-allowed opacity-30'
                            }`}
                            title={`Undo (Ctrl+Z) — ${historyDepth} step${historyDepth !== 1 ? 's' : ''} available`}
                        >
                            <span className="text-sm leading-none">↩️</span>
                            {canUndo && (
                                <span className="text-[9px] font-black font-mono bg-blue-500/20 text-blue-300 rounded px-1">
                                    {historyDepth}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`px-2 py-1.5 transition-all rounded-lg flex items-center gap-1 ${
                                canRedo
                                    ? 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 shadow-lg shadow-blue-500/10'
                                    : 'text-slate-700 cursor-not-allowed opacity-30'
                            }`}
                            title={`Redo (Ctrl+Y) — ${futureDepth} step${futureDepth !== 1 ? 's' : ''} available`}
                        >
                            {canRedo && (
                                <span className="text-[9px] font-black font-mono bg-blue-500/20 text-blue-300 rounded px-1">
                                    {futureDepth}
                                </span>
                            )}
                            <span className="text-sm leading-none">↪️</span>
                        </button>
                    </div>
                    
                    <button onClick={jumpToNextScene} className="p-2.5 hover:bg-slate-900 text-slate-500 hover:text-white transition-colors border-l border-white/5" title="Next Scene"><ChevronRight size={14} /></button>
                    <button onClick={jumpToEnd} className="p-2.5 hover:bg-slate-900 text-slate-500 hover:text-white transition-colors" title="Jump to End"><ChevronsRight size={14} /></button>
                    
                    {onFineTune && (
                        <button 
                            onClick={() => onFineTune?.(currentTime)} 
                            className={`p-2.5 transition-all flex items-center gap-2 px-4 ml-1 rounded-xl relative group ${Object.keys(overrides).length > 0 
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-l border-amber-500/30' 
                                : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-white border-l border-slate-800'}`}
                            title={Object.keys(overrides).length > 0 ? "Timeline altered - Preview sync recommended" : "Open Video Preview"}
                        >
                            {Object.keys(overrides).length > 0 ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Eye size={14} />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {Object.keys(overrides).length > 0 ? 'Sync & Preview' : 'Preview'}
                            </span>
                            
                            {Object.keys(overrides).length > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            <TimelineToolbar
                totalDuration={totalDuration}
                clipCount={clips.length}
                zoomLevel={zoomLevel}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetZoom={resetZoom}
                onResetTimeline={() => setIsResetModalOpen(true)}
                isMediaBinOpen={isMediaBinOpen}
                onToggleMediaBin={() => setIsMediaBinOpen(!isMediaBinOpen)}
                isDirty={Object.keys(overrides).length > 0}
                isSyncing={isSyncing}
                onSync={async () => {
                    if (saveTimeout.current) clearTimeout(saveTimeout.current);
                    setIsSyncing(true);
                    const updated = buildUpdatedScript();
                    await onScriptChange(updated);
                    clearOverrides();
                    setIsSyncing(false);
                }}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                snapEnabled={isSnapEnabled}
                onToggleSnap={() => setIsSnapEnabled(!isSnapEnabled)}
            />

            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={handleResetToClassic}
                title="Reset Timeline?"
                description="This will clear all manual edits and re-generate from text."
                confirmLabel="Reset Everything"
                confirmVariant="warning"
            />

            <div className="flex flex-1 overflow-hidden relative border-t border-white/5 bg-slate-950" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedClipId(null); }}>
                {/* Fixed Headers Column */}
                <div className="w-52 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
                    <div className="h-9 border-b border-slate-800 flex items-center px-3 shrink-0">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tracks</span>
                    </div>
                    {[
                        { id: 'video', label: 'Video', sub: 'Main visuals', icon: Film, color: 'blue-400', h: 'h-24' },
                        { id: 'broll', label: 'B-Roll', sub: 'Supplemental', icon: Film, color: 'purple-400', h: 'h-16' },
                        { id: 'voiceover', label: 'Voiceover', sub: 'Script sections', icon: Mic, color: 'indigo-400', h: 'h-16' },
                        { id: 'audio', label: 'Effects', sub: 'Ambient audio', icon: Volume2, color: 'teal-400', h: 'h-14' },
                        { id: 'score', label: 'Score', sub: 'Background', icon: Music, color: 'purple-400', h: 'flex-1 min-h-[40px]' },
                    ].map(t => {
                        const s = trackStates[t.id] || { locked: false, hidden: false };
                        return (
                            <div key={t.label} className={`${t.h} border-b border-slate-800 flex flex-col justify-center px-3 bg-slate-900/50 relative shrink-0 group`}>
                                <div className="flex items-center justify-between pr-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <t.icon size={14} className={`text-${t.color} shrink-0`} />
                                        <span className={`text-[10px] font-bold text-${t.color} truncate tracking-wider`}>{t.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleTrackHidden(t.id); }}
                                            className={`p-1 rounded hover:bg-white/10 ${s.hidden ? 'text-amber-400' : 'text-slate-500'}`}
                                        >
                                            {s.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleTrackLock(t.id); }}
                                            className={`p-1 rounded hover:bg-white/10 ${s.locked ? 'text-red-400' : 'text-slate-500'}`}
                                        >
                                            {s.locked ? <Lock size={10} /> : <Unlock size={10} />}
                                        </button>
                                    </div>
                                </div>
                                <span className="text-[9px] text-slate-500 mt-0.5">{t.sub}</span>
                                {s.locked && t.id !== 'voiceover' && (
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500/50" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Main Track Editor */}
                <div id="timeline-viewport" className="flex-1 overflow-x-auto overflow-y-hidden relative select-none" style={{ scrollbarWidth: 'thin' }}>
                    <div className="relative" style={{ width: `${totalWidth}px`, minHeight: '100%' }}>
                        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)`, backgroundSize: `${zoomLevel}px 100%` }} />
                        <div className="h-9 border-b border-slate-800 relative bg-slate-900/90 sticky top-0 z-10">{rulerTicks}</div>

                        <div 
                            className={`h-24 border-b border-slate-800 relative group/track transition-all ${trackStates.video?.hidden ? 'opacity-20 pointer-events-none grayscale' : 'hover:bg-white/[0.02]'}`} 
                            onClick={e => e.stopPropagation()}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'video')}
                        >
                            {!trackStates.video?.locked && videoClips.map(clip => (
                                <TimelineClip key={clip.id} clip={clip} zoomLevel={zoomLevel} isSelected={selectedClipId === clip.id} trackColor="blue" onSelect={setSelectedClipId} onDragStart={handleDragStart} onMove={handleMoveWithSave} onResize={handleResizeWithSave} onVolumeChange={handleVolumeChangeWithSave} onTransitionChange={handleTransitionWithSave} onTransitionDurationChange={handleTransitionDurationWithSave} onDuplicate={handleDuplicate} onDelete={handleDelete} onReplace={handleReplaceWithSave} />
                            ))}
                            {trackStates.video?.locked && videoClips.map(clip => (
                                <TimelineClip key={clip.id} clip={clip} zoomLevel={zoomLevel} isSelected={selectedClipId === clip.id} trackColor="blue" onSelect={setSelectedClipId} onMove={()=>{}} onResize={()=>{}} />
                            ))}
                        </div>

                        <div 
                            className={`h-16 border-b border-slate-800 relative group/track transition-all ${trackStates.broll?.hidden ? 'opacity-20 pointer-events-none grayscale' : 'hover:bg-white/[0.02]'}`} 
                            onClick={e => e.stopPropagation()}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'broll')}
                        >
                            {!trackStates.broll?.locked && brollClips.map(clip => (
                                <TimelineClip key={clip.id} clip={clip} zoomLevel={zoomLevel} isSelected={selectedClipId === clip.id} trackColor="purple" onSelect={setSelectedClipId} onDragStart={handleDragStart} onMove={handleMoveWithSave} onResize={handleResizeWithSave} onVolumeChange={handleVolumeChangeWithSave} onTransitionChange={handleTransitionWithSave} onTransitionDurationChange={handleTransitionDurationWithSave} onDuplicate={handleDuplicate} onDelete={handleDelete} onReplace={handleReplaceWithSave} />
                            ))}
                            {trackStates.broll?.locked && brollClips.map(clip => (
                                <TimelineClip key={clip.id} clip={clip} zoomLevel={zoomLevel} isSelected={selectedClipId === clip.id} trackColor="purple" onSelect={setSelectedClipId} onMove={()=>{}} onResize={()=>{}} />
                            ))}
                        </div>

                        <div className="h-16 border-b border-slate-800 relative">
                            {voiceSections.map(s => (
                                <div key={s.id} className="absolute top-1.5 bottom-1.5 bg-indigo-900/20 border border-indigo-500/25 rounded-lg overflow-hidden flex items-center px-2 pointer-events-none" style={{ left: `${s.left}px`, width: `${Math.max(10, s.width)}px` }}>
                                    <Mic size={9} className="text-indigo-400 shrink-0 mr-1.5 opacity-70" />
                                    <span className="text-[9px] text-indigo-300 font-bold truncate uppercase tracking-widest">{s.title}</span>
                                </div>
                            ))}
                        </div>

                        <div 
                            className={`h-14 border-b border-slate-800 relative group/track transition-all ${trackStates.audio?.hidden ? 'opacity-20 pointer-events-none grayscale' : 'hover:bg-white/[0.02]'}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'audio')}
                        >
                            {!trackStates.audio?.locked && audioClips.map(clip => (
                                <TimelineClip 
                                    key={clip.id} 
                                    clip={clip} 
                                    zoomLevel={zoomLevel} 
                                    isSelected={selectedClipId === clip.id} 
                                    trackColor="teal" 
                                    onSelect={setSelectedClipId} 
                                    onDragStart={handleDragStart}
                                    onMove={handleMoveWithSave} 
                                    onResize={handleResizeWithSave} 
                                    onVolumeChange={handleVolumeChangeWithSave}
                                    onTransitionChange={handleTransitionWithSave}
                                    onTransitionDurationChange={handleTransitionDurationWithSave}
                                    onDuplicate={handleDuplicate} 
                                    onDelete={handleDelete} 
                                    onReplace={handleReplaceWithSave}
                                />
                            ))}
                            {trackStates.audio?.locked && audioClips.map(clip => (
                                <TimelineClip 
                                    key={clip.id} 
                                    clip={clip} 
                                    zoomLevel={zoomLevel} 
                                    isSelected={selectedClipId === clip.id} 
                                    trackColor="teal" 
                                    onSelect={setSelectedClipId} 
                                    onMove={()=>{}} 
                                    onResize={()=>{}} 
                                />
                            ))}
                        </div>

                        <div className="flex-1 min-h-[50px] relative group/score bg-purple-950/5">
                            {/* Background Score - Full width block */}
                            <div className="absolute inset-y-2 left-1 right-2 bg-purple-900/10 border border-purple-500/20 rounded flex items-center justify-center overflow-hidden">
                                {/* Ducking Overlays */}
                                {voiceSections.map(v => (
                                    <div 
                                        key={`duck-${v.id}`}
                                        className="absolute top-0 bottom-0 bg-black/40 border-x border-purple-500/10 flex flex-col justify-end pb-1 px-1 transition-all group-hover/score:bg-black/60"
                                        style={{ left: `${v.left}px`, width: `${v.width}px` }}
                                    >
                                        <div className="w-full h-px bg-purple-500/20 mb-1" />
                                        <span className="text-[7px] text-purple-400/30 font-black uppercase tracking-tighter text-center">Auto-Ducking</span>
                                    </div>
                                ))}
                                <span className="text-[9px] text-purple-400/40 font-bold uppercase tracking-[0.4em] relative z-10 select-none">Background Score</span>
                            </div>
                        </div>

                        <motion.div 
                            drag="x"
                            dragMomentum={false}
                            dragElastic={0}
                            onDrag={(e, info) => {
                                const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
                                if (!rect) return;
                                // Calculate new time based on drag delta or position
                                // Better: Use the container for reference
                                const container = document.getElementById('timeline-viewport');
                                if (container) {
                                    const rect = container.getBoundingClientRect();
                                    const x = (info.point.x - rect.left) + container.scrollLeft;
                                    setCurrentTime(Math.max(0, Math.min(totalDuration, x / zoomLevel)));
                                }
                            }}
                            className="absolute top-0 bottom-0 w-px bg-red-500 z-30 cursor-ew-resize shadow-[0_0_8px_rgba(239,68,68,0.7)]" 
                            style={{ left: `${currentTime * zoomLevel}px` }}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-b shadow-lg flex items-center justify-center">
                                <div className="w-0.5 h-2 bg-white/40 rounded-full" />
                            </div>
                            <div className="absolute top-5 left-2 bg-red-600 font-mono font-bold px-2 py-0.5 rounded shadow-xl text-white text-[10px] whitespace-nowrap z-50">
                                {currentTime.toFixed(2)}s
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Side Content: Media Bin & Inspector */}
                <AnimatePresence>
                    {isMediaBinOpen && !selectedClipId && (
                        <MediaBinPanel 
                            script={script} 
                            onAddClip={handleAddClip}
                            onClose={() => setIsMediaBinOpen(false)}
                        />
                    )}
                    
                    {/* SidePanel Mode */}
                    {selectedClipId && !isInspectorModal && clips.find(c => c.id === selectedClipId) && (
                        <ClipInspector
                            key={`panel-${selectedClipId}`}
                            clip={clips.find(c => c.id === selectedClipId)!}
                            onVolumeChange={handleVolumeChangeWithSave}
                            onTransitionChange={handleTransitionWithSave}
                            onTransitionDurationChange={handleTransitionDurationWithSave}
                            onStartTimeChange={handleStartTimeChangeWithSave}
                            onDurationChange={handleDurationChangeWithSave}
                            onTrimSave={handleTrimSaveWithSave}
                            onSwap={handleSwap}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                            onClose={() => setSelectedClipId(null)}
                            isPlaying={isPlaying}
                            isDirty={Object.keys(overrides).length > 0}
                            isSyncing={isSyncing}
                            onSync={async () => {
                                if (saveTimeout.current) clearTimeout(saveTimeout.current);
                                setIsSyncing(true);
                                const updated = buildUpdatedScript();
                                await onScriptChange(updated);
                                clearOverrides();
                                setIsSyncing(false);
                            }}
                            onTrackChange={handleTrackChange}
                            onRestore={handleRestore}
                            isTrimModalOpen={isTrimModalOpen}
                            setIsTrimModalOpen={setIsTrimModalOpen}
                            isModal={false}
                            onToggleModal={() => {
                                console.log('[InteractiveTimeline] Toggling inspector TO modal');
                                setIsInspectorModal(true);
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Modal Mode (Portalled outside AnimatePresence for root safety) */}
                {selectedClipId && isInspectorModal && clips.find(c => c.id === selectedClipId) && typeof document !== 'undefined' && createPortal(
                    <div style={{ position: 'fixed', zIndex: 99999, inset: 0, pointerEvents: 'none' }} className="inspector-portal-root">
                        <div style={{ pointerEvents: 'auto' }}>
                            <AnimatePresence>
                                <ClipInspector
                                    key={`modal-${selectedClipId}`}
                                    clip={clips.find(c => c.id === selectedClipId)!}
                                    onVolumeChange={handleVolumeChangeWithSave}
                                    onTransitionChange={handleTransitionWithSave}
                                    onTransitionDurationChange={handleTransitionDurationWithSave}
                                    onStartTimeChange={handleStartTimeChangeWithSave}
                                    onDurationChange={handleDurationChangeWithSave}
                                    onTrimSave={handleTrimSaveWithSave}
                                    onSwap={handleSwap}
                                    onDelete={handleDelete}
                                    onDuplicate={handleDuplicate}
                                    onClose={() => setSelectedClipId(null)}
                                    isPlaying={isPlaying}
                                    isDirty={Object.keys(overrides).length > 0}
                                    isSyncing={isSyncing}
                                    onSync={async () => {
                                        if (saveTimeout.current) clearTimeout(saveTimeout.current);
                                        setIsSyncing(true);
                                        const updated = buildUpdatedScript();
                                        await onScriptChange(updated);
                                        clearOverrides();
                                        setIsSyncing(false);
                                    }}
                                    onTrackChange={handleTrackChange}
                                    onRestore={handleRestore}
                                    isTrimModalOpen={isTrimModalOpen}
                                    setIsTrimModalOpen={setIsTrimModalOpen}
                                    isModal={true}
                                    onToggleModal={() => {
                                        console.log('[InteractiveTimeline] Toggling inspector FROM modal');
                                        setIsInspectorModal(false);
                                    }}
                                />
                            </AnimatePresence>
                        </div>
                    </div>,
                    document.body
                )}
                {/* Portalled Trim Modal (Outside timeline DOM for proper visibility) */}
                {isTrimModalOpen && selectedClipId && clips.find(c => c.id === selectedClipId) && typeof document !== 'undefined' && (
                    createPortal(
                        <div style={{ position: 'fixed', zIndex: 100000, inset: 0, pointerEvents: 'none' }} className="trim-modal-portal-root">
                            <div style={{ pointerEvents: 'auto' }}>
                                <ClipTrimModal 
                                    isOpen={isTrimModalOpen}
                                    onClose={() => setIsTrimModalOpen(false)}
                                    clip={clips.find(c => c.id === selectedClipId)!}
                                    onSave={(inP, outP) => handleTrimSaveWithSave(selectedClipId, inP, outP)}
                                />
                            </div>
                        </div>,
                        document.body
                    )
                )}
            </div>
        </div>
    );
};
