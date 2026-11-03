/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a second build (for example with Supabase keys) live next to the normal one.
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // the public site and the seller app are separate root layouts, so an unknown address needs its own 404 page
  experimental: { globalNotFound: true },
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/journal', destination: '/blogs', permanent: true },
      { source: '/journal/:slug', destination: '/blogs/:slug', permanent: true },
    ];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      ],
    },
    // Files in public/ are not fingerprinted, so by default a browser re-checks them on every visit.
    // Fonts never change under the same name: keep them for a year. Photos and logos: a month, then refresh quietly.
    { source: '/fonts/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/assets/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=604800' }] },
    { source: '/images/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=604800' }] }];
  },
};
export default nextConfig;
