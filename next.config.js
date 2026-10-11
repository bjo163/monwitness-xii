const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const productionContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const noStoreHeaders = [{ key: "Cache-Control", value: "no-store" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const pageHeaders = process.env.NODE_ENV === "production"
      ? [...securityHeaders, { key: "Content-Security-Policy", value: productionContentSecurityPolicy }]
      : securityHeaders;
    return [
      {
        source: "/:path*",
        headers: pageHeaders,
      },
      {
        source: "/api/:path*",
        headers: noStoreHeaders,
      },
      {
        source: "/editor/:path*",
        headers: noStoreHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
