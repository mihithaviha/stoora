/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a second build (for example with Supabase keys) live next to the normal one.
const nextConfig = { reactStrictMode: true, distDir: process.env.NEXT_DIST_DIR || '.next' };
export default nextConfig;
