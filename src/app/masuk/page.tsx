import Link from "next/link";
import { masuk } from "@/app/actions";
import { AuthShell, btnAuth, inputAuth, labelAuth } from "@/app/auth-shell";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";

export default async function Masuk({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string; mesej?: string }>;
}) {
  const { ralat, mesej } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold">Log Masuk</h1>
      <p className="mt-1 text-sm text-white/60">
        Selamat kembali — AI anda dah rindu.
      </p>
      {mesej && (
        <p className="mt-4 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300">
          {mesej}
        </p>
      )}
      {ralat && (
        <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
          {ralat}
        </p>
      )}
      <form action={masuk} className="mt-6 flex flex-col gap-4">
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
          />
        </label>
        <SubmitButton className={btnAuth}>Log Masuk</SubmitButton>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link
          href="/lupa-kata-laluan"
          className="rounded px-1 py-1 text-white/60 underline underline-offset-2 hover:text-white active:opacity-70"
        >
          Lupa kata laluan?
          <CtaSpinner />
        </Link>
        <Link
          href="/daftar"
          className="rounded px-1 py-1 text-violet-300 underline underline-offset-2 hover:text-violet-200 active:opacity-70"
        >
          Daftar percuma
          <CtaSpinner />
        </Link>
      </div>
    </AuthShell>
  );
}
