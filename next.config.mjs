/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a second build (for example with Supabase keys) live next to the normal one.
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // the public site and the seller app are separate root layouts, so an unknown address needs its own 404 page
  experimental: { globalNotFound: true },
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
