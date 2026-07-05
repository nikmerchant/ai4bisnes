import Link from "next/link";

// Bingkai kongsi halaman auth — jenama gelap-aurora selari landing
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 py-12 text-white">
      <div className="aurora-a" aria-hidden />
      <div className="aurora-b" aria-hidden />
      <div className="relative z-10 w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center text-2xl font-extrabold tracking-tight"
        >
          AI4<span className="text-violet-400">BISNES</span>
        </Link>
        <div className="liquid-glass rounded-2xl p-8">{children}</div>
      </div>
    </main>
  );
}

export const inputAuth =
  "rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white placeholder-white/40 outline-none focus:border-violet-400";
export const labelAuth = "flex flex-col gap-1.5 text-sm font-medium text-white/90";
export const btnAuth =
  "rounded-full bg-violet-600 py-2.5 font-bold text-white transition-colors hover:bg-violet-500";
