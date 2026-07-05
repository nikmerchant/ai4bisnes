import Link from "next/link";
import { daftar } from "@/app/actions";
import { AuthShell, btnAuth, inputAuth, labelAuth } from "@/app/auth-shell";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";

export default async function Daftar({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string }>;
}) {
  const { ralat } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold">Daftar Akaun</h1>
      <p className="mt-1 text-sm text-white/60">
        Percuma · 2 minit · tiada kad kredit
      </p>
      {ralat && (
        <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
          {ralat}
        </p>
      )}
      <form action={daftar} className="mt-6 flex flex-col gap-4">
        <label className={labelAuth}>
          Emel
          <input type="email" name="email" required className={inputAuth} />
        </label>
        <label className={labelAuth}>
          Kata Laluan
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className={inputAuth}
            placeholder="Sekurang-kurangnya 6 aksara"
          />
        </label>
        <SubmitButton className={btnAuth}>Daftar</SubmitButton>
      </form>
      <p className="mt-5 text-sm text-white/60">
        Sudah ada akaun?{" "}
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
