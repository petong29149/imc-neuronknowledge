import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The admin console has no index page of its own; it opens on the dashboard tab.
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
      { source: "/admin/usage", destination: "/admin/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
