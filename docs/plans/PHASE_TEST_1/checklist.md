# 🧪 PHASE_TEST_1: Undo/Redo & Playhead Sync

**Status: ✅ COMPLETE** — Tested 2026-03-23

This checklist is for verifying the implementation of the Timeline history system and theater-sync capabilities.

---

## 🔄 1. Undo/Redo (Toolbar Buttons)
- [x] **Basic Manipulation**: Drag a clip to a new position.
    - [x] Undo button lights up after drag (via `onDragStart` → `applyOverride`)
    - [x] Click the **Undo** button (↩️) in the primary header toolbar.
    - [x] Clip returns to its original position.
- [x] **Redo Action**: After Undoing, click the **Redo** button (↪️).
    - [x] Clip moves back to the new position.
- [x] **Snap-to-grid**: Enable the Magnet icon in toolbar.
    - [x] Drag a clip near another clip's edge.
    - [x] Verify it snaps precisely to the edge.
    - [x] Verify it snaps to the red playhead.
    - [x] Verify it snaps to 0.5s increments when no edges are nearby.
- [x] **Stack Depth**: Multiple sequential drags each recorded as separate history points.
    - [x] De-duplication guard prevents empty state stacking.
- [x] **Disabled States**:
    - [x] Undo/Redo buttons appear greyed-out on fresh load.
    - [x] Buttons glow blue when active.

---

## ⌨️ 2. Keyboard Shortcuts
- [x] **Undo (Ctrl+Z / Cmd+Z)**: Performs undo via `useTimelineShortcuts`.
- [x] **Redo (Ctrl+Shift+Z / Cmd+Shift+Z)**: Performs redo.
- [x] **Redo Alternative (Ctrl+Y / Cmd+Y)**: Performs redo.

---

## 📜 3. History Intelligence
- [x] **Interaction Start Pushing**: History captured at `pointerDown` via `onDragStart` on `TimelineClip`.
    - [x] Undo jumps back to start of drag, not a middle frame.
- [x] **Discrete Actions**: Volume/transition changes also push to history.
- [x] **Auto-Save Boundary (15s)**: Auto-save no longer clears history.
    - [x] History is preserved across auto-saves.
    - [x] History IS cleared on manual **Update Preview** click (by design — this is a commit point).

### ⚠️ Known Limitations
- **Cannot undo past an "Update Preview"** — this is intentional. Manual sync = DB commit = new baseline. Same as Ctrl+S in a text editor.
- **Auto-save runs every 15s** (previously 0.8s). The "Update Preview" amber button persists until manually clicked.

---

## 🎭 4. Playhead Theater Sync
- [x] **Seeking Sync**: Timeline playhead position passed via `initialTime` prop to `VideoPreview`.
- [x] **handleOpenPreview**: Sets `previewStartTime` before opening the preview modal.
- [x] Preview opens at the correct playhead position.

---

## 🐛 Bugs Fixed During This Phase
1. **History flooding**: `applyOverride` was called 60fps during drag — fixed by moving push to `onDragStart`.
2. **Auto-save wipe**: 800ms timer was calling `clearOverrides()`, destroying history — removed, timer extended to 15s.
3. **stale-code confusion**: Browser was serving cached JS — resolved by killing zombie process on port 3000.
4. **`onRedo` typo**: Was calling undefined `onRedo` instead of `redo` — fixed.
5. **Duplicate history states**: `{}` was being pushed on top of `{}` — de-duplication guard added.

---
*Phase 1 testing complete. Proceeding to Phase 2.*
