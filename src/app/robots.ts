import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // halaman peribadi/berdaftar — tiada nilai carian, jimat crawl budget
        disallow: ["/app/", "/api/", "/onboarding", "/naik-taraf"],
      },
    ],
    sitemap: "https://ai4bisnes.com/sitemap.xml",
  };
}
