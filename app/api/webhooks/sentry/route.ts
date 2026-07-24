import { NextRequest, NextResponse } from "next/server";
import { normalizeSentry } from "@/lib/normalize";
import { runPipeline } from "@/lib/pipeline";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const payload = normalizeSentry(body);
  // fire and forget — dashboard streams progress
  void runPipeline(payload).catch((e) => console.error("pipeline error", e));
  return NextResponse.json({ ok: true, incidentId: payload.id });
}
