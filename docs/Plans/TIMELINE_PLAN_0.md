# TIMELINE_PLAN_0 — Interactive NLE Timeline Refactor

**Date:** 2026-03-23  
**Status: ✅ COMPLETE** — All 4 Phases implemented
**Branch:** `rel-5`

---

## 1. Goal

Replace the current **read-only** Timeline View with a **fully interactive NLE (Non-Linear Editor)** that lets users visually structure their documentary through drag-and-drop, clip resizing, trimming, duplication, and a media bin.

---

## 2. Confirmed Requirements

| # | Capability | Detail |
|---|---|---|
| R1 | **Shift timing** | Drag clips left/right to reposition on the timeline |
| R2 | **Resize duration** | Drag clip edges to override calculated duration |
| R3 | **Trim in/out** | Set in-point and out-point on source media |
| R4 | **Media bin** | Asset library panel; drag media onto tracks |
| R5 | **Swap assets** | Replace a clip's source without losing position |
| R6 | **Delete clips** | Remove from timeline, optionally from storage |
| R7 | **Duplicate clips** | Within same section AND across sections |
| R8 | **Cross-track drag** | Move clips between tracks (e.g. Video → B-Roll) |
| R9 | **Drag & drop everywhere** | All interactions prefer drag-based UX |

---

## 3. Current Architecture (As-Is)

```
Script
 └── ScriptSection[]        (ordered by .order)
       ├── content           (narration text)
       ├── estimatedDuration (seconds, derived from WPM)
       ├── audioUrl          (synthesised narration)
       └── VisualCue[]       (ordered by .timestamp)
             ├── timestamp   (seconds from section start)
             ├── url         (image URL)
             ├── videoUrl    (video URL)
             ├── sourceDuration
             ├── sfxUrl / sfxOffset / sfxVolume
             └── description
```

`videoEngine.calculateTimeline()` iterates over sections, sorts cues by timestamp, and calculates each scene's duration as the gap to the next cue (or section end). **No user overrides exist today.**

---

## 4. Data Model Changes (All Approaches)

New fields on `VisualCue`:

```typescript
// Added to VisualCue interface in src/types/index.ts
inPoint?: number;           // Trim: start offset in source media (seconds)
outPoint?: number;          // Trim: end offset in source media (seconds)
overrideDuration?: number;  // Manual duration override (seconds)
trackId?: string;           // Which track this cue belongs to ('video' | 'broll' | 'overlay')
```

`videoEngine.calculateTimeline()` will be updated: if `overrideDuration` is set on a cue, use it instead of the gap-based calculation.

---

## 5. Design Approaches

### Approach A: Framer Motion Native ⭐ Recommended

**Use `framer-motion` (already installed) for all drag interactions.**

| Aspect | Detail |
|---|---|
| **Drag** | `<motion.div drag="x" dragConstraints={...}>` for repositioning |
| **Resize** | Custom "handle" `<motion.div>` on left/right edges with `onDrag` to compute new duration |
| **Cross-track** | `dragSnapToOrigin={false}` + `onDragEnd` calculates nearest track via Y-offset |
| **Media bin** | Separate panel component; items use `drag` to create new cues on drop |
| **Trim** | Modal or inline mini-editor with a dual-handle range slider |
| **Snap-to-grid** | Custom `dragElastic` + `onDrag` that snaps to `PIXELS_PER_SECOND` intervals |

**Pros:**
- Zero new dependencies
- Already used throughout the app (consistent motion language)
- Lightweight, good performance for ≤50 scenes

**Cons:**
- No built-in collision detection — requires manual overlap logic
- Resize handles need custom pointer-event work
- Cross-track drop zones need manual hit-testing

**Complexity:** Medium  
**Risk:** Low — well-understood library, already in bundle

---

### Approach B: @dnd-kit (Purpose-Built DnD Library)

**Install `@dnd-kit/core` + `@dnd-kit/sortable` for structured drag interactions.**

