import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogFaq = { q: string; a: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO 'YYYY-MM-DD'
  tags: string[];
  heroImage: string; // path relatif ke /public, cth "/blog/nama-slug.png"
  faq: BlogFaq[];
  html: string;
};

// Baca satu fail .md (bukan drafts/) dan parse ke BlogPost.
function parseFile(slug: string): BlogPost {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    heroImage: data.heroImage ?? "/opengraph-image",
    faq: Array.isArray(data.faq) ? data.faq : [],
    html: marked.parse(content, { async: false }) as string,
  };
}

// Semua artikel LIVE (bukan drafts/), susun tarikh terbaru dulu.
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
  return slugs
    .map(parseFile)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseFile(slug);
}
