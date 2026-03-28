# Personas System Refactored

The research persona system has been fully refactored to support dynamic, persistent agents.

## Key Fixes
1. **401 Unauthorized**: Fixed by updating role extraction in middleware and ensuring session sync in `AuthContext`.
2. **Gemini 404/403**: Fixed by switching default model to `gemini-1.5-flash` in all strategies and health checks.
3. **Dynamic Orchestration**: `ResearchOrchestrator` and `StillwaterResearchService` now fetch personas from Firestore.

## New Features
- **Persona Management UI**: Access at `/admin/research/personas` to manage your agents.
- **Auto-Seeding**: The system automatically seeds defaults if none exist.
- **Protected Seeding**: The `/api/admin/seed-personas` route is now restricted to admins.

Check the artifact `implementation_report.md` for full details.
