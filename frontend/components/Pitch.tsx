import type { PitchData, PlayerDot } from "@/lib/api";

// Data coords are 0-100 in both axes; the pitch renders 100 x 64 (≈ real ratio),
// so y is scaled and x passes through.
const W = 100;
const H = 64;
const sy = (y: number) => (y / 100) * H;

export default function Pitch({ pitch }: { pitch: PitchData }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-emerald-950 shadow-lg">
      <rect x="0" y="0" width={W} height={H} fill="#166534" />
      <g stroke="#86efac" strokeWidth="0.3" fill="none" opacity="0.65">
        <rect x="2" y="2" width={W - 4} height={H - 4} />
        <line x1={W / 2} y1="2" x2={W / 2} y2={H - 2} />
        <circle cx={W / 2} cy={H / 2} r="7" />
        <rect x="2" y={H / 2 - 11} width="11" height="22" />
        <rect x={W - 13} y={H / 2 - 11} width="11" height="22" />
      </g>

      <defs>
        <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2.5" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="#fde047" />
        </marker>
      </defs>
      {pitch.arrows?.map((a, i) => (
        <line
          key={i}
          x1={a.from.x}
          y1={sy(a.from.y)}
          x2={a.to.x}
          y2={sy(a.to.y)}
          stroke="#fde047"
          strokeWidth="0.5"
          markerEnd="url(#arrowhead)"
          opacity="0.9"
        />
      ))}

      {/* home labels below the dot, away labels above — keeps names from colliding
          where the two lines meet in midfield */}
      {pitch.home.map((p, i) => (
        <Dot key={`h${i}`} p={p} color="#3b82f6" labelAbove={false} />
      ))}
      {pitch.away.map((p, i) => (
        <Dot key={`a${i}`} p={p} color="#ef4444" labelAbove={true} />
      ))}

      <circle cx={pitch.ball.x} cy={sy(pitch.ball.y)} r="0.9" fill="#fff" stroke="#000" strokeWidth="0.15" />
    </svg>
  );
}

function Dot({ p, color, labelAbove }: { p: PlayerDot; color: string; labelAbove: boolean }) {
  const r = p.highlight ? 2.2 : 1.7;
  const ly = labelAbove ? sy(p.y) - r - 0.9 : sy(p.y) + r + 1.9;
  return (
    <g>
      {p.highlight && (
        <circle cx={p.x} cy={sy(p.y)} r={r + 1} fill="none" stroke="#fde047" strokeWidth="0.4" />
      )}
      <circle cx={p.x} cy={sy(p.y)} r={r} fill={color} stroke="#0b0b0b" strokeWidth="0.2" />
      <text x={p.x} y={ly} textAnchor="middle" fontSize="1.7" fill="#f8fafc" stroke="#0b0b0b" strokeWidth="0.06">
        {p.name}
      </text>
    </g>
  );
}
