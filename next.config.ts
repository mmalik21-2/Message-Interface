import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hxrq088o2wjxdf6q.public.blob.vercel-storage.com",
        // Optionally specify port and pathname:
        // port: "",
        // pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
