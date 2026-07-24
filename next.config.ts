import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Give the pipeline as much time as Hobby plan allows (10s max)
  maxDuration: 10,
};

export default nextConfig;
