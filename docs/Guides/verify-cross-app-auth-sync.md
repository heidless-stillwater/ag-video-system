# Verification Guide: Cross-App Auth Sync (Phase 2)

> ✅ **VERIFIED COMPLETE — 2026-03-29**  
> Manually walked through all steps. Auth sync confirmed working end-to-end.

> **Date:** 2026-03-29  
> **Changes covered:**  
> - `src/lib/firebase-prompttool-bridge.ts` — New bridge to sync users into `prompttool-db-0`  
> - `src/app/api/auth/sync-user/route.ts` — Refactored to always merge, not just create  
> - `src/lib/auth/AuthContext.tsx` — Sync now fires for all sign-ins, not just new users  

---

## Prerequisites

- All three dev servers running:
  - VideoSystem → `http://localhost:3000`
  - PromptTool → `http://localhost:3001`
  - PromptResources → `http://localhost:3002`
- Browser DevTools open (F12)

---

## Step 1 — Verify Sync Fires on Sign-In

1. Open `http://localhost:3000` in your browser.
2. Sign **out** if already logged in.
3. Open the **Console** tab in DevTools.
4. Sign **in** with your Google account.
5. Watch the console for this sequence of logs:

```
[AuthContext] User profile snapshot received. Exists: true
[AuthContext] Setting user state from Firestore
[PromptTool Bridge] Successfully synced user <UID> to prompttool-db-0
```

> ✅ **Pass:** All three lines appear, no errors.  
> ❌ **Fail:** `PromptTool sync failed` appears — check the API route logs in the terminal.

---

## Step 2 — Verify the API Route Response

In DevTools, switch to the **Network** tab and filter by `sync-user`.

1. Sign out and sign back in.
2. Find the `POST /api/auth/sync-user` request.
3. Check the response body — it should be:

```json
{ "message": "User successfully synced to PromptTool.", "synced": true }
```

> ✅ **Pass:** Status `200` and `synced: true`.  
> ❌ **Fail:** Status `401` means token wasn't attached. Status `404` means your user profile doesn't exist in `autovideo-db-0`.

---

## Step 3 — Verify the PromptTool Database Record

Run this admin script from the project root to confirm the user exists in `prompttool-db-0`:

```bash
npx tsx verify_sync.ts
```

Expected output:
```
✅ User found in VideoSystem. UID: <your-uid>
✅ User found in PromptTool (prompttool-db-0)
Role: admin (or user)
Synced At: <timestamp>
```

> ✅ **Pass:** Both databases show the user with a matching role.  
> ❌ **Fail:** `User NOT found in PromptTool` — the bridge write failed. Check terminal logs from the dev server.

---

## Step 4 — Verify Role Propagation

If the user has `su` or `admin` roles in VideoSystem, confirm they are mapped correctly in PromptTool:

| VideoSystem Role | PromptTool Role |
|---|---|
| `su` or `admin` | `admin` |
| `user` | `user` |

Check in Firebase Console → `heidless-apps-0` → Firestore → `prompttool-db-0` → `users` → `<your-uid>` → `role` field.

---

## Step 5 — Verify Repeat Sync (Idempotency)

Sign out and sign in a **second time**.

1. Check the console — the bridge log should appear again with **no errors**.
2. The user doc in `prompttool-db-0` should show an updated `lastSync` timestamp.

> ✅ **Pass:** No duplicate documents created, `lastSync` is updated.  
> ❌ **Fail:** Errors appear on second sign-in — the `merge: true` flag may have been lost.

---

## Quick Checklist

- [ ] `[PromptTool Bridge] Successfully synced user...` appears in console on sign-in
- [ ] `/api/auth/sync-user` returns `200` with `synced: true`
- [ ] `verify_sync.ts` confirms user in both databases
- [ ] Role mapping is correct
- [ ] Second sign-in works without errors
