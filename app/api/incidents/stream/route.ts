import { listIncidents, getLogs, subscribe } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        const data = listIncidents().map((s) => ({ ...s, logs: getLogs(s.payload.id) }));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send();
      const unsubs = listIncidents().map((s) => subscribe(s.payload.id, send));
      // ponytail: 1s poll catches incidents created after subscribe; wire a global store event if it matters
      const interval = setInterval(send, 1000);
      cleanup = () => {
        unsubs.forEach((u) => u());
        clearInterval(interval);
      };
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
