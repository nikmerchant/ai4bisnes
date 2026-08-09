import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dapatkanProfil } from "@/app/app/shared";
import { getTask, generatePrompt } from "../tasks";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const slug = formData.get("slug") as string;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const task = getTask(slug);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { profil, user } = await dapatkanProfil();

  // Collect inputs
  const inputs: Record<string, string> = {};
  for (const f of task.fields) {
    inputs[f.name] = (formData.get(f.name) as string) || "";
  }

  // Generate prompt
  const prompt = generatePrompt(task, inputs, profil);

  // Save to generated_outputs (guna service role untuk bypass RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );
    await admin.from("generated_outputs").insert({
      user_id: user.id,
      task_slug: slug,
      task_title: task.title,
      inputs: inputs,
      prompt_text: prompt,
    });
  }

  return NextResponse.json({ prompt });
}
