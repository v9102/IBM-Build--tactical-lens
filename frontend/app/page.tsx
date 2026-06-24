"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getMatches, type MatchSummary } from "@/lib/api";

export default function Home() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getMatches().then(setMatches).catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">
        Tactical <span className="text-emerald-400">Lens</span>
      </h1>
      <p className="mt-2 text-neutral-400">
        Pick a World Cup moment. Three AI agents explain <em>why</em> it happened — not just what.
      </p>

      {err && (
        <p className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          Can&apos;t reach the backend ({err}). Is it running on :8000?
        </p>
      )}
      {!matches && !err && <p className="mt-6 text-neutral-500">Loading matches…</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches?.map((m) => (
          <Link
            key={m.id}
            href={`/analyze/${m.id}`}
            className="group rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-emerald-600 hover:bg-neutral-800"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-400">{m.year}</div>
            <div className="mt-1 text-lg font-semibold">{m.title}</div>
            <div className="mt-1 text-sm text-neutral-400">
              {m.teams.home} vs {m.teams.away}
            </div>
            <div className="mt-3 text-sm text-neutral-500 group-hover:text-neutral-300">
              {m.moment_label} →
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
