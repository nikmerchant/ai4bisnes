import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().map((p) => ({
    url: `https://ai4bisnes.com/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: "https://ai4bisnes.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://ai4bisnes.com/blog",
      changeFrequency: "weekly",
      priority: 0.7,
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
    ...posts,
  ];
}
