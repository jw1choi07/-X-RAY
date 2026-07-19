import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // OneDrive syncs this folder; Turbopack's persistent cache DB can't open
  // reliably over the cloud-file placeholder API, which crashes `next dev`.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
