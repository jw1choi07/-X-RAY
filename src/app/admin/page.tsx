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
      <p className="font-mono text-[11px] tracking-[0.15em] text-scan uppercase">Admin</p>
      <h1 className="mt-0.5 text-2xl font-bold text-foreground">관리자 대시보드</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        크롤링된 약관 문서 {presets.length}건이 등록되어 있습니다.
      </p>

      <ul className="mt-8 divide-y divide-border rounded-md border border-border bg-card">
        {presets.map((p) => (
          <li key={p.file} className="px-4 py-3 font-mono text-sm text-foreground">
            {p.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
