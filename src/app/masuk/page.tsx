import Link from "next/link";
import { masuk } from "@/app/actions";

export default async function Masuk({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string; mesej?: string }>;
}) {
  const { ralat, mesej } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Log Masuk</h1>
      {mesej && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {mesej}
        </p>
      )}
      {ralat && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ralat}
        </p>
      )}
      <form action={masuk} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Emel
          <input
            type="email"
            name="email"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Kata Laluan
          <input
            type="password"
            name="password"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-violet-600 py-2.5 font-bold text-white transition-colors hover:bg-violet-700"
        >
          Log Masuk
        </button>
      </form>
      <p className="text-sm text-neutral-500">
        Belum ada akaun?{" "}
        <Link href="/daftar" className="underline">
          Daftar percuma
        </Link>
      </p>
    </main>
  );
}
