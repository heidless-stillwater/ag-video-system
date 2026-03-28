# RES_TOOL_1 — Phase 2: User Identity Sync

> **Model:** Claude 3.5 Sonnet
> **Gate:** Must pass ✅ [T2] and [T3] tests (VS → PT sync, PT → VS sync)

## Goal
Implement automatic, cross-app user profile creation. When a user logs into one app via Google, their profile document is automatically created/updated in both `autovideo-db-0` and `prompttool-db-0`.

---

## Tasks

### 2.1 VideoSystem Side (vs → pt)
- [ ] **1. Create `src/lib/firebase-prompttool-bridge.ts`**
  → Initialize Firestore for `prompttool-db-0` using the existing Admin app.
- [ ] **2. Create `src/app/api/auth/sync-user/route.ts`**
  → Authenticated route that uses the bridge to check for/create a profile in `prompttool-db-0`.
- [ ] **3. Modify `src/lib/auth/AuthContext.tsx`**
  → Trigger a `fetch('/api/auth/sync-user', { method: 'POST' })` after a new user profile is created in `video-system`.

### 2.2 PromptTool Side (pt → vs)
- [ ] **4. Create `PromptTool/src/lib/firebase-videosystem-bridge.ts`**
  → Initialize Firestore for `autovideo-db-0`.
- [ ] **5. Create `PromptTool/src/app/api/auth/sync-user/route.ts`**
  → Authenticated route to sync profile to `video-system`.
- [ ] **6. Modify `PromptTool/src/lib/auth-context.tsx`**
  → Trigger sync POST after local profile creation.

### 2.3 Verification
- [ ] **7. Test VS → PT**
  → Sign in to a fresh account on `localhost:3001` → Verify doc appears in `prompttool-db-0/users`.
- [ ] **8. Test PT → VS**
  → Sign in to a fresh account on `localhost:3000` → Verify doc appears in `autovideo-db-0/users`.

---

## Done When
- [ ] Logging into `video-system` creates a profile in `promptTool` Firestore.
- [ ] Logging into `promptTool` creates a profile in `video-system` Firestore.
- [ ] Both systems handle `admin` and `su` role mapping correctly.

## Notes
- Roles should be mapped: `admin` -> `admin`, `su` -> `su`.
- Use `adminAuth.verifyIdToken` in the sync routes to ensure only the logged-in user can trigger their own sync.
