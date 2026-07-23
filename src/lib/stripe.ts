import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function dapatkanStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY tidak diset");
    _stripe = new (Stripe as any)(key, { typescript: true }) as Stripe;
  }
  return _stripe;
}

export default dapatkanStripe;

// Price IDs (test mode) — dicipta via setup script
export const HARGA_STRIPE = {
  pro: {
    bulanan: "price_1TwHYsQh8fY1mDt49Av8MMuw",
    tahunan: "price_1TwHYsQh8fY1mDt4Tt4wd9pk",
  },
  max: {
    bulanan: "price_1TwHYtQh8fY1mDt4l49gGPXt",
    tahunan: "price_1TwHYtQh8fY1mDt4dMgNoC5W",
  },
} as const;

export type TierBayar = keyof typeof HARGA_STRIPE;
export type Tempoh = keyof (typeof HARGA_STRIPE)["pro"];

export const HARGA_RM: Record<TierBayar, Record<Tempoh, number>> = {
  pro: { bulanan: 49, tahunan: 490 },
  max: { bulanan: 69, tahunan: 690 },
};

export function dikonfigurasi(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Domain untuk Checkout Session — ambil dari env atau localhost
export function dapatkanDomain(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
