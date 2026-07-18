import { NextResponse } from "next/server";
import { listUsablePresets } from "@/lib/presets";

export async function GET() {
  return NextResponse.json({ presets: listUsablePresets() });
}
