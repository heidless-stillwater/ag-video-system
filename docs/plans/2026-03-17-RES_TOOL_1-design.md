# RES_TOOL_1 — Cross-App API & Media Library Design

> **Date:** 2026-03-17
> **Status:** ✅ LOCKED — Design Gate Closed 2026-03-17T12:37Z
> **Apps:** `video-system`, `promptTool`, `promptResources`

---

## 0. Executive Summary

Connect `video-system` and `promptTool` via a server-side API bridge that mirrors the existing `promptTool ↔ promptResources` pattern. Implement unified user identity sync, a shared **Media Library** within `video-system`, and automatic cross-app artifact publishing when video projects generate media.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Firebase Project                       │
│                   heidless-apps-0                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  (default)   │  │prompttool-db │  │autovideo-db-0 │  │
│  │  Firestore   │  │  Firestore   │  │  Firestore    │  │
│  │              │  │              │  │               │  │
│  │PromptResources│ │ PromptTool   │  │ VideoSystem   │  │
│  │   data       │  │   data       │  │   data        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│         │    Shared Firebase Auth (SSO)      │           │
│         └─────────────────┴──────────────────┘           │
└──────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │PromptResources│     │  PromptTool  │     │ VideoSystem  │
    │  Next.js App │     │  Next.js App │     │  Next.js App │
    │  Port: 3002  │     │  Port: 3000  │     │  Port: 3001  │
    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
           │                    │                     │
           │◄───── Bridge ─────►│◄──── NEW Bridge ───►│
           │ (resourcesDb)      │  (promptToolDb)     │
           │ (existing)         │  (this plan)        │
           └────────────────────┴─────────────────────┘
```

### Key Architectural Decision: Multi-DB Admin Bridge (not HTTP API)

All three apps share the **same Firebase project** (`heidless-apps-0`) with **separate Firestore databases**:

| App | Firestore Database | Port |
|---|---|---|
| `promptResources` | `(default)` | 3002 |
| `promptTool` | `prompttool-db-0` | 3000 |
| `video-system` | `autovideo-db-0` | 3001 |

Because they share a project, `firebase-admin` can access **any** database in the project via `getFirestore(app, databaseId)`. This is exactly how the existing `promptTool ↔ promptResources` bridge works (see [resources-bridge.ts](file:///home/heidless/projects/heidless-ai/antigravity/live/PromptTool/src/lib/services/resources-bridge.ts)).

**We will replicate this pattern** to create a `video-system ↔ promptTool` bridge. No HTTP calls between apps. Direct Firestore cross-database reads/writes via Admin SDK.

---

## 2. Workstream Breakdown

| ID | Workstream | Description |
|---|---|---|
| **A** | User Identity Sync | Automatic cross-app user creation |
| **B** | PromptTool Bridge Service | Server-side CRUD against promptTool DB from video-system |
| **C** | Media Library | New collection + UI in video-system |
| **D** | Auto-Publish Pipeline | video-system media → promptTool image sets |
| **E** | Dev Environment & Testing | Ports, tmux, dual Antigravity, test plan |

---

## 3. Workstream A — User Identity Sync

### 3.1 Current State

| App | Auth Provider | User Store | ID Field |
|---|---|---|---|
| `video-system` | Firebase Auth (Google + Mock) | `autovideo-db-0/users/{uid}` | `id` |
| `promptTool` | Firebase Auth (Google + Email) | `prompttool-db-0/users/{uid}` | `uid` |

Both apps use the **same Firebase Auth** instance (`heidless-apps-0`). This means:
- A user who signs in via Google gets the **same `uid`** in both apps.
- Firebase ID tokens are valid across both apps' API routes.
- **No separate "account creation" is needed for auth** — it's already unified.

### 3.2 The Problem

The user profile documents are **not** automatically created cross-app. When a user first signs into `video-system`, a `users/{uid}` doc is created in `autovideo-db-0` but **nothing** is created in `prompttool-db-0`, and vice versa.

### 3.3 Solution: Cross-App Profile Sync on First Login

**On video-system user creation** (in [AuthContext.tsx](file:///home/heidless/projects/heidless-ai/antigravity/live/VideoSystem/video-system/src/lib/auth/AuthContext.tsx), when `!snapshot.exists()`):
1. After creating the `autovideo-db-0/users/{uid}` doc
2. Call a new server-side API route `POST /api/auth/sync-user`
3. That route uses the PromptTool Bridge to check if `prompttool-db-0/users/{uid}` exists
4. If not, create a `UserProfile` in `prompttool-db-0` with mapped fields

**On promptTool user creation** (in [auth-context.tsx](file:///home/heidless/projects/heidless-ai/antigravity/live/PromptTool/src/lib/auth-context.tsx), `createOrUpdateProfile()`):
1. After creating the `prompttool-db-0/users/{uid}` doc
2. Call a new server-side API route `POST /api/auth/sync-user`
3. That route uses a VideoSystem Bridge to check if `autovideo-db-0/users/{uid}` exists
4. If not, create a `User` in `autovideo-db-0` with mapped fields

### 3.4 Field Mapping

```typescript
// video-system User → promptTool UserProfile
{
  uid:           vsUser.id,
  email:         vsUser.email,
  displayName:   vsUser.displayName,
  photoURL:      vsUser.photoURL || null,
  role:          'member',                    // Default for cross-app creation
  subscription:  'free',                      // Default tier
  audienceMode:  'casual',
  createdAt:     Timestamp.now(),
  updatedAt:     Timestamp.now(),
  _createdBy:    'video-system',              // Provenance marker
}

