import type { NextConfig } from "next";

const csp = `
  default-src 'self';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';

  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  worker-src 'self';
  manifest-src 'self';

  img-src 'self' data: blob: https:;
  connect-src 'self' https: ws: wss:;

  object-src 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "interest-cohort=()" },
          {
            key: "Content-Security-Policy",
            value: csp.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
