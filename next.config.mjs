/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a second build (for example with Supabase keys) live next to the normal one.
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // the public site and the seller app are separate root layouts, so an unknown address needs its own 404 page
  experimental: { globalNotFound: true },
};
export default nextConfig;
