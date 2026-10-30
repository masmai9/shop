import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind CSS v4 via Turbopack
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Product images and slips upload straight from the browser to Supabase
  // Storage, so server body-size limits don't apply.
};

export default nextConfig;
