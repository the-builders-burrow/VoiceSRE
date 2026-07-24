import { NextRequest, NextResponse } from "next/server";
import { normalizeSentry } from "@/lib/normalize";
import { runPipeline } from "@/lib/pipeline";
import { appendLog, updateIncident } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("[sentry] webhook received", JSON.stringify(body).slice(0, 200));
  const payload = normalizeSentry(body);
  console.log("[sentry] normalized", payload.id, payload.title);
  try {
    await runPipeline(payload);
  } catch (e) {
    console.error("pipeline error", e);
    appendLog(payload.id, `[error] pipeline failed: ${e}`);
    updateIncident(payload.id, { status: "REJECTED" });
  }
  return NextResponse.json({ ok: true, incidentId: payload.id });
}
