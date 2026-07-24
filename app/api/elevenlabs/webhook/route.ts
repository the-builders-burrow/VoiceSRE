import { NextRequest, NextResponse } from "next/server";
import { classifyTranscript } from "@/lib/services/telephony";
import { approveIncident, rejectIncident } from "@/lib/pipeline";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const incidentId: string | undefined =
    body?.conversation_initiation_client_data?.dynamic_variables?.incident_id ??
    body?.dynamic_variables?.incident_id;
  const transcript: string =
    body?.transcript ??
    (Array.isArray(body?.messages) ? body.messages.map((m: any) => m.message ?? m.text ?? "").join(" ") : "");

  if (!incidentId) return NextResponse.json({ ok: false, error: "no incident id" }, { status: 400 });

  const decision = classifyTranscript(transcript);
  if (decision === "APPROVE") await approveIncident(incidentId);
  else if (decision === "REJECT") rejectIncident(incidentId);

  return NextResponse.json({ ok: true, decision });
}
