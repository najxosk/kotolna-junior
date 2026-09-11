import type { Controls, SimState, StatusTone } from "@/game/types";
import { displayedWater } from "@/game/sim";
import { cn } from "@/lib/utils";

interface Props {
  sim: SimState;
  controls: Controls;
  showCircuit: boolean;
}

export function BoilerScene({ sim, controls, showCircuit }: Props) {
  const water = displayedWater(sim);
  const tankTop = 48;
  const tankBot = 168;
  const waterY = tankBot - water * (tankBot - tankTop);
  const flameH = 8 + sim.flame * 28;
  const smokeN = sim.smoke > 0.08 ? Math.min(5, 2 + Math.round(sim.smoke * 4)) : 0;
  const fanOn = controls.airFlow > 0.12;
  const pumpOn = controls.pumpOn;
  const draftOpen = controls.chimneyDraft;

  const flameFill =
    sim.flameKind === "sooty"
      ? "#d4a03a"
      : sim.flameKind === "lean"
        ? "#f0c9a0"
        : sim.flameKind === "good"
          ? "#5ec8ff"
          : "transparent";
  const flameOuter =
    sim.flameKind === "off" ? "transparent" : sim.flameKind === "good" ? "#e07838" : "#e8b84a";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-inset",
        sim.status === "alarm" && "ring-2 ring-alarm",
      )}
      aria-hidden="true"
    >
      {sim.roomSmoke > 0.08 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-steel/40"
          style={{ opacity: Math.min(0.55, sim.roomSmoke * 0.7) }}
        />
      )}
      {sim.status === "alarm" && (
        <div className="alarm-pulse pointer-events-none absolute inset-0 z-10 bg-alarm/20" />
      )}

      <svg viewBox="0 0 390 220" className="block h-auto w-full">
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a222c" />
            <stop offset="1" stopColor="#141a22" />
          </linearGradient>
          <linearGradient id="boilerMetal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5c6570" />
            <stop offset="0.45" stopColor="#c5ccd4" />
            <stop offset="1" stopColor="#6a7380" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5aa0c8" />
            <stop offset="1" stopColor="#2c6288" />
          </linearGradient>
          <clipPath id="tankClip">
            <rect x="142" y={tankTop} width="92" height={tankBot - tankTop} rx="8" />
          </clipPath>
        </defs>

        <rect width="390" height="220" fill="url(#wall)" />
        {/* brick hints */}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={i}
            x="0"
            y={18 + i * 28}
            width="390"
            height="1"
            fill="#2a3340"
            opacity="0.55"
          />
        ))}
        <rect x="0" y="196" width="390" height="24" fill="#1c1814" />
        <rect x="0" y="196" width="390" height="3" fill="#3a3228" />

        {showCircuit && (
          <g>
            <rect x="18" y="78" width="52" height="88" rx="4" fill="#3a414c" stroke="#8b97a6" />
            {Array.from({ length: 6 }).map((_, i) => (
              <rect
                key={i}
                x="22"
                y={86 + i * 12}
                width="44"
                height="6"
                rx="1"
                fill={sim.circuitTemp > 40 ? "#c44c3a" : "#5a6572"}
                opacity={0.45 + Math.min(0.55, (sim.circuitTemp - 16) / 80)}
              />
            ))}
            <text x="44" y="180" textAnchor="middle" fill="#9aa3ad" fontSize="9">
              radiátor
            </text>
            <path
              d="M70 92 H118"
              fill="none"
              stroke={sim.circuitTemp > 40 && pumpOn ? "#c44c3a" : "#5a6572"}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M70 150 H118"
              fill="none"
              stroke={pumpOn ? "#3a7ca5" : "#5a6572"}
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* boiler body */}
        <rect
          x="128"
          y="40"
          width="120"
          height="140"
          rx="14"
          fill="url(#boilerMetal)"
          stroke="#2a3340"
          strokeWidth="2"
        />
        <rect x="136" y="48" width="104" height="124" rx="10" fill="#2a313a" />
        <rect
          x="142"
          y={waterY}
          width="92"
          height={tankBot - waterY}
          fill="url(#waterGrad)"
          clipPath="url(#tankClip)"
          opacity="0.92"
        />
        <path
          d="M142 70 h92"
          stroke="#3d9a6a"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.7"
        />
        <path
          d="M142 118 h92"
          stroke="#3d9a6a"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.7"
        />

        {/* sight glass */}
        <rect
          x="236"
          y="58"
          width="12"
          height="100"
          rx="3"
          fill="#0e141c"
          stroke="#8b97a6"
        />
        <rect
          x="238"
          y={58 + (1 - water) * 100}
          width="8"
          height={water * 100}
          rx="2"
          fill="#3a7ca5"
        />

        {/* safety valve */}
        <g transform="translate(176,28)">
          <rect x="8" y="0" width="10" height="14" fill="#8b97a6" />
          <rect x="4" y="-6" width="18" height="8" rx="2" fill={sim.reliefOpen ? "#c44c3a" : "#c5ccd4"} />
          {sim.reliefOpen && (
            <text x="13" y="-10" textAnchor="middle" fill="#c44c3a" fontSize="8">
              puf
            </text>
          )}
        </g>
        <text x="188" y="24" textAnchor="middle" fill="#6d7680" fontSize="8">
          poistka
        </text>

        {/* burner */}
        <rect x="148" y="176" width="80" height="22" rx="4" fill="#3a3228" stroke="#b5683a" />
        {sim.flame > 0.04 && (
          <g className="flame-anim">
            <ellipse
              cx="188"
              cy={186}
              rx={10 + sim.flame * 10}
              ry={flameH * 0.45}
              fill={flameOuter}
              opacity="0.85"
            />
            <ellipse
              cx="188"
              cy={188}
              rx={5 + sim.flame * 5}
              ry={flameH * 0.32}
              fill={flameFill}
              opacity="0.95"
            />
          </g>
        )}

        {/* air fan */}
        <g transform="translate(92,168)">
          <circle cx="20" cy="20" r="16" fill="#1b212a" stroke="#8b97a6" />
          <g className={fanOn ? "fan-spin" : undefined} style={{ animationDuration: `${1.4 - controls.airFlow}s` }}>
            <path d="M20 20 L20 8 A12 12 0 0 1 30 20 Z" fill="#8b97a6" />
            <path d="M20 20 L32 20 A12 12 0 0 1 20 32 Z" fill="#6d7680" />
            <path d="M20 20 L20 32 A12 12 0 0 1 8 20 Z" fill="#8b97a6" />
            <path d="M20 20 L8 20 A12 12 0 0 1 20 8 Z" fill="#6d7680" />
            <circle cx="20" cy="20" r="3" fill="#ebe6db" />
          </g>
          <text x="20" y="46" textAnchor="middle" fill="#9aa3ad" fontSize="8">
            vzduch
          </text>
        </g>
        <path d="M128 186 H148" stroke="#5a6572" strokeWidth="8" />

        {/* chimney */}
        <g transform="translate(258,18)">
          <rect x="18" y="22" width="22" height="118" fill="#4a5360" stroke="#2a3340" />
          <rect
            x="14"
            y={22 + (1 - draftOpen) * 50}
            width="30"
            height="8"
            rx="1"
            fill="#c5ccd4"
          />
          <rect x="12" y="0" width="34" height="26" rx="2" fill="#3a414c" />
          {Array.from({ length: smokeN }).map((_, i) => (
            <ellipse
              key={i}
              className="smoke-puff"
              cx={20 + (i % 3) * 8}
              cy={-4 - i * 2}
              rx={7 + i * 2}
              ry={5 + i}
              fill="#9aa3ad"
              style={{ animationDelay: `${i * 0.35}s`, opacity: 0.4 }}
            />
          ))}
          <text x="29" y="154" textAnchor="middle" fill="#9aa3ad" fontSize="8">
            komín
          </text>
        </g>

        {/* pump */}
        {showCircuit && (
          <g transform="translate(96,138)">
            <circle cx="12" cy="12" r="12" fill="#2f9e8f" opacity={pumpOn ? 1 : 0.35} />
            <g className={pumpOn ? "pump-spin" : undefined}>
              <path d="M12 4 L14 12 L12 20 L10 12 Z" fill="#071412" />
              <path d="M4 12 L12 14 L20 12 L12 10 Z" fill="#071412" opacity="0.7" />
            </g>
            <text x="12" y="34" textAnchor="middle" fill="#9aa3ad" fontSize="8">
              čerpadlo
            </text>
          </g>
        )}

        <text x="188" y="214" textAnchor="middle" fill="#6d7680" fontSize="9">
          kotlové teleso
        </text>
      </svg>

      <StatusChip status={sim.status} relief={sim.reliefOpen} />
    </div>
  );
}

function StatusChip({ status, relief }: { status: StatusTone; relief: boolean }) {
  const label =
    relief ? "POISTKA OTVORENÁ" : status === "alarm" ? "ALARM" : status === "warn" ? "POZOR" : "V PORIADKU";
  const cls =
    status === "alarm" || relief
      ? "bg-alarm text-alarm-fg"
      : status === "warn"
        ? "bg-warn text-warn-fg"
        : "bg-ok text-ok-fg";
  return (
    <div
      className={cn(
        "absolute top-2 right-2 rounded-sm px-2 py-1 text-[10px] font-semibold tracking-wide",
        cls,
      )}
    >
      {label}
    </div>
  );
}
