import { NextRequest, NextResponse } from "next/server";
import { normalizeGithub } from "@/lib/normalize";
import { runPipeline } from "@/lib/pipeline";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.workflow_run?.conclusion && body.workflow_run.conclusion !== "failure") {
    return NextResponse.json({ ok: true, skipped: "not a failure" });
  }
  const payload = normalizeGithub(body);
  await runPipeline(payload).catch((e) => console.error("pipeline error", e));
  return NextResponse.json({ ok: true, incidentId: payload.id });
}
