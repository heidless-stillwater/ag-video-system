# RES_TEST_0 — User Identity Synchronization Verification

## 🎯 Objective
Verify that user profiles and roles are correctly synchronized across `video-system` and `prompt-tool` in real-time upon account creation.

## 🛠️ Prerequisites
- [ ] `video-system` running on [http://localhost:3001](http://localhost:3001)
- [ ] `prompt-tool` running on [http://localhost:3000](http://localhost:3000)
- [ ] Access to the Firebase Console ([heidless-apps-0](https://console.firebase.google.com/))
- [ ] Two distinct test Google Accounts (or use one and delete profile between tests)

---

## 🧪 Test Case 1: VideoSystem → PromptTool Sync
**Scenario:** A new user signs up via VideoSystem. A matching profile should appear in PromptTool's database.

### Steps:
1. [ ] **Clean Slate**: Go to Firebase Console -> Firestore.
   - Delete `users/{uid}` in `autovideo-db-0` (if exists).
   - Delete `users/{uid}` in `prompttool-db-0` (if exists).
2. [ ] **VideoSystem Sign-in**: Navigate to [http://localhost:3001](http://localhost:3001).
   - Click "Sign in with Google".
   - Complete authentication.
3. [ ] **Verify VS Profile**: Check Firestore `autovideo-db-0/users/{uid}`.
   - [ ] Document exists.
   - [ ] `roles` includes `['user']`.
4. [ ] **Verify PT Sync**: Check Firestore `prompttool-db-0/users/{uid}`.
   - [ ] Document exists.
   - [ ] `role` is `member`.
   - [ ] `syncedFrom` is `video-system`.
5. [ ] **Console Log Check**:
   - Check `video-system` browser console for: `[AuthContext] PromptTool sync result: User synced to PromptTool successfully.`

---

## 🧪 Test Case 2: PromptTool → VideoSystem Sync
**Scenario:** A new user signs up via PromptTool. A matching profile should appear in VideoSystem's database.

### Steps:
1. [ ] **Clean Slate**: (Use a different test account or delete previous records).
2. [ ] **PromptTool Sign-in**: Navigate to [http://localhost:3000](http://localhost:3000).
   - Click "Get Started" / Sign in.
3. [ ] **Verify PT Profile**: Check Firestore `prompttool-db-0/users/{uid}`.
   - [ ] Document exists.
   - [ ] `role` is `member`.
4. [ ] **Verify VS Sync**: Check Firestore `autovideo-db-0/users/{uid}`.
   - [ ] Document exists.
   - [ ] `roles` includes `['user']`.
   - [ ] `syncedFrom` is `promptTool`.
5. [ ] **Console Log Check**:
   - Check `prompt-tool` browser console for: `[Auth] VideoSystem sync result: User synced to VideoSystem successfully.`

---

## 🧪 Test Case 3: Admin Role Mapping
**Scenario:** Verify that elevated roles are preserved across the bridge.

### Steps:
1. [ ] **Promotion**: Manually edit a user in `autovideo-db-0/users/{uid}`.
   - Change `roles` to `['admin']`.
2. [ ] **Trigger Sync**: (Currently, sync triggers on creation. For this test, delete the PT user first).
   - Delete `prompttool-db-0/users/{uid}`.
3. [ ] **Sign back into VS**:
   - Since the profile exists in VS, the `AuthContext` logic may need to be verified if it fires on login for existing users OR wait for Phase 7 backfill script.
   - *Refined Step*: Call the endpoint manually via Postman/Curl using the ID Token:
     ```bash
     curl -X POST http://localhost:3001/api/auth/sync-user -H "Authorization: Bearer YOUR_TOKEN"
     ```
4. [ ] **Verify Role**: Check `prompttool-db-0/users/{uid}`.
   - [ ] `role` should be `admin`.

---

## 🏁 Success Criteria
- [ ] Users created in one app automatically have a profile in the other.
- [ ] Roles are mapped correctly (Admin -> Admin, User -> Member).
- [ ] Metadata fields (`email`, `displayName`, `photoURL`) are consistent.
- [ ] Sync is non-blocking (UI remains responsive even if sync is slow).

## 🧹 Teardown
1. [ ] Delete test users from both Firestore databases.
2. [ ] (Optional) Delete test users from Firebase Authentication.
