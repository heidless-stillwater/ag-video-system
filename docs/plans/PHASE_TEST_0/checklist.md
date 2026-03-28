# 🧪 PHASE_TEST_0: UI Polish & Audio Controls 

This checklist is for verifying the recent UI refinements and audio control implementations across the Video System.

## 🎚️ 1. Master Audio Mixer (Video Preview Stage)
- [x] **Global Mute Toggle**: Click the "Mute All" button (speaker icon) in the control bar.
    - [x] Narration is silenced.
    - [x] Music is silenced.
    - [x] Ambiance is silenced.
    - [x] SFX / Chimes are silenced.
    - [x] **Video Clip Audio** is silenced (Layer A & B).
- [x] **5th Channel (🎬 Video Sound)**: Use the new "Video Sound" slider.
    - [x] Adjusting the slider scales the volume of audio baked into video clips.
    - [x] Setting it to 0% kills video sound without affecting other tracks.
- [x] **Mixer Persistence**: Adjust levels, click "Save Settings", and refresh the page.
    - [x] Levels are restored to the saved state.
    - [x] The "Video Sound" level is correctly preserved.

## 🎬 2. Clip Inspector (Docked View)
- [x] **Compact Spacing**: Verify the vertical gaps between components are reduced (Pro-tool feel).
- [x] **Mute Toggle**: Hover over the preview thumbnail and toggle the mute button.
    - [x] Audio toggles on/off for that specific clip preview.
- [x] **Sync Indicator**: Ensure the "Sync Required" overlay appears if properties (like duration) are changed.

## 🔎 3. Preview & Trim Modal
- [x] **Modal Alignment**: In "Transitions" section, verify it aligns with the top of the thumbnail.
- [x] **Compact Spacing**: Gaps between "Transitions" and "Start Time & Duration" should feel tight and consistent.
- [x] **Mute Toggle**: Verify the modal-specific mute toggle works independently of the main stage.

## 🔄 4. Transition & Scene Handling 
- [x] **Scene ADVANCEMENT**: Let a scene play into the next.
    - [x] Mute state persists through the transition.
    - [x] Volumes remain at their slider levels (No sudden jumps).

---
*Record notes or issues found during testing here...*
