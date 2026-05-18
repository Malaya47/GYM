/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Force jsPDF to the UMD browser build so Turbopack (Next 16 default) never
  // picks up jspdf.node.min.js, which uses fflate/node.cjs → worker_threads.
  turbopack: {
    resolveAlias: {
      jspdf: "./node_modules/jspdf/dist/jspdf.umd.min.js",
    },
  },
};

export default nextConfig;
