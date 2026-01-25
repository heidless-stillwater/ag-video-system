import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  },
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/vertexai',
    '@google-cloud/text-to-speech',
    '@google-cloud/aiplatform',
    'remotion',
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/player',
    'ffmpeg-static',
    'ffprobe-static'
  ],
};

export default nextConfig;
