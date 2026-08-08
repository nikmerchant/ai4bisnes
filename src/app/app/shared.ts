import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profil = {
  business_name: string;
  products: string;
  target_customer: string;
  location: string;
  tier: string;
  onboarded: boolean;
  category_id: number | null;
  categories: { name_ms: string } | null;
  // FASA 1B — medan baharu
  usp: string;
  tone_of_voice: string;
  main_competitors: string;
  price_range: string;
  platforms: string;
  website: string;
};

export const PANGKAT: Record<string, number> = { basic: 0, pro: 1, max: 2 };

export function isiPrompt(body: string, p: Profil) {
  return body
    .replaceAll("{nama_bisnes}", p.business_name || "bisnes saya")
    .replaceAll("{kategori}", p.categories?.name_ms ?? "")
    .replaceAll("{produk}", p.products || "produk/servis kami")
    .replaceAll("{sasaran}", p.target_customer || "pelanggan kami")
    .replaceAll("{lokasi}", p.location || "Malaysia")
    .replaceAll("{usp}", p.usp || "")
    .replaceAll("{tone}", p.tone_of_voice || "mesra dan profesional")
    .replaceAll("{pesaing}", p.main_competitors || "")
    .replaceAll("{harga}", p.price_range || "")
    .replaceAll("{platform}", p.platforms || "WhatsApp")
    .replaceAll("{website}", p.website || "");
}

export async function dapatkanProfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.rpc("semak_langganan");

  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "business_name, products, target_customer, location, tier, onboarded, category_id, categories(name_ms), usp, tone_of_voice, main_competitors, price_range, platforms, website"
    )
    .eq("id", user!.id)
    .single<Profil>();

  if (!profil?.onboarded) redirect("/onboarding");

  return { supabase, user: user!, profil };
}
