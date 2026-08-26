import { redirect } from "next/navigation";
import { dapatkanProfil, PANGKAT } from "@/app/app/shared";
import { getTask } from "../tasks";
import { TaskWizardClient } from "../task-wizard-client";
import Link from "next/link";
import { currentSlice1Access } from "@/lib/native-social-post/access";

export default async function TaskWizardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const task = getTask(slug);

  if (!task) redirect("/app/wizard");

  const { profil, user } = await dapatkanProfil();
  const pangkat = PANGKAT[profil.tier];
  const nativeSliceAvailable = task.slug === "social-post" && currentSlice1Access(user).allowed && pangkat >= PANGKAT.pro;

  if (PANGKAT[task.tier] > pangkat) {
    redirect("/naik-taraf");
  }

  const fieldsWithDefaults = task.fields.map((f) => {
    if (f.name === "produk" || f.name === "produk_detail") {
      return { ...f, defaultValue: profil.products || "" };
    }
    if (f.name === "tone") {
      return { ...f, defaultValue: profil.tone_of_voice || "" };
    }
    return f;
  });

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-10">
      <nav className="mb-4 flex items-center gap-4 text-sm">
        <Link href="/app" className="text-neutral-500 underline">
          ← Dashboard
        </Link>
        <Link href="/app/wizard" className="text-neutral-500 underline">
          ← Semua tugasan
        </Link>
      </nav>

      <h1 className="text-2xl font-bold">
        {task.emoji} {task.title}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{task.desc}</p>

      {nativeSliceAvailable && (
        <Link href="/app/native-social-post" className="mt-5 block rounded-xl border-2 border-violet-600 bg-violet-50 p-4 dark:bg-violet-950/40">
          <span className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">Slice 1 Local/Staging</span>
          <span className="mt-1 block font-bold">Cuba Native Social Post →</span>
          <span className="mt-1 block text-xs text-neutral-500">Jana, edit, simpan dan buka semula dalam AI4Bisnes. Smart Bridge di bawah kekal sebagai fallback.</span>
        </Link>
      )}

      <div className="mt-6">
        <TaskWizardClient
          slug={task.slug}
          taskTitle={task.title}
          taskEmoji={task.emoji}
          fields={fieldsWithDefaults}
        />
      </div>
    </main>
  );
}
