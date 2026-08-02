import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile higher up the tree makes Next infer the wrong workspace
  // root; pin it so the dev warning never shows up on a reviewer's machine.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
