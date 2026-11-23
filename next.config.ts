import type {NextConfig} from "next";

const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Photos are capped at 4 MB in the data layer (Vercel accepts at most 4.5 MB per request).
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // Development only: never let the browser keep dev JS/CSS chunks. Chunk URLs are
      // reused across edits, and a stale cached chunk causes client/server mismatches.
      ...(isDev ? [{source: "/_next/static/:path*", headers: [{key: "Cache-Control", value: "no-store, must-revalidate"}]}] : []),
      {
        source: "/:path*",
        headers: [
          {key: "Content-Security-Policy", value: contentSecurityPolicy},
          {key: "X-Content-Type-Options", value: "nosniff"},
          {key: "X-Frame-Options", value: "DENY"},
          {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
          // Camera is needed by the QR scanner on staff desks.
          {key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()"},
        ],
      },
    ];
  },
};

export default nextConfig;
