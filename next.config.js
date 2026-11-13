const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/rebate": ["./data/snapshot.json"],
      "/api/rebate/claim": ["./data/snapshot.json"],
      "/api/rebate/snapshot": ["./data/snapshot.json"],
      "/api/rebate/run": ["./data/snapshot.json"],
    },
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

module.exports = nextConfig;
