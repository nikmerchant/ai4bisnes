import Link from "next/link";
import { lupaKataLaluan } from "@/app/actions";
import { AuthShell, btnAuth, inputAuth, labelAuth } from "@/app/auth-shell";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";

export default async function LupaKataLaluan({
  searchParams,
}: {
  searchParams: Promise<{ mesej?: string }>;
}) {
  const { mesej } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold">Lupa Kata Laluan</h1>
      <p className="mt-1 text-sm text-white/60">
        Masukkan emel anda — kami hantar pautan untuk set kata laluan baharu.
      </p>
      {mesej && (
        <p className="mt-4 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300">
          {mesej}
        </p>
      )}
      <form action={lupaKataLaluan} className="mt-6 flex flex-col gap-4">
        <label className={labelAuth}>
          Emel
          <input type="email" name="email" required className={inputAuth} />
        </label>
        <SubmitButton className={btnAuth}>Hantar Pautan Reset</SubmitButton>
      </form>
      <p className="mt-5 text-sm text-white/60">
        Teringat semula?{" "}
        <Link
          href="/masuk"
          className="rounded px-1 py-1 text-violet-300 underline underline-offset-2 hover:text-violet-200 active:opacity-70"
        >
          Log masuk
          <CtaSpinner />
        </Link>
      </p>
    </AuthShell>
  );
}
