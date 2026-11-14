import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
}

export default nextConfig
