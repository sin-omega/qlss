import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
<<<<<<< HEAD
=======
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
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
};

export default nextConfig;
