import Link from "next/link";
import { CtaSpinner } from "@/app/cta-spinner";

export default function HalamanTiada() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center text-white">
      <div className="aurora-a" aria-hidden />
      <div className="relative z-10">
        <p className="text-8xl font-extrabold text-violet-400">404</p>
        <h1 className="mt-4 text-3xl font-extrabold uppercase tracking-tight">
          Halaman tidak dijumpai
        </h1>
        <p className="mt-3 text-zinc-400">
          Alamat ini tiada — mungkin telah dipindahkan atau salah taip.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-violet-600 px-8 py-3 font-bold transition-colors hover:bg-violet-500 active:opacity-80"
        >
          ← Kembali ke Laman Utama
          <CtaSpinner />
        </Link>
      </div>
    </main>
  );
}
