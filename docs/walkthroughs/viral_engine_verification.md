# 📱 Viral Shorts Engine Manual Verification Plan

This guide helps you manually verify the end-to-end "Viral Candidate -> 9:16 Render" flow in the **Director's Suite**.

---

## 🏗️ Step 1: Candidate Generation
1.  **Open a Project**: Navigate to any project on your dashboard that has a completed script.
2.  **Open Director's Suite**: Click the **🎛️ Director's Suite** button (top right header).
3.  **Trigger Analysis**: In the drawer, locate the **"Viral Shorts Engine"** section and click **🚀 Find Viral Clips**.
4.  **Verification**: 
    *   Confirm the button shows an **"Analyzing..."** state with a spinner.
    *   Wait ~5-10 seconds; confirm **exactly 3 candidates** appear with titles, descriptions, and "Viral Scores".
    *   Verify the **Hook Type** (e.g., "Mystery", "Fact") is displayed for each.

## 🎬 Step 2: Vertical Render Launch
1.  **Select a Short**: Choose the candidate with the highest score.
2.  **Launch Render**: Click **🚀 Launch Short** on that candidate.
3.  **Real-Time Progress**: 
    *   Verify the button text changes to **"Baking... [0-100]%"**.
    *   Confirm the progress updates periodically (this indicates the backend `shorts/render` API is talking to the Render Engine accurately).
    *   Verify you can close the drawer and come back later without losing the progress state.

## 🎞️ Step 3: Final Quality Check
1.  **Download**: Once the status dot turns green and the button says **"Download Short"**, click it.
2.  **Visual Inspection**:
    *   Confirm the video aspect ratio is **Vertical (9:16)**.
    *   Confirm the content is **Center-Filled** (no black bars).
    *   Confirm **Bold Subtitles** are visible and correctly scaled for the narrow format.
3.  **Audio Sync**:
    *   Ensure the short starts with a strong audio hook.
    *   Verify the background music is present and ducks appropriately under the narration.

## 🛠️ Diagnostics (If things go wrong)
*   **Failed Render**: If the button turns red and says "Retry Render", the FFmpeg fallback might have hit a resource limit. Try again or check server logs.
*   **0% Progress Stuck**: This usually means the render is in the queue. Wait ~15 seconds for the first update.
*   **Missing Download**: If the button changes to "ready" but the download fails, check your internet connection or Google Cloud Storage permissions.

---
**Status:** 🧪 Ready for Manual Validation
