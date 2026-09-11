import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.11.18", "127.0.0.1"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
