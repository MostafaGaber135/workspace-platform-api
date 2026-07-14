/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The web app consumes CommonJS workspace packages. Transpiling them ensures
  // Next bundles them consistently regardless of their module format. Note that
  // `@developeros/config` is intentionally NOT listed — it validates server
  // secrets and must never be pulled into the client bundle.
  transpilePackages: ['@developeros/shared-types', '@developeros/validation'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
