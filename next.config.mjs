/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo root also holds the Node/ffmpeg video studio (studio/, bin/).
  // Those are not part of the web build; Next only compiles app/ + components/ + lib/.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
