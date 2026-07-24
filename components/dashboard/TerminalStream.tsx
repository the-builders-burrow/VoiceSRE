import { Terminal, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

export function TerminalStream({ logs }: { logs: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [logs]);

  const hasLogs = logs.length > 0 && logs.some((l) => l.trim());

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
      {/* Terminal header */}
      <div className="flex items-center justify-between bg-muted px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Terminal className="size-3" />
          <span className="font-medium">sandbox output</span>
          {hasLogs && (
            <span className="tabular-nums text-[11px] opacity-50">{logs.filter(l => l.trim()).length} lines</span>
          )}
        </div>
        {hasLogs && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {/* Terminal body */}
      <div className="bg-black/70">
        <pre className="max-h-56 overflow-auto p-3 font-mono text-xs leading-relaxed text-emerald-400/90 selection:bg-emerald-500/30">
          {hasLogs ? (
            logs.map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-3 select-none text-emerald-700/50 text-right w-6 shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className="whitespace-pre-wrap break-all">{line || " "}</span>
              </div>
            ))
          ) : (
            <span className="text-emerald-700/60 animate-pulse">waiting for logs…</span>
          )}
        </pre>
      </div>
    </div>
  );
}
