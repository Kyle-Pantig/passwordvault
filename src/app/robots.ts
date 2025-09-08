import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://passwordvault-pi.vercel.app"; 
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // Block API routes from indexing
          "/settings", // Block sensitive settings pages
          "/security", // Block security pages
          "/verify*", // Block verification pages
          "/reset-password", // Block password reset pages
          "/forgot-password", // Block forgot password pages
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
