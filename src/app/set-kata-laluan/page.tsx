import { setKataLaluan } from "@/app/actions";
import { AuthShell, btnAuth, inputAuth, labelAuth } from "@/app/auth-shell";

export default async function SetKataLaluan({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string }>;
}) {
  const { ralat } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold">Kata Laluan Baharu</h1>
      <p className="mt-1 text-sm text-white/60">
        Tetapkan kata laluan baharu untuk akaun anda.
      </p>
      {ralat && (
        <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
          {ralat}
        </p>
      )}
      <form action={setKataLaluan} className="mt-6 flex flex-col gap-4">
        <label className={labelAuth}>
          Kata laluan baharu
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className={inputAuth}
            placeholder="Sekurang-kurangnya 6 aksara"
          />
        </label>
        <button type="submit" className={btnAuth}>
          Simpan & Log Masuk
        </button>
      </form>
    </AuthShell>
  );
}
