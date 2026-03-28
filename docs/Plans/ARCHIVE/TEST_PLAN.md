# 🧪 Checklist: Credit Enforcement Test Plan

Use this checklist to track your manual verification of the Credit Enforcement system. 

## 📊 Progress Summary
- [ ] Prerequisites Met
- [ ] Test Suite 1: Blocking (Zero Credits)
- [ ] Test Suite 2: Consumption (Pay-as-you-go)
- [ ] Logs Verified

---

## 🛠️ Phase 0: Setup
- [ ] **Dev Server**: `npm run dev` is running.
- [ ] **Auth**: Logged in with a test account.
- [ ] **Project Target**: `heidless-apps-0` selected.

### Credit Utilities
- [x] **CLI Utility**: `npm run manage:credits -- <email> <amount>`
- [x] **Admin GUI**: Located at `/admin/tools`

---

## 🧪 Phase 1: Blocking (0 Credits)
**Setup**: Run `npm run manage:credits -- your-email@example.com 0`

- [ ] **Research blocking**
    - [ ] Go to "New Project"
    - [ ] Click "Automate Research"
    - [ ] *Expect*: Credit error modal/toast
- [ ] **Script blocking**
    - [ ] Open project without script
    - [ ] Click "Generate AI Script"
    - [ ] *Expect*: Immediate fail message
- [ ] **TTS blocking**
    - [ ] Open script-ready project
    - [ ] Click 🎙️ (Microphone) icon
    - [ ] *Expect*: No audio generation
- [ ] **Dubbing blocking**
    - [ ] Open Director's Suite
    - [ ] Click "Launch Dub"
    - [ ] *Expect*: "Payment Required" message

---

## 🧪 Phase 2: Consumption (10 Credits)
**Setup**: Run `npm run manage:credits -- your-email@example.com 10`

- [ ] **Automate Research** (-1)
    - [ ] Current balance check: `9`
- [ ] **Generate Audio section** (-1)
    - [ ] Current balance check: `8`
- [ ] **Synthesize All Media** (-1)
    - [ ] Current balance check: `7`
- [ ] **Launch Dubbing** (-2)
    - [ ] Current balance check: `5`
- [ ] **Render Video** (-1)
    - [ ] Current balance check: `4`

---

## 🧪 Phase 4: Admin Tools (GUI Verification)
- [ ] **Email Top-Up**
    - [ ] Open `/admin/tools`
    - [ ] Enter target user email
    - [ ] Enter `100` credits
    - [ ] Click "Add Credits"
    - [ ] *Expect*: Success message and balance updated in DB
- [ ] **User ID Top-Up**
    - [ ] Enter target User ID (from Firestore)
    - [ ] Enter `50` credits
    - [ ] Click "Add Credits"
    - [ ] *Expect*: Success message

---

## 🔍 Phase 3: Audit (Backend Logs)
Check your server terminal for these entries:
- [ ] `[Research API] Deducted 1 credit...`
- [ ] `[Media API] Deducted 1 credit...`
- [ ] `[TTS API] Deducted 1 credit...`
- [ ] `[Dub API] Deducted 2 credits...`

---

## 🚩 Quick Troubleshoot
- **Balance not updating?** Hard refresh (Ctrl+R/Cmd+R).
- **500 Error?** Check if Service Account has proper permissions on `heidless-apps-0`.
- **User not found?** Verify email matches EXACTLY (case-sensitive in some providers).

---
*Last Updated: 2026-03-13*
