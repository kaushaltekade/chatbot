import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias['tailwindcss'] = path.join(__dirname, 'node_modules/tailwindcss');
    config.resolve.alias['tailwindcss-animate'] = path.join(__dirname, 'node_modules/tailwindcss-animate');
    return config;
  },
};

export default nextConfig;
