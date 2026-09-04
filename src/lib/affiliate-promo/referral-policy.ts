export function validateAffiliateReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return /^[A-Za-z0-9]{4,24}$/.test(code) ? code : null;
}
