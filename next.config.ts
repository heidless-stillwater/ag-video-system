console.log('🚀 [CONFIG] Loading next.config.ts...');
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'firebase-admin',
    'firebase-admin/firestore',
    'firebase-admin/storage',
    '@google-cloud/vertexai',
    '@google-cloud/text-to-speech',
    '@google-cloud/aiplatform',
    '@google-cloud/storage',
    'google-auth-library',
    '@googleapis/youtube',
    'remotion',
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/player'
  ],
  transpilePackages: ['firebase', 'framer-motion', 'motion-dom', 'motion-utils'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
