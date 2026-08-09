import { NextRequest, NextResponse } from "next/server";
import { dapatkanProfil } from "@/app/app/shared";
import { getTask, generatePrompt } from "@/app/app/wizard/tasks";

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

  const { profil } = await dapatkanProfil();

  // Collect inputs
  const inputs: Record<string, string> = {};
  for (const f of task.fields) {
    inputs[f.name] = (formData.get(f.name) as string) || "";
  }

  // Generate
  const prompt = generatePrompt(task, inputs, profil);

  return NextResponse.json({ prompt });
}
