import Link from "next/link";
import { daftar } from "@/app/actions";

export default async function Daftar({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string }>;
}) {
  const { ralat } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Daftar Akaun</h1>
      {ralat && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ralat}
        </p>
      )}
      <form action={daftar} className="flex flex-col gap-4">
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
            minLength={6}
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-violet-600 py-2.5 font-bold text-white transition-colors hover:bg-violet-700"
        >
          Daftar
        </button>
      </form>
      <p className="text-sm text-neutral-500">
        Sudah ada akaun?{" "}
        <Link href="/masuk" className="underline">
          Log masuk
        </Link>
      </p>
    </main>
  );
}
