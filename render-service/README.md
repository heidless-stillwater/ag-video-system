# VideoSystem Render Service (Google Cloud Run)

This service offloads the heavy FFmpeg video rendering from the main Next.js application to a specialized, scalable container on Google Cloud Run.

## 🚀 Deployment

1.  **Build and Push**:
    ```bash
    PROJECT_ID=$(gcloud config get-value project)
    docker build -t gcr.io/$PROJECT_ID/render-service .
    docker push gcr.io/$PROJECT_ID/render-service
    ```

2.  **Deploy to Cloud Run**:
    ```bash
    gcloud run deploy render-service \
      --image gcr.io/$PROJECT_ID/render-service \
      --platform managed \
      --region us-central1 \
      --memory 4Gi \
      --cpu 2 \
      --timeout 20m \
      --set-env-vars "FIREBASE_STORAGE_BUCKET=your-bucket.firebasestorage.app,RENDER_RESOLUTION=1080p,MAKE_PUBLIC=true" \
      --allow-unauthenticated
    ```

## 🛠 Features

*   **FFmpeg Based**: Uses native FFmpeg installed in the container for maximum performance.
*   **Fonts Included**: Pre-installed `fonts-noto` for multi-language subtitle support.
*   **Asset Downloading**: Multi-threaded asset downloading (images, videos, audio, music).
*   **Scene Baking**: Individual scene segment baking with transitions.
*   **Magnetic Ripple**: Seamlessly handles variable scene durations.
*   **Subtitles**: Full SSA/ASS subtitle generation with custom styles.

## 📡 API

### `POST /render`

Accepts a documentary manifest and returns the final Cloud Storage URL.

**Payload:**
```json
{
  "projectId": "documentary-123",
  "scenes": [...],
  "backgroundMusicUrl": "...",
  "backgroundMusicVolume": 0.2,
  "ambianceUrl": "...",
  "ambianceVolume": 0.1,
  "narrationVolume": 1.0,
  "globalSfxVolume": 0.4,
  "subtitlesEnabled": true,
  "subtitleStyle": "bold",
  "aspectRatio": "16:9",
  "customFileName": "my-video.mp4"
}
```

## 🧼 Cleanup

*   Uses specialized `/tmp/renders` in-memory filesystem.
*   Auto-shreds temporary files after every successful or failed render.
