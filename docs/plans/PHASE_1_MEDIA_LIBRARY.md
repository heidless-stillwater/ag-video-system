# PHASE_1_MEDIA_LIBRARY — Central Asset Management

## Goal

Implement a unified **Media Library** within `video-system` that serves as a central repository for all generated assets (images, videos) across both VideoSystem and PromptTool.

---

## 🏗️ Architecture (RES_TOOL_1 Compliance)

This feature follows the **RES_TOOL_1** design for cross-app API and media sharing.

| Component | Port | Purpose |
|---|---|---|
| `video-system` | 3001 | Primary host for the Media Library UI and `autovideo-db-0` collection. |
| `promptTool` | 3000 | Source for high-fidelity assets generated during brainstorming. |
| `promptResources` | 3002 | Reference documentation (accessed via PromptTool bridge). |

---

## 🛠️ Workstream C Breakdown

### 1. Data Model & Foundation
- [ ] Define **MediaLibraryEntry** in `src/types/index.ts`.
- [ ] Create **MediaLibraryService** in `src/lib/services/media-library.ts`.
- [ ] Implement CRUD for `mediaLibrary` collection in `autovideo-db-0`.

### 2. API Bridge
- [ ] Implement **`PromptToolBridgeService`** extensions to list user images from `prompttool-db-0`.
- [ ] Create API routes:
  - `GET /api/media-library` (local vs cross-app merge)
  - `POST /api/media-library/import` (pull asset from PromptTool)
  - `DELETE /api/media-library/[id]`

### 3. Progressive Auto-Publish (Workstream D)
- [ ] Hook into `ai.ts` (Imagen generation) to automatically call `MediaLibraryService.addEntry()`.
- [ ] Implement cross-app publishing: When VideoSystem generates an image, copy it to the PromptTool mirror collection to keep databases in sync.

### 4. UI: Media Gallery
- [ ] Create `/media-library` route in Nextjs.
- [ ] Build **`MediaLibrary.tsx`** component with gallery grid.
- [ ] Build **`ImportFromPromptTool.tsx`** browser to pick assets from the brainstorming app.
- [ ] Add "Open in PromptTool" deep links for assets with a PT origin.

---

## 🔎 Verification Plan

### Test Case 1: Manual Import
1. Generate an image in PromptTool (Port 3000).
2. Open Media Library in VideoSystem (Port 3001).
3. Click "Import from PromptTool".
4. Asset should appear in the local library and be usable in projects.

### Test Case 2: Auto-Publish
1. Trigger Imagen generation in a VideoSystem project.
2. Verify asset automatically appears in the Media Library.
3. Verify asset automatically appears in PromptTool's gallery.

### Test Case 3: Identity Sync
1. Sign in as a new user in VideoSystem.
2. Verify PromptTool profile is created instantly via sync API.
