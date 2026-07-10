/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // casper-js-sdk is a heavy CJS package used only in server route handlers.
  // Keep it external so Next doesn't bundle it into the client (Next 15: top-level key).
  serverExternalPackages: ["casper-js-sdk"],
};

export default nextConfig;
