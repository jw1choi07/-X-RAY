import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const dir = path.join(process.cwd(), "data", "texts");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .sort();
  const presets = files.map((f) => ({
    file: f,
    label: f.replace(".txt", "").replace(/_/g, " · "),
  }));
  return NextResponse.json({ presets });
}
