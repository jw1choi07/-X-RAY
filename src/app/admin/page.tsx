import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listUsablePresets } from "@/lib/presets";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (user.publicMetadata.role !== "admin") redirect("/");

  const presets = listUsablePresets();

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        크롤링된 약관 문서 {presets.length}건이 등록되어 있습니다.
      </p>

      <ul className="mt-8 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {presets.map((p) => (
          <li key={p.file} className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
            {p.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
