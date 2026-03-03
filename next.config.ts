import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export', 
  basePath: '/portfolio',
  images: {
    unoptimized: true, // GitHub Pages doesn't support the default Next.js Image Optimization
  },
};

export default nextConfig;
