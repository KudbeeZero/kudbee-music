/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo root also holds the Node/ffmpeg video studio (studio/, bin/).
  // Those are not part of the web build; Next only compiles app/ + components/ + lib/.
  eslint: { ignoreDuringBuilds: true },
  // The whole app is client-side (localStorage vault, no API routes, no SSR), so it
  // exports to a pure static site. Set STATIC_EXPORT=1 to emit static files to out/
  // for a static host like Cloudflare Pages. Off by default so local dev, Vercel, and
  // the video pipeline are unaffected.
  ...(process.env.STATIC_EXPORT ? { output: 'export', images: { unoptimized: true } } : {}),
};

export default nextConfig;
