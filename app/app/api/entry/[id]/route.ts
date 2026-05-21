import { NextResponse } from "next/server";
import { getEntry } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(entry, {
    headers: {
      // Entry rows are immutable in v1; long edge cache is fine
      "Cache-Control":
        "public, s-maxage=31536000, stale-while-revalidate=31536000",
    },
  });
}
