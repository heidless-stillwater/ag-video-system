# RES_TOOL_1 — Phase 1: Dev Environment Setup

> **Model:** Gemini Flash (or current model — pure config, no deep reasoning needed)
> **Gate:** Must pass all ✅ checks before starting Phase 2

## Goal
Establish a stable 3-app local dev environment (video-system:3001, promptTool:3000, promptResources:3002) so all subsequent phases can be built and tested simultaneously.

---

## Tasks

- [ ] **1. Verify port assignments** — confirm no process is using 3000/3001/3002
  → Verify: `lsof -i :3000 && lsof -i :3001 && lsof -i :3002` returns no conflicts

- [ ] **2. Set video-system to port 3001** — add `PORT=3001` to `video-system/.env.local`
  → Verify: `npm run dev` in video-system starts on `http://localhost:3001`

- [ ] **3. Set promptResources to port 3002** — add `PORT=3002` to `PromptResources/.env.local`
  → Verify: `npm run dev` in PromptResources starts on `http://localhost:3002`

- [ ] **4. Confirm promptTool runs on 3000** — no change needed, validate
  → Verify: `npm run dev` in PromptTool starts on `http://localhost:3000`

- [ ] **5. Set up tmux layout** — 4-pane layout (VS | PT | PR | Tests)
  → Verify: All 3 apps running simultaneously with no port collisions

- [ ] **6. Smoke test all 3 health endpoints** — confirm each app responds
  → Verify: `curl http://localhost:3000/api/health`, `curl http://localhost:3001/api/health`, `curl http://localhost:3002/api/health` all return 200

- [ ] **7. Confirm Firebase project shared** — check `.firebaserc` in all 3 apps
  → Verify: All 3 show `"default": "heidless-apps-0"` — same project ID

- [ ] **8. Add `PROMPTTOOL_URL` env var to video-system** — needed by the bridge
  → Add `PROMPTTOOL_URL=https://prompttool-v0.web.app` to `video-system/.env.local`
  → Verify: `process.env.PROMPTTOOL_URL` is accessible in a test API route

---

## Done When

- [ ] All 3 apps run simultaneously on ports 3000, 3001, 3002 with no conflicts
- [ ] All 3 health endpoints return 200
- [ ] All 3 `.firebaserc` files confirm `heidless-apps-0` as the shared project
- [ ] `PROMPTTOOL_URL` env var is set in video-system

## Notes
- tmux is the recommended terminal multiplexer on WSL. Install with `sudo apt install tmux` if not present.
- If a health endpoint doesn't exist, `curl` the root route and accept a 200 or redirect as passing.
- Port 3001 for video-system is enforced via `next dev -p 3001` in `package.json` or `PORT=3001` in `.env.local`.
