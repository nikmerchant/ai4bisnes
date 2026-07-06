import { createClient as createAdminClient } from "@supabase/supabase-js";
import { bilTelahDibayar } from "@/lib/toyyibpay";

// Callback tanpa auth dari toyyibPay — JANGAN percaya payload;
// sahkan status bayaran terus dengan API toyyibPay sebelum aktifkan.
export async function POST(req: Request) {
  const form = await req.formData();
  const billCode = String(form.get("billcode") ?? "");
  const status = String(form.get("status") ?? "");

  if (!billCode || status !== "1") return new Response("ok");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY tidak diset — aktivasi gagal");
    return new Response("not configured", { status: 500 });
  }

  const sahih = await bilTelahDibayar(billCode);
  if (!sahih) return new Response("unverified", { status: 400 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, user_id, tier, period, status")
    .eq("bill_code", billCode)
    .eq("status", "pending")
    .maybeSingle();
  if (!sub) return new Response("ok"); // sudah diaktifkan atau tiada

  const hari = sub.period === "tahunan" ? 365 : 30;
  const expires = new Date(Date.now() + hari * 24 * 60 * 60 * 1000);

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      starts_at: new Date().toISOString(),
      expires_at: expires.toISOString(),
    })
    .eq("id", sub.id);

  await admin
    .from("profiles")
    .update({ tier: sub.tier })
    .eq("id", sub.user_id);

  // Kalau pengguna yang bayar ini dirujuk oleh affiliate, rekod komisen 20%.
  const janaKomisenAffiliate = async () => {
    const { data: pembayar } = await admin
      .from("profiles")
      .select("referred_by")
      .eq("id", sub.user_id)
      .single();
    if (!pembayar?.referred_by) return;

    const { data: langganan } = await admin
      .from("subscriptions")
      .select("price_rm")
      .eq("id", sub.id)
      .single();
    if (!langganan) return;

    await admin.from("affiliate_commissions").upsert(
      {
        referrer_id: pembayar.referred_by,
        referred_user_id: sub.user_id,
        subscription_id: sub.id,
        amount_rm: Number(langganan.price_rm) * 0.2,
      },
      { onConflict: "subscription_id", ignoreDuplicates: true }
    );
  };
  await janaKomisenAffiliate();

  return new Response("ok");
}
