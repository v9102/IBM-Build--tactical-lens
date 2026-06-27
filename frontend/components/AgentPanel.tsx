"use client";
import { useState } from "react";

type Status = "idle" | "streaming" | "done";

export default function AgentPanel({
  label,
  text,
  status,
  sources,
  confidence,
  keyFactors,
  onRegenerate,
  onCopy,
}: {
  label: string;
  text: string;
  status: Status;
  sources: string[];
  confidence?: number;
  keyFactors?: string[];
  onRegenerate?: () => void;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition hover:border-neutral-700">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-emerald-300">{label}</h3>
          {confidence !== undefined && status === "done" && (
            <ConfidenceBadge score={confidence} />
          )}
        </div>
        <Badge status={status} />
      </div>

      {status === "streaming" && confidence !== undefined && (
        <div className="mb-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-[10px] text-neutral-500">Confidence: {confidence}%</p>
        </div>
      )}

      {text ? (
        <>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
            {text}
            {status === "streaming" && <span className="ml-0.5 animate-pulse">▍</span>}
          </div>

          {keyFactors && keyFactors.length > 0 && status === "done" && (
            <div className="mt-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Key Factors
              </p>
              <ul className="space-y-0.5">
                {keyFactors.map((f, i) => (
                  <li key={i} className="text-xs text-neutral-300">
                    • {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-800" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-neutral-800" />
          <div className="h-3 w-3/6 animate-pulse rounded bg-neutral-800" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sources.length > 0 && (
          <span className="text-[11px] text-neutral-500">
            Sources: {sources.join(", ")}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          {onRegenerate && status === "done" && (
            <button
              onClick={onRegenerate}
              className="rounded px-2 py-1 text-[11px] text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
              title="Regenerate this analysis"
            >
              🔄 Regenerate
            </button>
          )}
          {text && status === "done" && (
            <button
              onClick={onCopy ?? handleCopy}
              className="rounded px-2 py-1 text-[11px] text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
              title="Copy to clipboard"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {score}%
    </span>
  );
}

function Badge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    idle: "bg-neutral-700 text-neutral-300",
    streaming: "bg-amber-500/20 text-amber-300",
    done: "bg-emerald-500/20 text-emerald-300",
  };
  const label = { idle: "queued", streaming: "analyzing…", done: "done" }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs ${map[status]}`}>{label}</span>;
}