| Aspect | Detail |
|---|---|
| **Drag** | `<DndContext>` + `<SortableContext>` for track-level sorting |
| **Resize** | Still custom pointer events (dnd-kit doesn't handle resize) |
| **Cross-track** | Built-in droppable zones per track with collision detection |
| **Media bin** | Draggable items in a `<DndContext>` shared with the timeline |
| **Trim** | Same modal approach as Approach A |
| **Snap-to-grid** | Modifier functions (`restrictToHorizontalAxis`, custom snap) |

**Pros:**
- Purpose-built collision detection & droppable zones
- Accessible by default (keyboard DnD support)
- Clean separation of drag source vs. drop target

**Cons:**
- New dependency (~15 KB gzipped)
- Different mental model from framer-motion — two drag systems in one app
- Still no resize support (same custom work as A)

**Complexity:** Medium-High  
**Risk:** Medium — new dependency, learning curve for mixing with framer-motion

---

### Approach C: Raw Pointer Events (Maximum Control)

**Build entirely with `onPointerDown / onPointerMove / onPointerUp` handlers.**

| Aspect | Detail |
|---|---|
| **Drag** | Manual state tracking: `isDragging`, `dragOffset`, element refs |
| **Resize** | Same pointer events on edge handles |
| **Cross-track** | Manual Y-position → track-index mapping |
| **Media bin** | HTML5 native drag-and-drop API (`draggable`, `onDrop`) for bin-to-timeline |
| **Trim** | Same modal approach |
| **Snap-to-grid** | Manual rounding in `onPointerMove` |

**Pros:**
- Zero dependencies, zero abstraction overhead
- Total control over every pixel
- Easiest to debug and profile

**Cons:**
- Most code to write and maintain (~2x the implementation effort)
- Must manually handle: touch support, scroll-during-drag, accessibility
- Higher bug surface area

**Complexity:** High  
**Risk:** Medium — proven pattern but labour-intensive

---

### Recommendation

**Approach A (Framer Motion)** is recommended because:
1. Already in the project — no bundle increase
2. Sufficient for the interaction complexity (≤50 draggable items)
3. Consistent animation language with the rest of the app
4. Resize handles are custom work regardless of approach

---

## 6. Component Architecture (Approach A)

```
TimelineEditor.tsx (parent — unchanged wrapper)
 └── InteractiveTimeline.tsx        [NEW — replaces TimelineVideoEditor]
       ├── TimelineToolbar.tsx       [NEW — zoom, snap, playback controls]
       ├── TimelineRuler.tsx         [NEW — time ruler with markers]
       ├── TimelineTrack.tsx         [NEW — single track container]
       │    └── TimelineClip.tsx     [NEW — draggable, resizable clip]
       ├── TimelinePlayhead.tsx      [NEW — draggable red playhead]
       ├── MediaBinPanel.tsx         [NEW — asset library sidebar]
       └── ClipTrimModal.tsx         [NEW — trim in/out point editor]
```

**State management:** A `useTimelineState` hook manages:
- `clips[]` — derived from `calculateTimeline()` but enrichable with overrides
- `zoomLevel` — replaces `PIXELS_PER_SECOND`
- `selectedClipId` — for context menu / trim modal
- `clipboard` — for duplicate/paste operations

---

## 7. Phasing Strategies

### Strategy 1: Big Bang

Ship the entire `InteractiveTimeline` as a single deliverable replacing `TimelineVideoEditor`.

| Pros | Cons |
|---|---|
| One coherent UX from day one | Large changeset, harder to review |
| No intermediate states to maintain | Higher risk if something breaks |
| Fewer integration points | Longer time before anything is testable |

**Estimated effort:** ~8-12 sessions

---

### Strategy 2: Incremental (Recommended) ⭐

| Phase | Features | Est. Effort |
|---|---|---|
| **Phase 1: Foundation** | Component scaffold, drag-to-reorder clips, drag-resize clip edges, zoom controls | 2-3 sessions |
| **Phase 2: Media Management** | Media bin panel, drag-from-bin-to-track, swap asset, delete clip | 2-3 sessions |
| **Phase 3: Duplication & Cross-Track** | Duplicate within/across sections, cross-track drag, B-roll track | 2-3 sessions |
| **Phase 4: Trimming & Polish** | Trim modal (in/out points), snap-to-grid, keyboard shortcuts, playhead sync | 2-3 sessions |

| Pros | Cons |
|---|---|
| Each phase is independently usable | More integration touchpoints |
| Easier to review and test | Temporary intermediate UX states |
| Can reprioritize mid-stream | Slightly more total effort |

---

## 8. Decision Log

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| D1 | Clip duration: all three modes (shift, trim, override) | Pick one | User requested D — all of the above |
| D2 | Video management: media bin + swap + delete | Simpler swap-only | User requested D — all of the above |
| D3 | Duplication: within AND across sections | Same-section only | User requested C — both |
| D4 | Drag scope: Full NLE (reorder, resize, cross-track) | Reorder-only | User requested C — full NLE |
| D5 | Present both phasing strategies | Pick one | User requested C — present both |
| D6 | **Selected: Framer Motion (Approach A)** | dnd-kit, raw pointer events | Zero new deps, already in project |
| D7 | **Selected: Incremental phasing (Strategy 2)** | Big bang | Lower risk, testable per-phase |
| D8 | **Media bin: new lightweight panel** | Reuse PromptToolMediaPicker | Cleaner, purpose-built for timeline drag |
| D9 | **B-roll track: extend data model** (`trackId`) | Visual grouping only | Enables renderer to distinguish tracks |
| D10 | **Include undo/redo history stack** | Defer to later | Core editing UX expectation |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| User overrides desync from narration pacing | Clips may not match audio | Show "narration overflow" warnings when total clip time ≠ section audio length |
| Cross-section duplication creates orphan cues | Data integrity | Validate cue references on save; auto-cleanup orphans |
| Performance with many clips + drag | Janky drag on large timelines | Virtualise off-screen clips; limit rerender via `React.memo` |
| Backend renderer ignores new fields | Video output wrong | Phase 1 is client-only; update renderer in a later PR |

---

## 10. Resolved Questions

| # | Question | Decision |
|---|---|---|
| Q1 | Media bin source | **New lightweight panel** — purpose-built for timeline drag |
| Q2 | B-roll track | **Extend data model** — real `trackId` field on `VisualCue` |
| Q3 | Undo/redo | **Include history stack** in scope (Phase 4) |

---

## Next Steps

> ✅ **Plan approved.** Proceeding to Phase 1 implementation: Foundation (component scaffold, drag-to-reorder, drag-resize, zoom controls).
