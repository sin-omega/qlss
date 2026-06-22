import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        // beforeFiles so the rewrite happens before the [slug] route
        {
          source: "/links",
          destination: "/links",
        },
      ],
    };
  },
};

export default nextConfig;
