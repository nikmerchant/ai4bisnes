const fs = require('fs');
const f = '/root/projects/ai4bisnes/src/app/actions.ts';
let code = fs.readFileSync(f, 'utf8');

const old = `const { error } = await supabase
    .from("profiles")
    .update({
      business_name,
      category_id,
      products: ((formData.get("products") as string) ?? "").trim(),
      target_customer: ((formData.get("target_customer") as string) ?? "").trim(),
      location: ((formData.get("location") as string) ?? "").trim(),
      onboarded: true,
    })
    .eq("id", user.id);`;

const updated = `// Baca tier sedia ada sebelum update — elak overwrite ke 'basic'
  const { data: profilSediaAda } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      business_name,
      category_id,
      products: ((formData.get("products") as string) ?? "").trim(),
      target_customer: ((formData.get("target_customer") as string) ?? "").trim(),
      location: ((formData.get("location") as string) ?? "").trim(),
      onboarded: true,
      tier: profilSediaAda?.tier ?? "basic",
    })
    .eq("id", user.id);`;

if (code.includes(old)) {
  code = code.replace(old, updated);
  fs.writeFileSync(f, code);
  console.log('PATCHED');
} else {
  console.log(code.includes('profilSediaAda') ? 'ALREADY_PATCHED' : 'NEED_MANUAL');
}
