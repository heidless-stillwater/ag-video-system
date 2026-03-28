# 🧪 Media Library Validation Checklist (PHASE_TEST_2)

This plan validates the **Unified Media Library** and **Progressive Auto-Publish** workflow.

## 📡 API Layer Verification
- [x] **GET `/api/media-library`**: Verify it returns a merged list of local assets AND PromptTool images (if logged in).
- [x] **GET `/api/media-library?mode=community`**: Verify it returns PromptTool community highlights.
- [x] **POST `/api/media-library`**: Manually log an asset (via cURL or UI) and check it appears in Firestore.
- [x] **POST `/api/media-library/import`**: Import a specific PT ID and verify a local record is created.
- [x] **PATCH `/api/media-library/[id]`**: Toggle `isFavorite` and verify Firestore update.
- [x] **DELETE `/api/media-library/[id]`**: Remove a local asset and verify it's gone from the library.

## 🖼️ Media Library UI (`/media-library`)
- [x] **Gallery Load**: Open `/media-library` and confirm the grid loads assets with badges (PT vs Local).
- [x] **Tabs**: Toggle between "My Assets" and "Community" to see different data sources.
- [x] **Filters**: Filter by "Image" and "Video" to confirm the gallery responds correctly.
- [x] **Detail Drawer**: Click an asset; verify the drawer shows the prompt, source, and ratio.
- [x] **Favorites**: Heart an asset from the drawer; verify the star appears on the thumbnail.
- [x] **Search**: Search for a keyword from a known prompt; verify the list filters.

## ⚙️ Progressive Auto-Publish Loop
- [x] **Project Generation**: Go to a project and generate a new scene/cue image. 
- [x] **Auto-Log Check**: Confirm the newly generated image is automatically listed in `/media-library`.
- [x] **Mirroring Check**: (Manual check) Verify the image also appears in the PromptTool environment.
- [x] **Metadata Persistence**: Confirm the aspect ratio and prompt metadata match the generation settings.

## 🛠️ Diagnostics
- [x] **Auth Check**: Logout and visit `/media-library`; confirm it redirects to login or shows empty state.
- [x] **Error Handling**: Try to delete a PT asset (via API); verify it correctly returns a 403 or specific error message.

---
**Approval Status:** ✅ COMPLETE

*All systems green. Proceeding to Phase 3: Viral Engine Validation.*
