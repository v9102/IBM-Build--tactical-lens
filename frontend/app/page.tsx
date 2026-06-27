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
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Tactical <span className="text-emerald-400">Lens</span>
        </h1>
        <p className="mt-2 text-neutral-400">
          Three AI agents explain <em>why</em> World Cup moments happened — formations, momentum swings, referee decisions.
        </p>
      </div>

      {err && (
        <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          <p className="font-semibold">Can&apos;t reach the backend</p>
          <p className="mt-1 text-red-400/80">{err}</p>
          <button
            onClick={() => { setErr(null); getMatches().then(setMatches).catch((e) => setErr(String(e))); }}
            className="mt-2 rounded bg-red-900/50 px-3 py-1 text-xs transition hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!matches && !err && (
          <>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <div className="mb-2 h-3 w-12 animate-pulse rounded bg-neutral-800" />
                <div className="mb-1 h-5 w-4/5 animate-pulse rounded bg-neutral-800" />
                <div className="mb-3 h-3 w-3/5 animate-pulse rounded bg-neutral-800" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-800" />
              </div>
            ))}
          </>
        )}

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

      {matches && matches.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">No matches found.</p>
      )}

      <div className="mt-12 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-center">
        <p className="text-sm text-neutral-400">
          Powered by <span className="font-medium text-emerald-400">IBM Granite</span> language models ·
          Built with LangChain · FastAPI · Next.js
        </p>
      </div>
    </main>
  );
}
