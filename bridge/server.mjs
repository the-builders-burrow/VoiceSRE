// VoiceSRE telephony bridge: Twilio Media Streams <-> ElevenLabs Conversational AI.
// Runs as a standalone process (Next.js App Router can't do raw WS upgrade for Twilio).
// No Twilio number import required, so it works on a trial account (calls.create is allowed).
//
// Run:  node --env-file=.env.local bridge/server.mjs
// Needs a public tunnel to PORT (e.g. cloudflared) exported as PUBLIC_URL=https://xxx.trycloudflare.com
import Fastify from "fastify";
import fastifyWs from "@fastify/websocket";
import fastifyFormBody from "@fastify/formbody";
import WebSocket from "ws";
import Twilio from "twilio";

const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  PUBLIC_URL, // https tunnel to this server, no trailing slash
  NEXT_WEBHOOK_URL = "http://localhost:3000/api/elevenlabs/webhook",
} = process.env;

const PORT = Number(process.env.BRIDGE_PORT || 8080);
if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  throw new Error("bridge: missing required env (ELEVENLABS_*/TWILIO_*)");
}
const PUBLIC_HOST = (PUBLIC_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

const twilio = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

async function getSignedUrl() {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
    { headers: { "xi-api-key": ELEVENLABS_API_KEY } },
  );
  if (!r.ok) throw new Error(`get_signed_url ${r.status}: ${await r.text()}`);
  return (await r.json()).signed_url;
}

function classify(text) {
  const t = (text || "").toLowerCase();
  if (/\b(reject|no|deny|decline|don'?t)\b/.test(t)) return "REJECT";
  if (/\b(approve|yes|confirm|ship|go ahead|do it)\b/.test(t)) return "APPROVE";
  return "UNCLEAR";
}

fastify.get("/health", async () => ({ ok: true, publicUrl: PUBLIC_URL || null }));

// Next.js dispatchCall() POSTs here (server-to-server, can be localhost).
fastify.post("/outbound-call", async (req, reply) => {
  const { number, incidentId = "", summary = "" } = req.body || {};
  if (!number) return reply.code(400).send({ error: "number required" });
  if (!PUBLIC_HOST) return reply.code(500).send({ error: "PUBLIC_URL not set" });
  const qs = `incidentId=${encodeURIComponent(incidentId)}&summary=${encodeURIComponent(summary)}`;
  const call = await twilio.calls.create({
    from: TWILIO_PHONE_NUMBER,
    to: number,
    url: `https://${PUBLIC_HOST}/outbound-call-twiml?${qs}`,
  });
  return reply.send({ success: true, callSid: call.sid });
});

// Twilio fetches this over the tunnel to learn where to stream audio.
fastify.all("/outbound-call-twiml", async (req, reply) => {
  const incidentId = req.query.incidentId || "";
  const summary = req.query.summary || "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${PUBLIC_HOST}/outbound-media-stream">
      <Parameter name="incidentId" value="${incidentId}" />
      <Parameter name="summary" value="${summary}" />
    </Stream>
  </Connect>
</Response>`;
  reply.type("text/xml").send(xml);
});

fastify.register(async (f) => {
  f.get("/outbound-media-stream", { websocket: true }, (ws) => {
    let streamSid = null;
    let elevenWs = null;
    let params = { incidentId: "", summary: "" };
    let decided = false;

    ws.on("error", console.error);

    const notifyDecision = async (transcript) => {
      if (decided) return;
      const decision = classify(transcript);
      if (decision === "UNCLEAR") return;
      decided = true;
      console.log(`[bridge] decision=${decision} for incident=${params.incidentId}`);
      try {
        await fetch(NEXT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            conversation_initiation_client_data: {
              dynamic_variables: { incident_id: params.incidentId },
            },
          }),
        });
      } catch (e) {
        console.error("[bridge] webhook POST failed:", e.message);
      }
    };

    const setupEleven = async () => {
      const signedUrl = await getSignedUrl();
      elevenWs = new WebSocket(signedUrl);

      elevenWs.on("open", () => {
        const firstMessage = params.summary
          ? `This is VoiceSRE. ${params.summary}`
          : "This is VoiceSRE, an autonomous on-call agent.";
        elevenWs.send(JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: {
              prompt: {
                prompt:
                  "You are VoiceSRE, an autonomous site-reliability engineer calling the on-call engineer about a production incident. " +
                  "State the root cause in one sentence, report the safety confidence score, then ask clearly: should I open the pull request? " +
                  "Listen for approval or rejection. When the engineer says approve or reject, confirm the decision in one short sentence and end the call. Keep it brief.",
              },
              first_message: firstMessage,
            },
          },
          dynamic_variables: { incident_id: params.incidentId, summary: params.summary },
        }));
      });

      elevenWs.on("message", (data) => {
        let m;
        try { m = JSON.parse(data); } catch { return; }
        switch (m.type) {
          case "audio": {
            const payload = m.audio?.chunk || m.audio_event?.audio_base_64;
            if (streamSid && payload) {
              ws.send(JSON.stringify({ event: "media", streamSid, media: { payload } }));
            }
            break;
          }
          case "user_transcript": {
            const t = m.user_transcription_event?.user_transcript || "";
            if (t) { console.log("[caller]", t); notifyDecision(t); }
            break;
          }
          case "interruption":
            if (streamSid) ws.send(JSON.stringify({ event: "clear", streamSid }));
            break;
          case "ping":
            if (m.ping_event?.event_id) {
              elevenWs.send(JSON.stringify({ type: "pong", event_id: m.ping_event.event_id }));
            }
            break;
          default:
            break;
        }
      });

      elevenWs.on("error", (e) => console.error("[ElevenLabs] ws error:", e.message));
      elevenWs.on("close", () => console.log("[ElevenLabs] disconnected"));
    };

    ws.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      switch (msg.event) {
        case "start":
          streamSid = msg.start.streamSid;
          params = { ...params, ...(msg.start.customParameters || {}) };
          console.log(`[Twilio] stream start incident=${params.incidentId}`);
          setupEleven();
          break;
        case "media":
          if (elevenWs?.readyState === WebSocket.OPEN) {
            elevenWs.send(JSON.stringify({ user_audio_chunk: msg.media.payload }));
          }
          break;
        case "stop":
          if (elevenWs?.readyState === WebSocket.OPEN) elevenWs.close();
          break;
        default:
          break;
      }
    });

    ws.on("close", () => {
      if (elevenWs?.readyState === WebSocket.OPEN) elevenWs.close();
    });
  });
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, addr) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`[bridge] listening on ${addr}`);
  console.log(`[bridge] PUBLIC_URL=${PUBLIC_URL || "(unset - set it before calling)"}`);
});
