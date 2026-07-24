export function TerminalStream({ logs }: { logs: string[] }) {
  return (
    <pre className="max-h-64 overflow-auto rounded bg-black p-3 font-mono text-xs text-green-400">
      {logs.join("\n") || "waiting for logs…"}
    </pre>
  );
}
