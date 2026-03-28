# PHASE_1_INFRA_PLAN — Rendering Infrastructure Scaling

**Date:** 2026-03-23
**Status:** 📝 DRAFT (Pending Approval)

## 1. Goal
Offload the heavy, CPU-intensive **FFmpeg** rendering process from the Next.js API server to a dedicated **Google Cloud Run** service. This will prevent system timeouts, unblock Serverless deployments (like Vercel, which limits background task execution), and allow seamless horizontal scaling for multiple simultaneous rendering jobs.

---

## 2. Current Architecture vs. Target Architecture

### AS-IS (Monolithic)
- User requests render -> `POST /api/projects/[id]/render`
- API triggers `renderEngine.renderDocumentary()` asynchronously and returns `200 OK`.
- Next.js server runs FFmpeg locally in the background.
- Next.js updates Firestore directly.
- **Problem**: Does not work on Vercel/Serverless (process dies after response). High chance of OOM (Out of Memory) or CPU starvation if multiple users render at once.

### TO-BE (Decoupled Cloud Run Worker)
- User requests render -> `POST /api/projects/[id]/render`
- API validates credits and forwards a `POST` request (the render payload) to the **Cloud Run Worker**.
- API returns `200 OK` to the client.
- **Cloud Run Worker** downloads assets, runs FFmpeg, uploads to Google Cloud Storage.
- **Cloud Run Worker** updates Firestore progress (0% -> 100%) and final video status.

---

## 3. Implementation Steps

### Step 1: Create `render-worker` Microservice
- Create a new directory `/render-worker` at the root of the project.
- Initialize a fresh Node.js (Express) project.
- Set up a highly optimized `Dockerfile` (using a Debian base image that explicitly installs `ffmpeg`).

### Step 2: Migrate FFmpeg Logic
- Copy the core FFmpeg stitching, slicing, and concatenating functions from `src/lib/services/render-engine.ts` into the new worker.
- Equip the worker with the **Firebase Admin SDK** so it can update the `projects/{id}` document with `renderProgress`, `renderMessage`, and `downloadUrl` directly.

### Step 3: Refactor Next.js App
- Strip down the massive `render-engine.ts` in the main web app. It will now act exclusively as a "client" that sends JSON payloads to the Cloud Run URL.
- Remove `fluent-ffmpeg`, `ffmpeg-static`, and `ffprobe-static` heavy dependencies from the Next.js `package.json` to speed up Next.js builds and reduce bundle size.

### Step 4: Security & Deployment
- Secure the worker endpoint so only the Next.js app can trigger it (via an API key or IAM service account token).
- Configure Cloud Run `gcloud` deployment flags for high performance: `--memory=4Gi --cpu=2 --no-cpu-throttling --timeout=3600s`.

---

## 4. Work Breakdown (Approvals)

If this plan is approved, I will present the work in small, reviewable chunks:
- **Chunk A**: Scaffold the `render-worker` and its `Dockerfile`.
- **Chunk B**: Migrate the Next.js render engine logic into the worker and add Firestore Admin updates.
- **Chunk C**: Refactor Next.js to call the new service and remove old dependencies.

---
> **Next Action upon Approval**: "Proceed with Chunk A — Scaffolding the render-worker."
