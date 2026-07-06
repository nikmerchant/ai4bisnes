import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://ai4bisnes.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://ai4bisnes.com/daftar",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://ai4bisnes.com/masuk",
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://ai4bisnes.com/hubungi",
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
