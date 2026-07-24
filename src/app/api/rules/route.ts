import { NextResponse } from "next/server";
import { getPeraturan } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ data: await getPeraturan() });
  } catch {
    return NextResponse.json({ error: "Gagal memuat peraturan" }, { status: 500 });
  }
}
