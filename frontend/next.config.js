/** @type {import('next').NextConfig} */
const repo = "eln-pitch-dashboard";
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  reactStrictMode: true,
  // For GitHub Pages: static export under the /eln-pitch-dashboard subpath.
  ...(isPages
    ? {
        output: "export",
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

module.exports = nextConfig;
