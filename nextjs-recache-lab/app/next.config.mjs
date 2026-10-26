/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Leave compression off so the training proxy can cache a transparent body.
  compress: false
};

export default nextConfig;
