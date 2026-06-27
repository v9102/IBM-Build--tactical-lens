"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getMatch, streamCompare, exportMatch, type Moment } from "@/lib/api";
import Pitch from "@/components/Pitch";
import AgentPanel from "@/components/AgentPanel";

const ORDER = [
  { key: "tactical", label: "Tactical Analyst" },
  { key: "momentum", label: "Momentum Analyst" },
  { key: "decision", label: "Decision Explainer" },
];

type Panel = { text: string; status: "idle" | "streaming" | "done"; sources: string[]; confidence?: number; keyFactors?: string[] };

const blankPanels = (): Record<string, Panel> => ({
  text: "", status: "idle", sources: [],
});

export default function ComparePage() {
  const sp = useSearchParams();
  const id1 = sp.get("match1");
  const id2 = sp.get("match2");

  const [m1, setM1] = useState<Moment | null>(null);
  const [m2, setM2] = useState<Moment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [panels1, setPanels1] = useState<Record<string, Panel>>({});
  const [panels2, setPanels2] = useState<Record<string, Panel>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<1 | 2 | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (id1) getMatch(id1).then(setM1).catch((e) => setErr(String(e)));
    if (id2) getMatch(id2).then(setM2).catch((e) => setErr(String(e)));
  }, [id1, id2]);

  const runComparison = () => {
    if (!id1 || !id2) return;
    started.current = true;
    setPanels1(Object.fromEntries(ORDER.map((a) => [a.key, { ...blankPanels() }])));
    setPanels2(Object.fromEntries(ORDER.map((a) => [a.key, { ...blankPanels() }])));

    (async () => {
      try {
        for await (const ev of streamCompare(id1, id2)) {
          if (ev.type === "compare_agent_start") {
            setActiveKey(ev.key);
            setActiveSide(null);
          } else if (ev.type === "compare_side_start") {
            setActiveSide(ev.side as 1 | 2);
          } else if (ev.type === "compare_side_done") {
            setActiveSide(null);
          } else if (ev.type === "agent_start") {
            const setter = activeSide === 1 ? setPanels1 : setPanels2;
            setter((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], status: "streaming", confidence: ev.confidence },
            }));
          } else if (ev.type === "token") {
            const setter = activeSide === 1 ? setPanels1 : setPanels2;
            setter((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], text: p[ev.key].text + ev.content },
            }));
          } else if (ev.type === "agent_done") {
            const setter = activeSide === 1 ? setPanels1 : setPanels2;
            setter((p) => ({
              ...p,
              [ev.key]: {
                ...p[ev.key],
                status: "done",
                sources: ev.sources,
                confidence: ev.confidence ?? p[ev.key].confidence,
                keyFactors: ev.key_factors,
              },
            }));
          } else if (ev.type === "error") {
            const setter = activeSide === 1 ? setPanels1 : setPanels2;
            setter((p) => ({
              ...p,
              [ev.key]: { ...p[ev.key], text: `${p[ev.key].text}\n[error: ${ev.content}]`, status: "done" },
            }));
          }
        }
      } catch (e) {
        setErr(String(e));
      }
    })();
  };

  useEffect(() => {
    if ((m1 && m2) && !started.current) runComparison();
  }, [m1, m2]);

  if (!id1 || !id2) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackLink />
        <p className="mt-4 text-neutral-400">Select two matches to compare.</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackLink />
        <p className="mt-4 text-red-400">Error: {err}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-4">
      <BackLink />
      <header className="mt-2 mb-5">
        <h1 className="text-xl font-bold">Comparison</h1>
        <p className="text-sm text-neutral-400">
          {m1 ? `${m1.teams.home} vs ${m1.teams.away} (${m1.year})` : "Loading…"} vs{" "}
          {m2 ? `${m2.teams.home} vs ${m2.teams.away} (${m2.year})` : "Loading…"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Match 1 */}
        <div>
          {m1 && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-emerald-400">{m1.teams.home} vs {m1.teams.away}</h2>
                <Link href={`/analyze/${id1}`} className="text-xs text-neutral-500 hover:text-emerald-400">
                  Full analysis →
                </Link>
              </div>
              <Pitch pitch={m1.pitch} />
              <div className="mt-4 space-y-3">
                {ORDER.map((a) => (
                  <AgentPanel key={a.key} label={a.label} {...panels1[a.key]} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Match 2 */}
        <div>
          {m2 && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-emerald-400">{m2.teams.home} vs {m2.teams.away}</h2>
                <Link href={`/analyze/${id2}`} className="text-xs text-neutral-500 hover:text-emerald-400">
                  Full analysis →
                </Link>
              </div>
              <Pitch pitch={m2.pitch} />
              <div className="mt-4 space-y-3">
                {ORDER.map((a) => (
                  <AgentPanel key={a.key} label={a.label} {...panels2[a.key]} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/" className="text-sm text-emerald-400 hover:underline">
      ← back to matches
    </Link>
  );
}
