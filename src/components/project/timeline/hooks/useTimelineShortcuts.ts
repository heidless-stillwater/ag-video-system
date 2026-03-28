import { useEffect } from 'react';

interface TimelineShortcutOptions {
    onDelete?: () => void;
    onTogglePlay?: () => void;
    onDeselect?: () => void;
    onDuplicate?: () => void;
    onToggleMute?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    selectedId: string | null;
}

/**
 * Hook for managing global timeline keyboard shortcuts.
 */
export function useTimelineShortcuts({
    onDelete,
    onTogglePlay,
    onDeselect,
    onDuplicate,
    onToggleMute,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    selectedId
}: TimelineShortcutOptions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMod = e.ctrlKey || e.metaKey;

            // 1. Don't fire if user is typing in an input, textarea, or contentEditable
            const target = e.target as HTMLElement;
            const isTyping = 
                target.tagName === 'INPUT' || 
                target.tagName === 'TEXTAREA' || 
                target.isContentEditable;
            
            if (isTyping) return;

            // 2. Map Keys to Actions
            if (isMod) {
                if (e.key === 'z' || e.key === 'Z') {
                    if (e.shiftKey) {
                        if (onRedo) { e.preventDefault(); onRedo(); }
                    } else {
                        if (onUndo) { e.preventDefault(); onUndo(); }
                    }
                    return;
                }
                if (e.key === 'y' || e.key === 'Y') {
                    if (onRedo) { e.preventDefault(); onRedo(); }
                    return;
                }
                if (e.key === 'c' || e.key === 'C') {
                    if (selectedId && onCopy) { e.preventDefault(); onCopy(); }
                    return;
                }
                if (e.key === 'v' || e.key === 'V') {
                    if (onPaste) { e.preventDefault(); onPaste(); }
                    return;
                }
            }

            switch (e.key) {
                // Delete / Backspace -> Delete Selected Clip
                case 'Delete':
                case 'Backspace':
                    if (selectedId && onDelete) {
                        e.preventDefault();
                        onDelete();
                    }
                    break;

                // Space -> Play/Pause
                case ' ':
                    if (onTogglePlay) {
                        e.preventDefault();
                        onTogglePlay();
                    }
                    break;

                // Escape -> Clear Selection
                case 'Escape':
                    if (onDeselect) {
                        e.preventDefault();
                        onDeselect();
                    }
                    break;

                // 'd' or 'D' -> Duplicate Selected Clip
                case 'd':
                case 'D':
                    if (selectedId && onDuplicate) {
                        e.preventDefault();
                        onDuplicate();
                    }
                    break;

                // 'm' or 'M' -> Toggle Mute
                case 'm':
                case 'M':
                    if (selectedId && onToggleMute) {
                        e.preventDefault();
                        onToggleMute();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDelete, onTogglePlay, onDeselect, onDuplicate, onToggleMute, onUndo, onRedo, onCopy, onPaste, selectedId]);
}
