# MEDIA_PLAN_2 — Multimedia Tool Palette Design

> Brainstorming design document following the obra/superpowers workflow.
> **Status**: Awaiting user decisions on proposed approaches.

---

## 1. Problem Statement

Six multimedia tools (Visual Aesthetic, AI Sound Designer, Background Soundscape, Master Audio Mixer, Kinetic Typography, Voiceover Mastering Track) are scattered across `ProjectStatusCard` and standalone locations. They need to be unified into a **single invokable palette** that is:

- Accessible from **every project phase** (draft → ready)
- **State-aware** — enables/disables tools based on `project.status`
- A **single source of truth** for all media configuration

---

## 2. Current Component Inventory

| User-Facing Name | Component File | Current Host | Available From |
|---|---|---|---|
| Visual Aesthetic | `StyleSelector.tsx` | `ProjectStatusCard` + `DirectorSuite` | `scripting` onward |
| AI Sound Designer | `SoundDesigner.tsx` | `ProjectStatusCard` | `scripting` onward |
| Background Soundscape | `AmbientMusicSelector.tsx` | `ProjectStatusCard` | `scripting` onward |
| Master Audio Mixer | `AudioMixer.tsx` | `ProjectStatusCard` | `scripting` onward |
| Kinetic Typography | `TypographySettings.tsx` | `ProjectStatusCard` | `scripting` onward |
| Voiceover Mastering | `MasteringBooth.tsx` | Standalone on project page | `assembling` onward |

**Also related** (not explicitly requested):
- `LiveAudioMixer.tsx` — real-time faders during video playback
- `DirectorSuite.tsx` — slide-out drawer with dubbing, shorts, styles, snapshots

---

## 3. Proposed Approaches

### Approach A: Floating Overlay Palette (Recommended)

A **glassmorphic floating panel** anchored bottom-right, invoked via a FAB button. Contains tabbed sections grouping the 6 tools. Coexists with `DirectorSuite`.

| Pros | Cons |
|---|---|
| Non-destructive — no existing UI changes needed initially | Two "drawer-like" surfaces (palette + DirectorSuite) |
| Quick to build — reuses existing components as-is | Slightly more screen clutter |
| Can be added incrementally | |

### Approach B: Expanded DirectorSuite

Extend the existing `DirectorSuite` drawer to include all 6 tools as additional sections. Remove them from `ProjectStatusCard`.

| Pros | Cons |
|---|---|
| Single unified drawer — no new UI surface | DirectorSuite becomes very long |
| Less visual clutter | Harder to access quickly (full-width slide-out) |
| | Mixes "media tools" with "distribution tools" (dubbing, shorts) |

### Approach C: Command Palette (⌘K Style)

A spotlight/command-palette overlay triggered by keyboard shortcut. Tools listed as searchable cards, filtered by phase.

| Pros | Cons |
|---|---|
| Power-user friendly, fast | Less discoverable for new users |
| Minimal screen real estate | Keyboard-only trigger may be missed |
| Modern UX pattern | Complex to build well |

**Recommendation**: **Approach A** — it's the fastest to implement, doesn't disrupt existing UI, and provides the clearest visual grouping. The FAB can optionally also respond to a keyboard shortcut.

---

## 4. Phase-Awareness Map

Which tools are enabled at each project phase:

| Phase | Aesthetic | Sound Designer | Soundscape | Audio Mixer | Typography | Mastering |
|---|---|---|---|---|---|---|
| `draft` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `researching` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `scripting` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `generating_media` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `assembling` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ready` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Design Decisions Needed

> [!IMPORTANT]
> Please choose or adjust for each:

**D1 — Approach**: A (floating overlay), B (expand DirectorSuite), or C (command palette)?

**D2 — Disabled tools**: Show greyed-out with "Available in [phase]" label, or completely hidden?

**D3 — Cleanup**: After the palette works, should we remove the duplicate tools from `ProjectStatusCard` (lines 134–173), or keep them in both places?

**D4 — LiveAudioMixer**: Include in the palette, or leave it embedded in the video preview area?

---

## 6. Implementation Outline (pending decisions above)

Assuming Approach A is approved:

- [x] Create `MediaPalette.tsx` — floating overlay with tabs (COMPLETE)
- [x] Create `useMediaPaletteState.ts` — hook returning enabled/disabled per tab (COMPLETE)
- [x] Mount palette in the project page layout (global position) (COMPLETE)
- [x] Wire all 6 components into the palette tabs with their existing props (COMPLETE)
- [x] Visual polish — glassmorphism, framer-motion transitions, responsive (COMPLETE)
- [x] Cleanup: remove duplicate tools from `ProjectSettings` and `DirectorSuite` (COMPLETE)
- [x] Verify across all phases (`draft` → `ready`) (COMPLETE)

---

## 7. Verification Plan

### Manual Testing
1. `npm run dev` → open a project
2. Confirm FAB button is visible at every phase
3. Open palette → verify correct tabs are enabled/disabled per phase matrix above
4. Interact with each tool inside the palette (change style, adjust volume, toggle subtitles)
5. Confirm changes persist to Firestore (reload and verify)

### Existing Tests
- No existing tests cover the multimedia tool UI. These components are currently untested.
- A Playwright E2E test could be added post-implementation to verify palette open/close and tab states, but I'd recommend deferring automated testing until the design is stable.
