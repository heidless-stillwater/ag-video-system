# MEDIA_PLAN_1 — Multimedia Tool Palette

## Goal

Unify all multimedia components (visual, audio, typography, mastering) into a single **floating tool palette** that can be invoked from any project phase. The palette is **state-aware** — it reads `project.status` and dynamically enables/disables tools appropriate to the current phase.

---

## Background

Multimedia tools are currently **scattered** across two UI surfaces:

| Component | Current Location | Purpose |
|---|---|---|
| `StyleSelector` | `ProjectStatusCard` + `DirectorSuite` | **Visual Aesthetic** — pick cinematic/anime/cyberpunk style |
| `SoundDesigner` | `ProjectStatusCard` | **AI Sound Designer** — generate per-scene SFX |
| `AmbientMusicSelector` | `ProjectStatusCard` | **Background Soundscape** — ambient music layer |
| `AudioMixer` | `ProjectStatusCard` | **Master Audio Mixer** — volume levels |
| `TypographySettings` | `ProjectStatusCard` | **Kinetic Typography** — subtitle style/font |
| `MasteringBooth` | Standalone on project page | **Voiceover Mastering Track** — per-section voice control |
| `LiveAudioMixer` | `VideoPreview` area | **Real-time Mix** — live volume faders during playback |

All except `MasteringBooth` are hidden during `draft` and `researching`. The `DirectorSuite` drawer contains dubbing, shorts, styles, and snapshots — a partial overlap.

---

## User Review Required

> [!IMPORTANT]
> **Key design decisions that need your input:**

1. **Relationship to DirectorSuite**: Should the palette **replace** the existing DirectorSuite drawer, **absorb** its features (dubbing, shorts, snapshots), or **coexist** as a separate quick-access panel?

2. **Trigger mechanism**: Options:
   - **(A)** Floating action button (FAB) — always visible bottom-right
   - **(B)** Keyboard shortcut (`Cmd/Ctrl+K` style)
   - **(C)** Both

3. **Disabled vs Hidden**: Should tools from later phases appear **greyed out** (showing the user what's coming) or be **completely hidden** until their phase is reached?

4. **LiveAudioMixer**: Should the real-time playback mixer also be included in the palette, or stay embedded in the video preview area?

---

## Proposed Changes

### Palette Component

#### [NEW] [MediaPalette.tsx](file:///home/heidless/projects/heidless-ai/antigravity/live/VideoSystem/video-system/src/components/project/MediaPalette.tsx)

A floating overlay component with tabbed sections. **Architecture:**

```
┌─────────────────────────────────────────┐
│  🎨 Multimedia Palette                  │
│  Phase: Scripting                       │
│  ┌──────┬──────┬──────┬──────┐          │
│  │Aesth.│Audio │Typo. │Master│  ← tabs  │
│  └──────┴──────┴──────┴──────┘          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [Active tab content renders    │    │
│  │   the relevant sub-components]  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Engine Active · v1.0                   │
└─────────────────────────────────────────┘
```

**Tab → Component mapping:**

| Tab | Label | Components | Earliest Phase |
|---|---|---|---|
| `visuals` | Aesthetic | `StyleSelector` | `draft` |
| `audio` | Soundscape | `AmbientMusicSelector` + `AudioMixer` + `SoundDesigner` | `scripting` |
| `typography` | Typography | `TypographySettings` | `scripting` |
| `mastering` | Mastering | `MasteringBooth` | `assembling` |

---

### Phase-Awareness Hook

#### [NEW] useMediaPaletteState.ts

A hook that takes `project.status` and returns which tabs are enabled:

```typescript
function useMediaPaletteState(status: ProjectStatus) {
  return {
    visuals:     true,  // always available
    audio:       !['draft', 'researching'].includes(status),
    typography:  !['draft', 'researching'].includes(status),
    mastering:   ['assembling', 'rendering', 'ready'].includes(status),
  };
}
```

---

### Integration Point

#### [MODIFY] [ProjectHeader.tsx](file:///home/heidless/projects/heidless-ai/antigravity/live/VideoSystem/video-system/src/components/project/ProjectHeader.tsx)

Add `<MediaPalette />` as a sibling to the existing page content so it floats globally on the project page. Pass required props from the parent state.

#### [MODIFY] [ProjectStatusCard.tsx](file:///home/heidless/projects/heidless-ai/antigravity/live/VideoSystem/video-system/src/components/project/ProjectStatusCard.tsx)

**After palette is live**: Remove the inline `StyleSelector`, `AmbientMusicSelector`, `AudioMixer`, `SoundDesigner`, and `TypographySettings` renders from lines 134–173. These will now live exclusively in the palette. *(This is a follow-up cleanup step — optional until the palette is validated.)*

---

## Verification Plan

### Manual Verification
1. Run `npm run dev` and open a project at each status (`draft`, `scripting`, `assembling`, `ready`)
2. Verify the floating trigger button is visible on all phases
3. Click the trigger — palette should open with smooth animation
4. Confirm only phase-appropriate tabs are enabled; disabled tabs should be unclickable
5. Switch between tabs — each should render the correct sub-component
6. Test that all tool interactions (style select, volume slider, sound design generate) still function correctly through the palette

> [!TIP]
> I'd appreciate your guidance on any additional manual tests — particularly around whether the palette should be tested alongside the DirectorSuite drawer to check for z-index conflicts.

### Automated Tests
- No existing tests cover this UI area. Adding unit tests is optional at this stage since it's purely presentational. If desired, I can write a Playwright E2E test to verify palette open/close and tab switching.
