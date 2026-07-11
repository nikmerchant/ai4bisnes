import Image from "next/image";
import Link from "next/link";
import { CtaSpinner } from "@/app/cta-spinner";

export function BlogNav() {
  return (
    <nav className="border-b border-zinc-200 bg-white px-6 py-4">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-zinc-900">
          AI4<span className="text-violet-600">BISNES</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/masuk"
            className="rounded-full px-2 py-2 font-medium text-zinc-600 transition-colors hover:text-zinc-900 active:opacity-70"
          >
            Log Masuk
            <CtaSpinner />
          </Link>
          <Link
            href="/daftar"
            className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white transition-colors hover:bg-violet-700 active:opacity-80"
          >
            Daftar Percuma
            <CtaSpinner />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-xs text-zinc-400">
      <p className="font-bold text-white">
        AI4<span className="text-violet-400">BISNES</span>
      </p>
      <p className="mt-2">
        © {new Date().getFullYear()} AI4Bisnes · ai4bisnes.com · Dibina untuk
        usahawan Malaysia 🇲🇾
      </p>
      <p className="mt-1">
        <Link href="/masuk" className="underline hover:text-white">
          Log Masuk
        </Link>{" "}
        ·{" "}
        <Link href="/daftar" className="underline hover:text-white">
          Daftar
        </Link>{" "}
        ·{" "}
        <Link href="/blog" className="underline hover:text-white">
          Blog
        </Link>{" "}
        ·{" "}
        <Link href="/hubungi" className="underline hover:text-white">
          Hubungi Kami
        </Link>{" "}
        ·{" "}
        <Link href="/terma" className="underline hover:text-white">
          Terma
        </Link>{" "}
        ·{" "}
        <Link href="/privasi" className="underline hover:text-white">
          Privasi
        </Link>
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 opacity-70">
        <Image
          src="/brand/niagaiq-logo-dark.jpg"
          alt="NiagaIQ Technologies"
          width={28}
          height={28}
          className="rounded-sm"
        />
        <span>AI4Bisnes dikendalikan oleh NiagaIQ Technologies</span>
      </div>
    </footer>
  );
}
