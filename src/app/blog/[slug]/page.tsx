import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { BlogNav, BlogFooter } from "../blog-shell";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      images: [post.heroImage],
      type: "article",
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.description,
        image: `https://ai4bisnes.com${post.heroImage}`,
        datePublished: post.date,
        author: { "@type": "Organization", name: "AI4Bisnes" },
      },
      ...(post.faq.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="bg-white text-zinc-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogNav />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <p className="text-sm">
          <Link href="/blog" className="text-zinc-500 underline hover:text-zinc-900">
            ← Kembali ke blog
          </Link>
        </p>
        <p className="mt-4 text-xs text-zinc-400">
          {new Date(post.date).toLocaleDateString("ms-MY")}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {post.title}
        </h1>
        <div className="relative mt-6 aspect-[1200/630] w-full overflow-hidden rounded-2xl bg-zinc-100">
          <Image src={post.heroImage} alt={post.title} fill className="object-cover" />
        </div>
        <div
          className="prose prose-zinc mt-8 max-w-none prose-headings:font-extrabold prose-a:text-violet-600"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
