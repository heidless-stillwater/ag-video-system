# Research Phase UI Analysis

This document summarizes the layout and components of the **Research Phase** UI in the VideoSystem application, based on recent visual inspection.

## Top-Half Layout Architecture

The top half of the Research page is designed to provide immediate context and control for the research mission.

### 1. Global Navigation Bar
*   **Branding**: Left-aligned "VideoSystem.ai" logo.
*   **Primary Links**: Navigation for "New Project" and "Topics."
*   **User State**: Right-aligned credit counter showing available "Hobbyist" credits.
*   **System Controls**: Icons for notifications/health and an environment toggle.

### 2. Project Mission Header
*   **Navigation**: A "Dashboard" back link for context switching.
*   **Title & Status**: The project title (e.g., "The Science of Dreams") with status badges (e.g., `DRAFT`, `RESEARCHING`).
*   **Execution Metrics**: Indicators for project duration and the current environment mode (e.g., `STAGING (REAL AI)`).
*   **Action Cluster**: Buttons to delete, edit settings, or export the project.
*   **Style Badge**: Visual confirmation of the chosen cinematic style.

### 3. Progressive Step Bar
A full-width progress indicator showing the user's journey through the pipeline:
1.  **RESEARCH** (Active Highlight)
2.  **SCRIPTING**
3.  **MEDIA**
4.  **ASSEMBLY**

### 4. Phase Command Center (Central Focus)
The primary interaction element in the top half is the **Research Status Card**.

*   **Launch Control**: If research hasn't started, a central **"Launch Research Phase"** button is displayed.
*   **Live Feedback**: During active research, this card displays a terminal-like stream of events (e.g., "Agent Deployment," "Fact Extraction").
*   **Phase Transition**: Once research is complete, the card provides the path to the next phase: **"Generate Documentary Script."**

## Design Aesthetic
*   **Theme**: Dark mode with high-contrast accent colors (Deep Blue, Emerald Green).
*   **Feel**: Professional, "Mission Control" aesthetic, utilizing cards and glassmorphism for depth.
*   **Responsiveness**: The layout maintains strict hierarchy with a clean horizontal split to the Intelligence Dashboard below.
