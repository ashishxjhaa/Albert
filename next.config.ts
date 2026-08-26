import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        hostname: "*",
      },
    ],
  },
  serverExternalPackages: ["pg", "bcryptjs"],
};

export default nextConfig;