// promptTool UserProfile → video-system User
{
  id:            ptProfile.uid,
  email:         ptProfile.email,
  displayName:   ptProfile.displayName || 'Anonymous',
  photoURL:      ptProfile.photoURL,
  createdAt:     new Date(),
  settings:      DEFAULT_USER_SETTINGS,
  roles:         ['user'],                    // Default for cross-app
  plan:          'standard',
  creditBalance: 0,
  _createdBy:    'promptTool',                // Provenance marker
}
```

### 3.5 Files Modified

| File | Change |
|---|---|
| `video-system/src/lib/firebase-prompttool-db.ts` | **NEW** — PromptTool Firestore client |
| `video-system/src/app/api/auth/sync-user/route.ts` | **NEW** — Server-side sync endpoint |
| `video-system/src/lib/auth/AuthContext.tsx` | Trigger sync after profile creation |
| `promptTool/src/lib/firebase-videosystem-db.ts` | **NEW** — VideoSystem Firestore client |
| `promptTool/src/app/api/auth/sync-user/route.ts` | **NEW** — Server-side sync endpoint |
| `promptTool/src/lib/auth-context.tsx` | Trigger sync after profile creation |

---

## 4. Workstream B — PromptTool Bridge Service (in video-system)

### 4.1 Pattern

Mirrors [resources-bridge.ts](file:///home/heidless/projects/heidless-ai/antigravity/live/PromptTool/src/lib/services/resources-bridge.ts) exactly. A server-side service class that reads/writes to `prompttool-db-0` using `firebase-admin`.

### 4.2 New Files in video-system

```
src/lib/
  firebase-prompttool-db.ts          # Firestore client for prompttool-db-0
  services/
    prompttool-bridge.ts             # CRUD operations against promptTool data
    prompttool-types.ts              # Mirrored types from promptTool

src/app/api/
  prompttool/
    resources/route.ts               # GET user resources from promptTool
    resources/[id]/route.ts          # GET single resource
    images/route.ts                  # GET user images/collections
    images/sets/route.ts             # POST create image set in promptTool
    images/sets/[setId]/route.ts     # CRUD on specific image set
    profile/[uid]/route.ts           # GET promptTool profile (experts/contributors)
```

### 4.3 PromptToolBridgeService Methods

```typescript
class PromptToolBridgeService {
  // User operations
  static async getUserProfile(uid: string): Promise<PTUserProfile | null>
  static async createUserProfile(uid: string, data: CreatePTUserInput): Promise<PTUserProfile>
  static async userExists(uid: string): Promise<boolean>

  // Image operations
  static async getUserImages(uid: string, options?): Promise<PTGeneratedImage[]>
  static async getImagesByPromptSet(uid: string, setId: string): Promise<PTGeneratedImage[]>
  static async createImage(uid: string, data: CreatePTImageInput): Promise<PTGeneratedImage>
  static async createImageSet(uid: string, data: CreateImageSetInput): Promise<string>

