import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: prompts/ folder is loaded at runtime via fs.readFileSync
  // Railway includes it by default in the build
};

export default nextConfig;
