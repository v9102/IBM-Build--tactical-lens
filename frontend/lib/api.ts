export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type PlayerDot = { name: string; x: number; y: number; role: string; highlight?: boolean };
export type PitchData = {
  home: PlayerDot[];
  away: PlayerDot[];
  ball: { x: number; y: number };
  arrows: { from: { x: number; y: number }; to: { x: number; y: number }; label?: string }[];
};
export type Moment = {
  id: string;
  title: string;
  moment_label?: string;
  year: number;
  minute?: number;
  teams: { home: string; away: string };
  summary: string;
  facts: Record<string, unknown>;
  pitch: PitchData;
};
export type MatchSummary = {
  id: string;
  title: string;
  year: number;
  minute?: number;
  teams: { home: string; away: string };
  moment_label: string;
};

export type SSEEvent =
  | { type: "agent_start"; key: string; label: string }
  | { type: "token"; key: string; content: string }
  | { type: "agent_done"; key: string; sources: string[] }
  | { type: "error"; key: string; content: string }
  | { type: "done" };

export async function getMatches(): Promise<MatchSummary[]> {
  const r = await fetch(`${API}/matches`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET /matches ${r.status}`);
  return r.json();
}

export async function getMatch(id: string): Promise<Moment> {
  const r = await fetch(`${API}/matches/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET /matches/${id} ${r.status}`);
  return r.json();
}

// EventSource can't POST, so read the SSE stream off a fetch body manually.
export async function* streamAnalyze(matchId: string): AsyncGenerator<SSEEvent> {
  const r = await fetch(`${API}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_id: matchId }),
  });
  if (!r.ok || !r.body) throw new Error(`POST /analyze ${r.status}`);

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (raw.startsWith("data:")) {
        yield JSON.parse(raw.slice(5).trim()) as SSEEvent;
      }
    }
  }
}
