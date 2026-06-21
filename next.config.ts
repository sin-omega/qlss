import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // beforeFiles so the rewrite happens before the [slug] route
      // handler tries to treat "@foo" as a short link slug.
      beforeFiles: [
        {
          source: "/@:username",
          destination: "/u/:username",
        },
      ],
    };
  },
};

export default nextConfig;
