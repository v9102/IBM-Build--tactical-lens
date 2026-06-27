"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getMatch, streamAnalyze, streamRegenerate, exportMatch, type Moment } from "@/lib/api";
import Pitch from "@/components/Pitch";
import AgentPanel from "@/components/AgentPanel";

const ORDER = [
  { key: "tactical", label: "Tactical Analyst" },
  { key: "momentum", label: "Momentum Analyst" },
  { key: "decision", label: "Decision Explainer" },
];

type Status = "idle" | "streaming" | "done";
type Panel = {
  text: string;
  status: Status;
  sources: string[];
  confidence?: number;
  keyFactors?: string[];
};

const blankPanels = (): Record<string, Panel> =>
  Object.fromEntries(ORDER.map((a) => [a.key, { text: "", status: "idle", sources: [] }]));

export default function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<string, Panel>>(blankPanels);
  const [exporting, setExporting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    getMatch(id).then(setMoment).catch((e) => setErr(String(e)));
  }, [id]);

  const runAnalysis = (matchId: string) => {
    started.current = true;
    setPanels(blankPanels());
    (async () => {
      try {
        for await (const ev of streamAnalyze(matchId)) {
          if (ev.type === "agent_start")
            setPanels((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], status: "streaming", confidence: ev.confidence },
            }));
          else if (ev.type === "token")
            setPanels((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], text: p[ev.key].text + ev.content },
            }));
          else if (ev.type === "agent_done")
            setPanels((p) => ({
              ...p,
              [ev.key]: {
                ...p[ev.key],
                status: "done",
                sources: ev.sources,
                confidence: ev.confidence ?? p[ev.key].confidence,
                keyFactors: ev.key_factors,
              },
            }));
          else if (ev.type === "error")
            setPanels((p) => ({
              ...p,
              [ev.key]: {
                ...p[ev.key],
                text: `${p[ev.key].text}\n[error: ${ev.content}]`,
                status: "done",
              },
            }));
        }
      } catch (e) {
        setErr(String(e));
      }
    })();
  };

  useEffect(() => {
    if (!moment || started.current) return;
    runAnalysis(id);
  }, [moment, id]);

  const handleRegenerate = (agentKey: string) => {
    (async () => {
      setPanels((p) => ({ ...p, [agentKey]: { text: "", status: "streaming", sources: [], confidence: 50 } }));
      try {
        for await (const ev of streamRegenerate(id, agentKey)) {
          if (ev.type === "agent_start")
            setPanels((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], status: "streaming", confidence: ev.confidence },
            }));
          else if (ev.type === "token")
            setPanels((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], text: p[ev.key].text + ev.content },
            }));
          else if (ev.type === "agent_done")
            setPanels((p) => ({
              ...p,
              [ev.key]: {
                ...p[ev.key],
                status: "done",
                sources: ev.sources,
                confidence: ev.confidence ?? p[ev.key].confidence,
                keyFactors: ev.key_factors,
              },
            }));
          else if (ev.type === "error")
            setPanels((p) => ({
              ...p,
              [ev.key]: {
                ...p[ev.key],
                text: `${p[ev.key].text}\n[error: ${ev.content}]`,
                status: "done",
              },
            }));
        }
      } catch (e) {
        setErr(String(e));
      }
    })();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const md = await exportMatch(id);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tactical-lens-${id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Export failed");
    }
    setExporting(false);
  };

  if (err)
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackLink />
        <p className="mt-4 text-red-400">Error: {err}</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-4">
      <BackLink />
      {!moment ? (
        <div className="mt-8 space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded bg-neutral-800" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-800" />
        </div>
      ) : (
        <>
          <header className="mt-2 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{moment.title}</h1>
                <p className="text-neutral-400">
                  {moment.teams.home} vs {moment.teams.away} · {moment.year} · {moment.minute}&apos;
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/analyze/compare?match1=${id}&match2=`}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-emerald-600 hover:text-emerald-400"
                >
                  Compare
                </Link>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-emerald-600 hover:text-emerald-400 disabled:opacity-50"
                >
                  {exporting ? "Exporting…" : "Export"}
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <Pitch pitch={moment.pitch} />
              <div className="mt-2 flex gap-4 text-xs text-neutral-400">
                <Legend color="#3b82f6" name={moment.teams.home} />
                <Legend color="#ef4444" name={moment.teams.away} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">{moment.summary}</p>
            </div>

            <div className="space-y-4">
              {ORDER.map((a) => (
                <AgentPanel
                  key={a.key}
                  label={a.label}
                  {...panels[a.key]}
                  onRegenerate={() => handleRegenerate(a.key)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Legend({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

function BackLink() {
  return (
    <Link href="/" className="text-sm text-emerald-400 hover:underline">
      ← back to matches
    </Link>
  );
}
