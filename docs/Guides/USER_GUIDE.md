# VideoSystem User Guide: From Topic to Documentary

Welcome to the VideoSystem! This guide will walk you through the end-to-end process of generating a professional, cinematic sleep-optimized documentary. Whether you're a content creator or an enthusiast, this step-by-step walkthrough will help you master our high-craft video engine.

---

## 🏗️ The Multi-Phase Workflow

Generating a video isn't just a single click. Our system uses a **pipelined approach** to ensure the highest quality content.

### Phase 1: Draft (The Seed)
**Why it's used**: Every project starts as a "Draft". This is where you define the core intent of your video—the **Topic**.
**How to use it**:
1.  Navigate to the **Research** dashboard.
2.  Click **"CREATE NEW PROJECT"**.
3.  Enter a descriptive Topic (e.g., *"The history of ancient salt trade"* or *"The science of deep-sea bioluminescence"*).
4.  Selected a **Persona** (The Lead Researcher). 
    *   *Tip*: Choose **The Historian** for chronological stories, or **The Scientist** for technical/mechanical deep dives.

---

### Phase 2: Research (The Discovery) 🔍
**Why it's used**: This is the engine's "brain" at work. Instead of hallucinating, the system dispatches a cluster of AI agents to scour sources, extract verified facts, and build a structural outline.
**How to use it**:
1.  Click **"🚀 LAUNCH MISSION"** on your draft.
2.  **Watch the Telemetry**: You will see real-time "logs" from different agents (e.g., The Neutralist, The Historian). 
3.  **The Result**: Once complete, the system will have gathered a library of **Sources** and **Facts**. These are the "building blocks" for your script.

> **Local Development Insight**: When running on `localhost`, ensure your `.env.local` has valid AI API keys (Google Gemini, etc.). The "Live Research" uses real-time semantic search to find actual articles and data even in development mode.

---

### Phase 3: Scripting (The Story) ✍️
**Why it's used**: This transforms raw research data into a narrative flow specifically optimized for a "sleep documentary" (calm, informative, and engaging).
**How to use it**:
1.  Once research is 100%, click **"GENERATE SCRIPT"**.
2.  The AI will synthesize the facts into a multi-section script (Introduction, Deep Dive, Conclusion).
3.  **Review and Edit**: You can refine the text before moving to the visual stage.

---

### Phase 4: Generating Media (The Synthesis) 🎨
**Why it's used**: Visuals are synthesized to match your script's specific sections. We use high-fidelity image models to create a cohesive aesthetic.
**How to use it**:
1.  Click **"SYNTHESIZE ASSETS"**.
2.  The system will generate a gallery of images. 
3.  **Quality Check**: Ensure the visuals match the mood of your topic.

---

### Phase 5: Assembly & Rendering (The Build) 🎬
**Why it's used**: This is where the magic happens—combining the script (Text-to-Speech), background music, ambient sound layers, and visuals into a single MP4 file.
**How to use it**:
1.  **Sound Design**: Select your **Ambient Music** (e.g., "Deep Space", "Ocean Mist") and **Ambiance Layers** (e.g., "Thunder", "Wind").
2.  Click **"ASSEMBLE VIDEO"**: This packages the project.
3.  Click **"RENDER"**: This fires up the rendering engine to produce the final video file.

---

### Phase 6: Ready (The Export) 🚀
**Why it's used**: Your cinematic masterpiece is finished.
**How to use it**:
1.  Click **"DOWNLOAD MP4"** to save it locally.
2.  Or use the **YouTube Integration** to publish it directly to your channel.

---

## 🛠️ Working Locally (Localhost Tips)

If you are a developer or a power user running the system via `npm run dev`, keep these things in mind:

1.  **Firebase Connection**: The system uses Firestore for project state. Ensure your `service-account.json` is present so your local instance can "talk" to the database.
2.  **Real Data**: Unlike some systems that use "mock" data, VideoSystem's research engine is **live**. As long as you have internet access and API keys, your local environment will fetch the same high-quality data as production.
3.  **Telemetry**: In the browser console, you can see the Socket/SSE events firing during research. This is useful for debugging mission progress.

---

*Happy Generating! If you encounter any issues, refer to the [RENDER_MANAGEMENT.md](file:///docs/RENDER_MANAGEMENT.md) for technical troubleshooting.*
