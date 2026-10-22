/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store" }];
    return [
      { source: "/dashboard", headers: noStore },
      { source: "/dashboard/:path*", headers: noStore },
      { source: "/account/:path*", headers: noStore },
      { source: "/transaction/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
