import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: prompts/ folder is loaded at runtime via fs.readFileSync
  // Railway includes it by default in the build

  // Increase API route timeout for long-running Claude API calls
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Extend function timeout (Vercel-style, but Railway may respect this)
  serverExternalPackages: ['@anthropic-ai/sdk'],
};

export default nextConfig;