  // Resource operations (proxied from PromptResources via PromptTool)
  static async getUserResources(uid: string): Promise<PTResource[]>
  static async getResource(resourceId: string): Promise<PTResource | null>

  // Collection operations
  static async getUserCollections(uid: string): Promise<PTCollection[]>
  static async getPublicProfile(uid: string): Promise<PublicPTProfile | null>
}
```

### 4.4 Accessing PromptResources Data

`video-system` accesses `promptResources` data **through** `promptTool`'s existing bridge, **not** directly. The chain is:

```
video-system → prompttool-db-0 → (default) DB
              (PromptToolBridge)  (ResourcesBridge, already exists)
```

For training/reference docs, `video-system` will query `prompttool-db-0` resources that originate from `(default)` DB. No changes to `promptResources` are required for read operations.

---

## 5. Workstream C — Media Library

### 5.1 Data Model

A new Firestore collection in `autovideo-db-0`:

```
mediaLibrary/{assetId}
```

```typescript
interface MediaLibraryEntry {
  id: string;
  userId: string;

  // --- Core Metadata ---
  name: string;
  description: string;
  fileType: string;                       // 'image/png', 'video/mp4', etc.
  fileSize: number;                       // bytes

  // --- Links ---
  imageUrl: string;                       // Direct URL to full-resolution asset
  thumbnailUrl: string;                   // Thumbnail URL

  // --- Prompt ---
  prompt: string;                         // Image generation prompt
  promptSettings?: {                      // Extended prompt metadata from promptTool
    modality: 'image' | 'video';
    quality: string;
    aspectRatio: string;
    promptSetID?: string;
    promptSetName?: string;
  };

  // --- Source ---
  source: {
    appName: string;                      // 'video-system' | 'PromptTool' | future apps
    appId: string;                        // Machine-readable identifier
    artifactId: string;                   // ID of the source artifact in the origin app
    liveUrl?: string;                     // Deep link (e.g. https://prompttool-v0.web.app/gallery/{id})
  };

  // --- Projects Using This Asset ---
  projectLinks: ProjectLink[];            // Many-to-many

