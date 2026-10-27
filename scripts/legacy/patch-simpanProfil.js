const fs = require('fs');
const f = process.argv[2];
let code = fs.readFileSync(f, 'utf8');

const oldFn = `export async function simpanProfil(formData: FormData) {
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

  if (error) redirect(\`/onboarding?ralat=\${encodeURIComponent(error.message)}\`);
  redirect("/app");
}`;

const newFn = `export async function simpanProfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const business_name = (formData.get("business_name") as string)?.trim();
  const category_id = Number(formData.get("category_id"));
  if (!business_name || !category_id)
    redirect("/onboarding?ralat=Sila+isi+nama+bisnes+dan+pilih+kategori");

  // Platform: checkbox → comma-separated string
  const platformList = formData.getAll("platforms").map((s) => String(s)).join(", ");

  const { error } = await supabase
    .from("profiles")
    .update({
      business_name,
      category_id,
      products: ((formData.get("products") as string) ?? "").trim(),
      target_customer: ((formData.get("target_customer") as string) ?? "").trim(),
      location: ((formData.get("location") as string) ?? "").trim(),
      usp: ((formData.get("usp") as string) ?? "").trim(),
      tone_of_voice: ((formData.get("tone_of_voice") as string) ?? "").trim(),
      main_competitors: ((formData.get("main_competitors") as string) ?? "").trim(),
      price_range: ((formData.get("price_range") as string) ?? "").trim(),
      platforms: platformList,
      website: ((formData.get("website") as string) ?? "").trim(),
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) redirect(\`/onboarding?ralat=\${encodeURIComponent(error.message)}\`);
  redirect("/app");
}`;

if (code.includes(oldFn)) {
  code = code.replace(oldFn, newFn);
  fs.writeFileSync(f, code);
  console.log('PATCHED');
} else {
  console.log(code.includes('tone_of_voice') ? 'ALREADY_PATCHED' : 'PATTERN_NOT_FOUND');
}
