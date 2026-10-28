import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // Shown in Settings → About; bump "version" in package.json to release a new version.
  env: {
    APP_VERSION: packageJson.version,
  },
  async redirects() {
    return [
      // The admin console has no index page of its own; it opens on the MCP Hub tab.
      { source: "/admin", destination: "/admin/mcp", permanent: false },
      { source: "/admin/usage", destination: "/admin/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
