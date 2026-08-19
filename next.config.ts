import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile in a parent directory makes Turbopack guess the wrong workspace
  // root; pin it to this project.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
