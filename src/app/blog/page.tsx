import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { BlogNav, BlogFooter } from "./blog-shell";

export const metadata = {
  title: "Blog — Tip & Panduan AI untuk Bisnes Malaysia",
  description:
    "Panduan praktikal guna AI (ChatGPT/Claude) untuk SME Malaysia — pemasaran, jualan, operasi, dan lagi.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="bg-white text-zinc-900">
      <BlogNav />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">
          Blog <span className="text-violet-600">AI4Bisnes</span>
        </h1>
        <p className="mt-3 text-zinc-600">
          Tip & panduan praktikal guna AI untuk bisnes anda di Malaysia.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            Belum ada artikel lagi. Sila kembali tidak lama lagi.
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-8">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="flex gap-5 rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-violet-600"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                  <Image
                    src={p.heroImage}
                    alt={p.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">
                    {new Date(p.date).toLocaleDateString("ms-MY")}
                  </p>
                  <h2 className="mt-1 font-bold">{p.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{p.description}</p>
                  {p.tags.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BlogFooter />
    </div>
  );
}
