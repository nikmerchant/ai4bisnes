export type ForbiddenPattern = { id: string; pattern: RegExp; sample: string; reason: string };

/** Deterministic forbidden-claim patterns derived from the Product Truth Registry
 *  (memo 20 Ogs 2026 s.4.2). Output containing any of these is rejected. */
export const AFFILIATE_FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  { id: "pricing_2_0", pattern: /\b(harga|price|tier|pakej)\b[^.\n]{0,25}\bRM\s?(89|139|199)\b|\bRM\s?2[,.]990\b/i, sample: "Harga pakej PRO baharu ialah RM89", reason: "harga 2.0 belum deploy; harga semasa RM49/69" },
  { id: "traction_users", pattern: /\b\d+\s*\+?\s*(pengguna|users|pelanggan berbayar)\b/i, sample: "50+ pengguna sudah guna AI4Bisnes", reason: "tiada evidence traction" },
  { id: "income_claim", pattern: /\bRM\s?\d[\d,]*\s*(sebulan|seminggu|sehari|per bulan|seminggu sekali)\b|\b\d+\s*juta\b.*\brm\b/i, sample: "Jana RM10,000 sebulan dengan AI4Bisnes!", reason: "income claim tanpa bukti" },
  { id: "fake_testimonial", pattern: /\b(testimoni|review)\b[^.\n]{0,40}\b(pelanggan|customer|user)\b.*\b(kata|cakap|katakan)\b/i, sample: "Testimoni pelanggan kata hasil mereka menjangkau enam angka", reason: "testimoni rekaan" },
  { id: "ai_chat_live", pattern: /\bAI chat\b[^.\n]{0,30}\b(sudah live|telah live|kini live)\b/i, sample: "AI chat AI4Bisnes sudah live sekarang", reason: "overclaim capability" },
  { id: "hub_pertama_full", pattern: /\bhab AI pertama Malaysia\b[^.\n]{0,40}\b(beroperasi penuh|siap sepenuhnya|fully operational)\b/i, sample: "Hab AI pertama Malaysia sudah beroperasi penuh", reason: "overclaim positioning" },
  { id: "juta_pks_wrong", pattern: /\b1\.2\s*juta\s*(PKS|MSME|usahawan)\b/i, sample: "Untuk 1.2 juta PKS di Malaysia", reason: "angka bukan DOSM; guna 1,069,831" },
  { id: "guaranteed_income", pattern: /\bjaminan?\b[^.\n]{0,30}\b(hasil|pendapatan|income|untung)\b/i, sample: "Ada jaminan pendapatan untuk affiliate", reason: "jaminan kewangan tanpa asas" },
] as const;

export const AFFILIATE_DISCLOSURE = "#iklan — Pautan affiliate: saya dapat komisen jika anda langgan melalui pautan ini.";

export type AffiliateCompliance = {
  referralPass: boolean;
  disclosurePass: boolean;
  forbiddenPass: boolean;
  violation: { patternId: string; sample: string } | null;
  checkedAt: string;
};

/** Post-check deterministik atas teks penuh output. Gagal mana-mana lapis →
 *  output tidak boleh dipulangkan kepada pengguna. */
export function postCheckAffiliatePromo(renderedText: string, referralLink: string, now: Date = new Date()): AffiliateCompliance {
  const referralPass = typeof renderedText === "string" && typeof referralLink === "string" && referralLink.length > 0 && renderedText.includes(referralLink);
  const disclosurePass = typeof renderedText === "string" && renderedText.includes("#iklan") && renderedText.toLowerCase().includes("komisen");
  let violation: AffiliateCompliance["violation"] = null;
  if (typeof renderedText === "string") {
    for (const entry of AFFILIATE_FORBIDDEN_PATTERNS) {
      if (entry.pattern.test(renderedText)) { violation = { patternId: entry.id, sample: entry.sample }; break; }
    }
  }
  return { referralPass, disclosurePass, forbiddenPass: violation === null, violation, checkedAt: now.toISOString() };
}
