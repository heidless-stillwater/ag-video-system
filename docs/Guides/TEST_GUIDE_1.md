# Test Guide: PromptTool Media Picker Integration

This guide outlines the steps to verify the server-side bridge and UI integration between **VideoSystem** and **PromptTool**.

## Phase 1: Data Preparation in PromptTool

1. **Access PromptTool**: Navigate to `http://localhost:3000`.
2. **Authenticate**: Log in (or sign up) using a test account (e.g., `test15@test.com`).
3. **Generate Assets**: Use the PromptTool interface to generate at least one high-quality image.
   * *Ensure the generation completes and appears in your "My Creations" or gallery view.*

## Phase 2: Project Setup in VideoSystem

1. **Access VideoSystem**: Navigate to `http://localhost:3001`.
2. **Identity Sync Check**: Log in with the **exact same email** used in PromptTool.
3. **Navigate to Timeline**: 
   * Open an existing project or create a new one.
   * Advance the project through "Research" and "Scripting" until the **Timeline Editor** is active.

## Phase 3: Integration Verification

1. **Open Media Picker**:
   * Scroll to the **Visual Cues** section of the timeline.
   * On any cue card, click the purple **"Browse Library"** button next to the "AI Generate" option.
2. **Test Modal Functionality**:
   * **Overlay**: Verify the `PromptToolMediaPicker` modal covers the header/body correctly.
   * **Tabs**: Switch between "My Media" and "Community Highlights".
   * **Loading States**: Ensure the spinner appears while data is fetched from the bridge API.
3. **Verify Bridge Data**:
   * Under **"My Media"**, locate the image generated in Phase 1.
   * Verify that the prompt and aspect ratio metadata are displayed correctly.
4. **Perform Insertion**:
   * Click the image to select it (verify the purple highlight and checkmark).
   * Click **"Insert Media"**.
   * **Confirmation**: The modal should close, and the Visual Cue's preview image in the VideoSystem timeline should update to match the PromptTool asset instantly.

## Troubleshooting

* **"Failed to load media"**: Check the VideoSystem server logs. Ensure the Firebase Admin SDK has access to `prompttool-db-0`.
* **Empty "My Media"**: Verify the user IDs match. The bridge service uses the authenticated user's `uid` to filter PromptTool images.
* **Z-Index Issues**: If the modal appears behind any element, verify the `createPortal` implementation in `PromptToolMediaPicker.tsx`.
