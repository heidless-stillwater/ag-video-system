# 🧪 Viral Engine & 9:16 Rendering Validation (PHASE_TEST_3)

This plan validates the **Viral Shorts Manager**, the automated **Snippet Extraction**, and the **Vertical (9:16) rendering** pipeline.

## 📡 API Layer Verification
- [x] **POST `/api/projects/[id]/shorts/generate`**: Verify it returns 3 candidates with scores, hooks, and reasoned mapping.
- [x] **Firestore Check**: Verify the `shorts` array is persisted on the `project` document.
- [x] **POST `/api/projects/[id]/shorts/render`**: Trigger a render for a specific clip ID and confirm it starts (returns 200).
- [x] **Render Engine Check**: Verify the render engine correctly identifies the `9:16` aspect ratio for the segment.

## 🎬 Vertical (9:16) Rendering Integrity
- [x] **Visual Scaling**: Verify that 16:9 images/videos are cropped to 9:16 (center-fill) without black bars.
- [x] **Subtitles**: Verify that "Bold" subtitles are centered and scaled for the vertical layout.
- [x] **Audio Mux**: Confirm the short includes the correct narration segment, background music, and sound effects for those specific scenes.
- [x] **Progress Updates**: Confirm the `renderProgress` field in the Firestore `shorts` array updates as the render proceeds.

## 🎨 UI & Workflow
-[x] **Viral Shorts Manager**: Confirm the engine loads candidates and displays the "Launch Short" button.
-[x] **Render Status**: Verify the UI shows the "Baking..." state with a progress bar for the active short.
-[x] **Download Link**: Confirm that once "ready", the "Download Short" button appears and points to the correct proxy URL.

## 🛠️ Code Fixes (Part of this Phase)
- [x] **Fix Argument Order**: Correct the `renderEngine.renderDocumentary` call in `shorts/render/route.ts` to avoid passing the callback as a `performanceProfile`.

---
**Approval Status:** ⏳ ✅ COMPLETE
