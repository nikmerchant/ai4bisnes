import Link from "next/link";
import { hantarHubungi } from "@/app/actions";
import { CtaSpinner } from "@/app/cta-spinner";
import { SubmitButton } from "@/app/submit-button";
import { AuthShell, inputAuth, labelAuth, btnAuth } from "@/app/auth-shell";

export const metadata = {
  title: "Hubungi Kami",
  description:
    "Hubungi AI4Bisnes (dikendalikan oleh NiagaIQ Technologies) untuk sebarang pertanyaan.",
};

export default async function HubungiKami({
  searchParams,
}: {
  searchParams: Promise<{ ralat?: string; mesej?: string }>;
}) {
  const { ralat, mesej } = await searchParams;

  return (
    <AuthShell>
      <h1 className="text-xl font-bold text-white">Hubungi Kami</h1>
      <p className="mt-1 text-sm text-white/70">
        Ada soalan atau maklum balas? Isi borang di bawah, kami akan balas
        secepat mungkin.
      </p>

      {mesej && (
        <p className="mt-4 rounded-lg bg-green-950 p-3 text-sm text-green-300">
          {mesej}
        </p>
      )}
      {ralat && (
        <p className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-300">
          {ralat}
        </p>
      )}

      <form action={hantarHubungi} className="mt-6 flex flex-col gap-4">
        <label className={labelAuth}>
          Nama
          <input name="nama" required maxLength={100} className={inputAuth} />
        </label>
        <label className={labelAuth}>
          Emel
          <input
            type="email"
            name="emel"
            required
            maxLength={200}
            className={inputAuth}
          />
        </label>
        <label className={labelAuth}>
          Mesej
          <textarea
            name="mesej"
            required
            maxLength={2000}
            rows={5}
            className={`${inputAuth} resize-none`}
          />
        </label>
        <SubmitButton className={btnAuth}>Hantar Mesej</SubmitButton>
      </form>

      <div className="mt-8 border-t border-white/10 pt-6 text-sm text-white/60">
        <p className="font-bold text-white">NiagaIQ Technologies</p>
        <p>No. Pendaftaran: 202603174768 (JM1046442-D)</p>
        <p className="mt-2">
          Emel:{" "}
          <a href="mailto:admin@ai4bisnes.com" className="underline hover:text-white">
            admin@ai4bisnes.com
          </a>
        </p>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/" className="text-white/60 underline hover:text-white">
          ← Kembali ke laman utama
          <CtaSpinner />
        </Link>
      </p>
    </AuthShell>
  );
}
