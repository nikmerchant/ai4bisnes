// Hantar emel via Resend API. Aktif bila RESEND_API_KEY diset.
export function resendDikonfigurasi() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function hantarEmel(opts: {
  kepada: string;
  balasKe?: string;
  tajuk: string;
  teks: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AI4Bisnes <admin@ai4bisnes.com>",
      to: opts.kepada,
      reply_to: opts.balasKe,
      subject: opts.tajuk,
      text: opts.teks,
    }),
  });
  if (!res.ok) throw new Error(`Resend: gagal hantar emel (${res.status})`);
}
