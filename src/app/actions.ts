"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HARGA, type TierBayar, type Tempoh } from "@/lib/harga";
import { ciptaBil, toyyibDikonfigurasi } from "@/lib/toyyibpay";

export async function daftar(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  if (!email || !password) redirect("/daftar?ralat=Sila+isi+semua+medan");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/daftar?ralat=${encodeURIComponent(error.message)}`);

  redirect("/masuk?mesej=Pendaftaran+berjaya.+Sila+semak+emel+anda+untuk+pengesahan,+kemudian+log+masuk.");
}

export async function masuk(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  if (!email || !password) redirect("/masuk?ralat=Sila+isi+semua+medan");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/masuk?ralat=${encodeURIComponent(error.message)}`);

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

export async function keluar() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function mulaBayar(formData: FormData) {
  const tier = formData.get("tier") as TierBayar;
  const period = formData.get("period") as Tempoh;
  if (!(tier in HARGA) || !["bulanan", "tahunan"].includes(period))
    redirect("/naik-taraf?ralat=Pilihan+tidak+sah");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  if (!toyyibDikonfigurasi())
    redirect(
      "/naik-taraf?ralat=Pembayaran+belum+dikonfigurasi.+Sila+hubungi+admin."
    );

  const harga = HARGA[tier][period];
  const rujukan = `${user.id.slice(0, 8)}-${Date.now()}`;

  let bil;
  try {
    bil = await ciptaBil({
      namaBil: `AI4Bisnes ${tier.toUpperCase()}`,
      deskripsi: `Langganan ${tier} (${period}) — AI4Bisnes`,
      amaunRM: harga,
      emel: user.email ?? "",
      rujukan,
    });
  } catch {
    redirect("/naik-taraf?ralat=Gagal+mencipta+bil.+Cuba+sebentar+lagi.");
  }

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    tier,
    period,
    price_rm: harga,
    status: "pending",
    bill_code: bil.billCode,
  });
  if (error)
    redirect(`/naik-taraf?ralat=${encodeURIComponent(error.message)}`);

  redirect(bil.url);
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
