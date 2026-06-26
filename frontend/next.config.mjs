/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // casper-js-sdk is a heavy CJS package used only in server route handlers.
  // Keep it external so Next doesn't try to bundle it into the client.
  experimental: {
    serverComponentsExternalPackages: ["casper-js-sdk"],
  },
};

export default nextConfig;
