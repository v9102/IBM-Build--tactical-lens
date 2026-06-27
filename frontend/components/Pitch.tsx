"use client";
import { useState } from "react";
import type { PitchData, PlayerDot } from "@/lib/api";

const W = 100;
const H = 64;
const sy = (y: number) => (y / 100) * H;

export default function Pitch({ pitch }: { pitch: PitchData }) {
  const [tooltip, setTooltip] = useState<{ p: PlayerDot; side: "home" | "away" } | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-emerald-950 shadow-lg">
        {/* Pitch surface */}
        <rect x="0" y="0" width={W} height={H} fill="#166534" />
        <g stroke="#86efac" strokeWidth="0.3" fill="none" opacity="0.65">
          <rect x="2" y="2" width={W - 4} height={H - 4} />
          <line x1={W / 2} y1="2" x2={W / 2} y2={H - 2} />
          <circle cx={W / 2} cy={H / 2} r="7" />
          <rect x="2" y={H / 2 - 11} width="11" height="22" />
          <rect x={W - 13} y={H / 2 - 11} width="11" height="22" />
        </g>

        {/* Arrow definitions */}
        <defs>
          <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#fde047" />
          </marker>
        </defs>

        {/* Movement arrows */}
        {pitch.arrows?.map((a, i) => {
          const mx = (a.from.x + a.to.x) / 2;
          const my = sy((a.from.y + a.to.y) / 2);
          return (
            <g key={i}>
              <line
                x1={a.from.x}
                y1={sy(a.from.y)}
                x2={a.to.x}
                y2={sy(a.to.y)}
                stroke="#fde047"
                strokeWidth="0.6"
                markerEnd="url(#arrowhead)"
                opacity="0.9"
                strokeDasharray={a.label ? "0" : "2,1"}
              />
              {a.label && (
                <text
                  x={mx}
                  y={my - 1.5}
                  textAnchor="middle"
                  fontSize="1.4"
                  fill="#fde047"
                  stroke="#0b0b0b"
                  strokeWidth="0.04"
                  className="pointer-events-none"
                >
                  {a.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Players */}
        {pitch.home.map((p, i) => (
          <Dot
            key={`h${i}`}
            p={p}
            color="#3b82f6"
            labelAbove={false}
            onHover={() => setTooltip({ p, side: "home" })}
            onLeave={() => setTooltip(null)}
          />
        ))}
        {pitch.away.map((p, i) => (
          <Dot
            key={`a${i}`}
            p={p}
            color="#ef4444"
            labelAbove={true}
            onHover={() => setTooltip({ p, side: "away" })}
            onLeave={() => setTooltip(null)}
          />
        ))}

        {/* Ball */}
        <circle cx={pitch.ball.x} cy={sy(pitch.ball.y)} r="1" fill="#fff" stroke="#000" strokeWidth="0.15" />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
          style={{
            left: `${(tooltip.p.x / W) * 100}%`,
            top: `${sy(tooltip.p.y) / H * 100 + 4}%`,
            transform: "translate(-50%, 0)",
          }}
        >
          <p className="font-semibold text-neutral-100">{tooltip.p.name}</p>
          <p className="text-neutral-400">{tooltip.p.role}</p>
          {tooltip.p.highlight && <p className="text-emerald-400">★ Key player</p>}
        </div>
      )}
    </div>
  );
}

function Dot({
  p,
  color,
  labelAbove,
  onHover,
  onLeave,
}: {
  p: PlayerDot;
  color: string;
  labelAbove: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const r = p.highlight ? 2.4 : 1.8;
  const ly = labelAbove ? sy(p.y) - r - 1 : sy(p.y) + r + 2;

  return (
    <g onMouseEnter={onHover} onMouseLeave={onLeave} className="cursor-pointer">
      {p.highlight && (
        <circle cx={p.x} cy={sy(p.y)} r={r + 1.2} fill="none" stroke="#fde047" strokeWidth="0.4" opacity="0.7" />
      )}
      <circle cx={p.x} cy={sy(p.y)} r={r} fill={color} stroke="#0b0b0b" strokeWidth="0.2" />
      <text
        x={p.x}
        y={ly}
        textAnchor="middle"
        fontSize="1.8"
        fill="#f8fafc"
        stroke="#0b0b0b"
        strokeWidth="0.07"
        className="pointer-events-none"
      >
        {p.name}
      </text>
    </g>
  );
}
