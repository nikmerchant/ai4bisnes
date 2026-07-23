"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HARGA, type TierBayar, type Tempoh } from "@/lib/harga";
import { hantarEmel, resendDikonfigurasi } from "@/lib/resend";
import { dapatkanStripe, HARGA_STRIPE, dapatkanDomain } from "@/lib/stripe";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Terjemah ralat Supabase yang biasa ke BM — jangan dedah butiran teknikal
function ralatBM(mesej: string): string {
  const m = mesej.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Emel atau kata laluan salah.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Emel ini sudah berdaftar — cuba log masuk.";
  if (m.includes("password") && m.includes("6"))
    return "Kata laluan mesti sekurang-kurangnya 6 aksara.";
  if (m.includes("invalid email") || m.includes("valid email"))
    return "Sila masukkan emel yang sah.";
  if (m.includes("not confirmed"))
    return "Emel belum disahkan — sila klik pautan dalam emel pendaftaran anda.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Terlalu banyak percubaan — sila tunggu sebentar dan cuba lagi.";
  return "Maaf, ada masalah. Sila cuba lagi.";
}

export async function daftar(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  if (!email || !password) redirect("/daftar?ralat=Sila+isi+semua+medan");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/daftar?ralat=${encodeURIComponent(ralatBM(error.message))}`);

  await kaitkanRujukan(data.user?.id);

  redirect("/masuk?mesej=Pendaftaran+berjaya.+Sila+semak+emel+anda+untuk+pengesahan,+kemudian+log+masuk.");
}

// Kaitkan pengguna baharu dengan affiliate yang rujuk mereka (jika ada cookie
// ai4b_ref yang padan kod rujukan sah). Guna admin client sebab pengguna
// baharu belum ada sesi (email confirmation wajib) — sama sebab route.ts
// callback bayaran guna service role.
async function kaitkanRujukan(userId: string | undefined) {
  if (!userId) return;
  const kod = (await cookies()).get("ai4b_ref")?.value;
  if (!kod) return;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY tidak diset — rujukan tidak dikaitkan");
    return;
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", kod)
    .maybeSingle();

  if (referrer && referrer.id !== userId) {
    await admin
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", userId);
  }
}

export async function masuk(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  if (!email || !password) redirect("/masuk?ralat=Sila+isi+semua+medan");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/masuk?ralat=${encodeURIComponent(ralatBM(error.message))}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user!.id)
    .single();

  redirect(profil?.onboarded ? "/app" : "/onboarding");
}

export async function lupaKataLaluan(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/confirm?next=/set-kata-laluan`,
    });
  }
  // mesej sama tak kira emel wujud atau tidak — elak dedah kewujudan akaun
  redirect(
    "/lupa-kata-laluan?mesej=Jika+emel+itu+berdaftar,+pautan+reset+telah+dihantar.+Semak+inbox+anda."
  );
}

export async function setKataLaluan(formData: FormData) {
  const password = formData.get("password") as string;
  if (!password || password.length < 6)
    redirect("/set-kata-laluan?ralat=Kata+laluan+mesti+sekurang-kurangnya+6+aksara");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    redirect(
      "/set-kata-laluan?ralat=Pautan+reset+tidak+sah+atau+telah+luput+—+minta+pautan+baharu."
    );
  redirect("/app");
}

export async function keluar() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function mulaBayar(formData: FormData) {
  const tier = formData.get("tier") as TierBayar;
  const period = formData.get("period") as Tempoh;
  if (!(tier in HARGA_STRIPE) || !["bulanan", "tahunan"].includes(period))
    redirect("/naik-taraf?ralat=Pilihan+tidak+sah");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const priceId = HARGA_STRIPE[tier][period];

  try {
    const stripe = dapatkanStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "fpx"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        tier,
        period,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
          period,
        },
      },
      success_url: `${dapatkanDomain()}/naik-taraf?status_id=1`,
      cancel_url: `${dapatkanDomain()}/naik-taraf?status_id=0`,
    });

    if (!session.url) {
      redirect("/naik-taraf?ralat=Gagal+mencipta+sesi+pembayaran");
    }

    redirect(session.url);
  } catch (e) {
    console.error("Stripe Checkout error:", e);
    redirect("/naik-taraf?ralat=Gagal+mencipta+pembayaran.+Cuba+sebentar+lagi.");
  }
}

export async function simpanVault(input: {
  title: string;
  content: string;
  promptId: number | null;
}) {
  const title = input.title?.trim().slice(0, 200);
  const content = input.content?.trim().slice(0, 20000);
  if (!title || !content) return { ok: false as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { error } = await supabase.from("vault_items").insert({
    user_id: user.id,
    prompt_id: input.promptId,
    title,
    content,
  });
  // RLS menolak insert jika tier basic — itu isyarat upsell, bukan ralat sistem
  return { ok: !error as boolean };
}

export async function padamVault(id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !Number.isInteger(id)) return;
  await supabase.from("vault_items").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/vault");
}

export async function toggleKegemaran(promptId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !Number.isInteger(promptId)) return;

  const { data: sedia } = await supabase
    .from("favorites")
    .select("prompt_id")
    .eq("user_id", user.id)
    .eq("prompt_id", promptId)
    .maybeSingle();

  if (sedia) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("prompt_id", promptId);
  } else {
    await supabase
      .from("favorites")
      .insert({ user_id: user.id, prompt_id: promptId });
  }
}

export async function simpanProfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const business_name = (formData.get("business_name") as string)?.trim();
  const category_id = Number(formData.get("category_id"));
  if (!business_name || !category_id)
    redirect("/onboarding?ralat=Sila+isi+nama+bisnes+dan+pilih+kategori");

  const { error } = await supabase
    .from("profiles")
    .update({
      business_name,
      category_id,
      products: ((formData.get("products") as string) ?? "").trim(),
      target_customer: ((formData.get("target_customer") as string) ?? "").trim(),
      location: ((formData.get("location") as string) ?? "").trim(),
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) redirect(`/onboarding?ralat=${encodeURIComponent(error.message)}`);
  redirect("/app");
}

export async function hantarHubungi(formData: FormData) {
  const nama = (formData.get("nama") as string)?.trim().slice(0, 100);
  const emel = (formData.get("emel") as string)?.trim().slice(0, 200);
  const mesej = (formData.get("mesej") as string)?.trim().slice(0, 2000);
  const emelSah = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emel ?? "");

  if (!nama || !emelSah || !mesej)
    redirect("/hubungi?ralat=Sila+isi+semua+medan+dengan+emel+yang+sah");

  if (!resendDikonfigurasi())
    redirect("/hubungi?ralat=Borang+tidak+tersedia+buat+masa+ini,+sila+emel+admin@ai4bisnes.com+terus");

  try {
    await hantarEmel({
      kepada: "admin@ai4bisnes.com",
      balasKe: emel,
      tajuk: `[Hubungi Kami] ${nama}`,
      teks: `Nama: ${nama}\nEmel: ${emel}\n\nMesej:\n${mesej}`,
    });
  } catch {
    redirect("/hubungi?ralat=Gagal+hantar,+sila+cuba+lagi+atau+emel+admin@ai4bisnes.com+terus");
  }

  redirect("/hubungi?mesej=Terima+kasih!+Mesej+anda+telah+dihantar,+kami+akan+balas+secepat+mungkin.");
}
