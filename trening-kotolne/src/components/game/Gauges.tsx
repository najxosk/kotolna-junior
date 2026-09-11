import type { GaugeKey, SimState } from "@/game/types";
import { displayedWater } from "@/game/sim";
import { cn } from "@/lib/utils";

interface Props {
  sim: SimState;
  active: GaugeKey[];
}

type Tone = "ok" | "warn" | "alarm";

function toneOf(key: GaugeKey, raw: number): Tone {
  switch (key) {
    case "temp":
      if (raw > 100) return "alarm";
      if (raw >= 45 && raw <= 88) return "ok";
      return "warn";
    case "circuit":
      if (raw > 88) return "alarm";
      if (raw >= 40 && raw <= 80) return "ok";
      return "warn";
    case "pressure":
      if (raw >= 2.7) return "alarm";
      if (raw >= 1.0 && raw <= 2.35) return "ok";
      return "warn";
    case "water":
      if (raw < 0.22 || raw > 0.9) return "alarm";
      if (raw >= 0.45 && raw <= 0.75) return "ok";
      return "warn";
    case "smoke":
      if (raw >= 0.5) return "alarm";
      if (raw < 0.25) return "ok";
      return "warn";
    case "efficiency":
      if (raw >= 0.55) return "ok";
      if (raw >= 0.3) return "warn";
      return "warn";
  }
}

function bar(key: GaugeKey, s: SimState): number {
  switch (key) {
    case "temp":
      return (s.temperature - 16) / 94;
    case "circuit":
      return (s.circuitTemp - 12) / 78;
    case "pressure":
      return (s.pressure - 0.8) / 2.3;
    case "water":
      return displayedWater(s);
    case "smoke":
      return s.smoke;
    case "efficiency":
      return s.efficiency;
  }
}

function labelOf(key: GaugeKey): string {
  switch (key) {
    case "temp":
      return "Teplota";
    case "circuit":
      return "Okruh";
    case "pressure":
      return "Tlak";
    case "water":
      return "Hladina";
    case "smoke":
      return "Dym";
    case "efficiency":
      return "Účinnosť";
  }
}

function unitOf(key: GaugeKey, s: SimState): string {
  switch (key) {
    case "temp":
      return `${Math.round(s.temperature)} °C`;
    case "circuit":
      return `${Math.round(s.circuitTemp)} °C`;
    case "pressure":
      return `${s.pressure.toFixed(1)} bar`;
    case "water":
      return `${Math.round(displayedWater(s) * 100)} %`;
    case "smoke":
      return s.smoke < 0.2 ? "čistý" : s.smoke < 0.45 ? "slabý" : "silný";
    case "efficiency":
      return `${Math.round(s.efficiency * 100)} %`;
  }
}

function rawOf(key: GaugeKey, s: SimState): number {
  switch (key) {
    case "temp":
      return s.temperature;
    case "circuit":
      return s.circuitTemp;
    case "pressure":
      return s.pressure;
    case "water":
      return displayedWater(s);
    case "smoke":
      return s.smoke;
    case "efficiency":
      return s.efficiency;
  }
}

export function Gauges({ sim, active }: Props) {
  const keys: GaugeKey[] = ["water", "temp", "circuit", "pressure", "smoke", "efficiency"];
  const shown = keys.filter((k) => active.includes(k));

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {shown.map((key) => {
        const raw = rawOf(key, sim);
        const tone = toneOf(key, raw);
        const pct = Math.round(Math.max(0, Math.min(1, bar(key, sim))) * 100);
        return (
          <div
            key={key}
            data-testid={`gauge-${key}`}
            className="rounded-md border border-line bg-raised px-2.5 py-1.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-faint">
                {labelOf(key)}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums text-sm",
                  tone === "ok" && "text-ok",
                  tone === "warn" && "text-warn",
                  tone === "alarm" && "text-alarm",
                )}
              >
                {unitOf(key, sim)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-inset">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-150",
                  tone === "ok" && "bg-ok",
                  tone === "warn" && "bg-warn",
                  tone === "alarm" && "bg-alarm",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
