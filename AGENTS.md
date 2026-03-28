# AGENTS.md — Persistent Agent Instructions (Video System Project)

> This file is read automatically at the start of **every** Antigravity session.
> It establishes mandatory behaviours for all agents working in this repository.

---

## 🟢 SESSION START — Mandatory Boot Sequence

**At the very beginning of every new conversation, before doing anything else, you MUST:**

1. **Invoke the `session-manager` skill** by reading `.agent/skills/session-manager/SKILL.md`.
2. **Check for an existing `SESSION_SNAPSHOT.md`** in the project root.  
   - If one **exists**: Read it, summarise its contents to the user, and ask: _"I found a previous session snapshot. Shall I resume from this checkpoint?"_
   - If **none exists**: Announce to the user: _"👋 No previous session snapshot found. Starting fresh."_
3. **Prompt the user once** at session start:
   > "🗂️ **Session Manager active.** I'll remind you to checkpoint every ~15 messages or when a major task completes. Type `save session` at any time to trigger a snapshot."

---

## 🔁 Periodic Session-Save Reminders

Throughout every conversation, you MUST remind the user to checkpoint in these situations:

| Trigger | Action |
|---|---|
| Every **~15 messages** exchanged | Print a 🔔 reminder: _"Checkpoint reminder — would you like me to save the current session state?"_ |
| A task in the plan is marked **complete** | Run the session-manager's Required Actions automatically |
| User says **"save session"**, **"checkpoint"**, **"stop"**, **"quota"**, **"limit"** | Immediately execute a full `SESSION_SNAPSHOT.md` save |
| Before any **large refactor or migration** begins | Ask: _"Shall I save a snapshot before we start this change?"_ |

---

## 📋 Project Context

- **Project:** Video System (Next.js 15 / Firebase / Vertex AI)
- **Stack:** TypeScript, Next.js App Router, Firestore, Firebase Auth, Google Cloud Vertex AI (Gemini)
- **Key config files:** `.antigravityignore`, `.env.local`, `firebase.json`, `firestore.rules`
- **Skills directory:** `.agent/skills/`

---

## ⚙️ Standing Preferences

- **Sequential execution only** — Do NOT parallelize agent tasks. Run one task at a time to avoid HTTP 503 quota exhaustion (see conversation history for context).
- **Confirm before large changes** — Always show a plan and wait for approval before modifying more than 3 files at once.
- **Commit after every major milestone** — Propose a `git commit` with a conventional commit message after each completed task.
- **Context hygiene** — If the conversation exceeds 20 messages without a checkpoint, proactively offer to save and suggest starting a new session.

---
# Project Rules: [video-system]
- **Environment**: This project runs in WSL2 (Ubuntu).
- **Paths**: Always use forward slashes (/). Never use backslashes.
- **Terminal**: Use `zsh`. If you need to run a command, assume we are in a Linux shell.
- **WSL Quirk**: When generating file paths for browser previews, use `localhost:3000` (Windows bridge) rather than the internal Linux IP.