  // --- Timestamps ---
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectLink {
  projectId: string;
  projectName: string;
  projectUrl: string;                     // Relative link within video-system
}
```

### 5.2 API Routes

```
src/app/api/
  media-library/
    route.ts                              # GET (list), POST (create)
    [id]/route.ts                         # GET, PATCH, DELETE single entry
    [id]/projects/route.ts                # POST add project link, DELETE remove
    import/route.ts                       # POST import from promptTool
```

### 5.3 UI Components (video-system)

The Media Library will be implemented as a **top-level navigation item** in the primary sidebar/header.

```
src/components/media-library/
  MediaLibrary.tsx                        # Main gallery view with filters
  MediaLibraryCard.tsx                    # Asset card (thumbnail, meta, source badge)
  MediaLibraryDetail.tsx                  # Full detail modal
  ImportFromPromptTool.tsx                # Browse & import from promptTool
  SourceBadge.tsx                         # Visual indicator of asset origin
```

---

## 6. Workstream D — Auto-Publish Pipeline

### 6.1 Flow: video-system Generates Media

When `video-system` generates a media artifact (e.g., an image for a visual cue):

```
1. Image generated → stored in Firebase Storage
                   → VisualCue.url set

2. Auto-add to Media Library (video-system)
   └── Create MediaLibraryEntry
       ├── source.appName = 'video-system'
       ├── source.artifactId = visualCue.id
       ├── projectLinks = [{ projectId, projectName }]
       └── prompt = visualCue.description

3. Auto-publish to PromptTool (via PromptToolBridge)
   ├── Copy media file in Firebase Storage from video-system path to prompt-tool path
   ├── Create image set in prompttool-db-0
   │   ├── promptSetID = auto-generated
   │   └── promptSetName = project.title
   │
   ├── For each generated image:
   │   └── Create GeneratedImage doc in prompttool-db-0
   │       ├── imageUrl = New PromptTool Storage URL
   │       ├── prompt = visualCue.description
   │       ├── promptSetID = from above
   │       └── userId = current user
   │
   └── Create SECOND MediaLibraryEntry (the promptTool mirror)
       ├── source.appName = 'PromptTool'
       ├── source.artifactId = promptTool image doc ID
       ├── source.liveUrl = https://prompttool-v0.web.app/gallery/{imageId}
       └── projectLinks = [{ same project }]
```

### 6.2 Implementation Location

| File | Change |
|---|---|
| `video-system/src/lib/services/ai.ts` | After image generation, call `MediaLibraryService.addEntry()` |
| `video-system/src/lib/services/media-library.ts` | **NEW** — MediaLibraryService with CRUD + auto-publish |
| `video-system/src/lib/services/prompttool-bridge.ts` | **NEW** — Cross-DB writes |

### 6.3 Idempotency

- Each MediaLibraryEntry stores `source.artifactId` — duplicates are detected and skipped.
- PromptTool image creation checks for existing `promptSetID + userId + imageUrl` combos.

---

## 7. Workstream E — Dev Environment & Testing

### 7.1 Recommended Dev Setup (Win11 / WSL)

```
WSL Terminal Layout (use tmux or 4 terminal panes):

┌─────────────────────────────┬─────────────────────────────┐
│  Pane 1: video-system       │  Pane 2: promptTool         │
│  cd .../VideoSystem/...     │  cd .../PromptTool          │
│  PORT=3001 npm run dev      │  npm run dev (port 3000)    │
├─────────────────────────────┼─────────────────────────────┤
│  Pane 3: promptResources    │  Pane 4: Tests / Git        │
│  cd .../PromptResources     │  npm test / curl / logs     │
│  PORT=3002 npm run dev      │                             │
└─────────────────────────────┴─────────────────────────────┘
```

### 7.2 Port Assignments

| App | Port | Env Var |
|---|---|---|
| `promptTool` | 3000 | default |
| `video-system` | 3001 | `PORT=3001` or `next dev -p 3001` |
| `promptResources` | 3002 | `PORT=3002` or `next dev -p 3002` |

### 7.3 Dual Antigravity Approach

**Recommended:**
1. **Primary instance** — Workspace: `video-system` (where most new code lives)
2. **Secondary instance** — Workspace: `PromptTool` (for changes required on that side)

Both instances can safely edit their respective repos simultaneously. The bridge services are server-side only and connect via Firestore Admin SDK, so there's no port collision risk.

> **Tip:** When the change to `promptTool` is small (e.g., adding a sync endpoint), it may be faster to edit from the primary instance since you have full file system access.

### 7.4 Test Plan

| # | Test | Method | Validates |
|---|---|---|---|
| T1 | **promptResources ↔ promptTool integrity** | From promptTool UI, save/unsave a resource | Existing bridge not broken |
| T2 | **Cross-app user sync (VS → PT)** | Create user in video-system → verify user doc in prompttool-db-0 | Workstream A |
| T3 | **Cross-app user sync (PT → VS)** | Create user in promptTool → verify user doc in autovideo-db-0 | Workstream A |
| T4 | **PromptTool Bridge reads** | From video-system, call `GET /api/prompttool/resources` | Workstream B |
| T5 | **Media Library CRUD** | Create, read, update, delete MediaLibraryEntry via API | Workstream C |
| T6 | **Auto-publish pipeline** | Generate media in VS project → verify Media Library + prompttool-db-0 | Workstream D |
| T7 | **Duplicate publish idempotency** | Re-trigger media generation → verify no duplicate entries | Workstream D |
| T8 | **Source links** | Verify promptTool-sourced entries contain valid `liveUrl` | Workstream C+D |

### 7.5 Test Script (curl-based smoke tests)

```bash
#!/bin/bash
# T1: Verify promptResources bridge still works
echo "T1: PromptResources Bridge..."
curl -s http://localhost:3000/api/resources?mode=all | jq '.success'

# T4: PromptTool Bridge from video-system
echo "T4: PromptTool Bridge..."
curl -s -H "Authorization: Bearer mock-token" \
  http://localhost:3001/api/prompttool/resources | jq '.success'

# T5: Media Library CRUD
echo "T5: Media Library..."
curl -s -H "Authorization: Bearer mock-token" \
  http://localhost:3001/api/media-library | jq '.success'
```

---

## 8. Implementation Order

> Each phase has a hard gate: do not start the next until the current passes its tests.

| Phase | Workstream | Depends On | Effort | Recommended Model | Reason |
|---|---|---|---|---|---|
| **Phase 1** | E — Dev env setup | Nothing | 30 min | **Gemini Flash** | Pure shell commands & config — no reasoning depth needed |
| **Phase 2** | A — User identity sync | Phase 1 | 2-3 hrs | **Claude 3.5 Sonnet** | Cross-DB auth logic, field mapping, subtle TypeScript types |
| **Phase 3** | B — PromptTool Bridge service | Phase 2 | 2-3 hrs | **Claude 3.5 Sonnet** | Mirrors existing bridge exactly — needs precision to avoid breaking existing API |
| **Phase 4** | C — Media Library data model + CRUD | Phase 1 | 3-4 hrs | **Gemini 1.5 Pro** | Solid CRUD pattern, new Firestore schema — well within Pro capability |
| **Phase 5** | D — Auto-publish pipeline | Phase 3 + 4 | 3-4 hrs | **Claude 3.5 Sonnet** | Complex multi-step orchestration: Storage copy + DB writes + idempotency across 2 apps |
| **Phase 6** | C — Media Library UI components | Phase 4 | 4-5 hrs | **Gemini Flash** | UI boilerplate, cards, modals — speed wins here |
| **Phase 7** | Full integration testing (T1-T8) | All above | 1-2 hrs | **Gemini 1.5 Pro** | Interpreting test output, curl scripts, Firestore verification |

---

## 8.1 Model Quick Reference

| Model | Codename | When to Use |
|---|---|---|
| **Claude 3.5 Sonnet** | The Precision Tool | Cross-app logic, admin SDK config, auth flows, anywhere a wrong assumption breaks two apps |
| **Gemini 1.5 Pro** | The Main Driver | Standard Next.js API routes, Firestore CRUD, data modelling, debugging output |
| **Gemini Flash** | The Speed Runner | Shell commands, UI scaffolding, boilerplate generation, test scripts |
| **Claude 3 Opus** | The Last Resort | Only if Sonnet + Pro are both stuck on a deep architectural bug. Very slow — use sparingly |

---

## 9. Risk Register

| Risk | Mitigation |
|---|---|
| Breaking existing promptTool-promptResources API | T1 test validates integrity before and after every change |
| Firestore cross-DB permission issues | All apps use same service account; already proven by existing bridge |
| Storage URL accessibility across apps | Assets are in shared Firebase Storage bucket — URLs work universally |
| Duplicate media entries on retry/re-render | Idempotency checks via `source.artifactId` dedup |
| Port conflicts in dev | Fixed port assignment table; enforced in `next dev` commands |

---

## 10. Workstream F — Bidirectional Sync

If a user edits an image's metadata (name/description) in PromptTool, the change should propagate back to the Media Library entry in VideoSystem.

### 10.1 Mechanism
VideoSystem's `MediaLibraryService` will implement a "Sync Hook":
1. When viewing the Media Library, the UI will trigger a background sync check for any entries where `source.appName == 'PromptTool'`.
2. A server-side routine will query `prompttool-db-0` for the current state of those `source.artifactId` values.
3. If a discrepancy is found (e.g. description changed), the `autovideo-db-0/mediaLibrary` entry is updated.

---

## 11. Open Questions (Resolved)

1. **PromptTool live URL format** — ✅ `https://prompttool-v0.web.app/gallery/{imageId}`
2. **Image storage strategy** — ✅ Explicitly **copy** to PromptTool storage paths (ensures isolated file lifecycle).
3. **Media Library UI placement** — ✅ **Top-level** navigation item in `video-system` sidebar.
4. **Bidirectional sync** — ✅ Supported via background sync refresh when Media Library is opened.
5. **Backfill existing users** — ✅ A one-time **Migration Script** will be built in Phase 7 to sync all existing users from both DBs.
6. **Role mapping** — ✅ Admin/SU roles are preserved cross-app. `admin` in VS → `admin` in PT, `su` → `su`.
7. **Media Library scope** — ✅ **Private (Option A)**: Users see only their own media assets.

---

> **Next Step:** Review this design. Once approved, I will invoke the `plan-writing` skill to generate the detailed implementation checklist for Phase 1.
