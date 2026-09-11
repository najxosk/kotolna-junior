import type { ReactNode } from "react";
import type { ControlKey, Controls } from "@/game/types";
import { Button } from "@/components/ui/button";
import { draftBand, mixBand } from "@/game/sim";
import { cn } from "@/lib/utils";
import { Droplets, Flame, Wind, RotateCcw, Sparkles, Thermometer, Search } from "lucide-react";

interface Props {
  unlocked: ControlKey[];
  controls: Controls;
  onControls: (patch: Partial<Controls>) => void;
  onFill: (on: boolean) => void;
  onDrain: (on: boolean) => void;
  onIgnite: () => void;
  onClean: () => void;
  onSensor: () => void;
  dirty: boolean;
  dirtyCleared: boolean;
  sensorChecked: boolean;
  falseAlarm: boolean;
}

export function ControlPanel({
  unlocked,
  controls,
  onControls,
  onFill,
  onDrain,
  onIgnite,
  onClean,
  onSensor,
  dirty,
  dirtyCleared,
  sensorChecked,
  falseAlarm,
}: Props) {
  const has = (k: ControlKey) => unlocked.includes(k);
  const mix = mixBand(controls.gasOpen, controls.airFlow);
  const draft = draftBand(controls.chimneyDraft);

  return (
    <div className="flex flex-col gap-2">
      {has("water") && (
        <div className="grid grid-cols-2 gap-2">
          <HoldButton
            testId="btn-fill"
            icon={<Droplets className="size-5" />}
            label="Dopustiť vodu"
            onHold={onFill}
            tone="water"
          />
          <HoldButton
            testId="btn-drain"
            icon={<RotateCcw className="size-5" />}
            label="Vypustiť"
            onHold={onDrain}
          />
        </div>
      )}

      {has("gas") && (
        <SliderRow
          testId="slider-gas"
          icon={<Flame className="size-4" />}
          label="Plyn"
          value={controls.gasOpen}
          display={`${Math.round(controls.gasOpen * 100)} %`}
          onChange={(v) => onControls({ gasOpen: v })}
        />
      )}

      {has("air") && (
        <SliderRow
          testId="slider-air"
          icon={<Wind className="size-4" />}
          label="Vzduch"
          value={controls.airFlow}
          display={`${Math.round(controls.airFlow * 100)} %`}
          hint={
            mix === "rich"
              ? "málo kyslíka"
              : mix === "lean"
                ? "veľa vzduchu"
                : "dobrý pomer"
          }
          hintTone={mix === "good" ? "ok" : "warn"}
          onChange={(v) => onControls({ airFlow: v })}
        />
      )}

      {has("draft") && (
        <SliderRow
          testId="slider-draft"
          icon={<Wind className="size-4" />}
          label="Ťah komína"
          value={controls.chimneyDraft}
          display={`${Math.round(controls.chimneyDraft * 100)} %`}
          hint={
            draft === "weak" ? "slabý ťah" : draft === "strong" ? "silný ťah" : "dobrý ťah"
          }
          hintTone={draft === "good" ? "ok" : "warn"}
          onChange={(v) => onControls({ chimneyDraft: v })}
        />
      )}

      {has("thermostat") && (
        <SliderRow
          testId="slider-thermo"
          icon={<Thermometer className="size-4" />}
          label="Termostat"
          value={(controls.thermostat - 28) / 60}
          display={`${Math.round(controls.thermostat)} °C`}
          onChange={(v) => onControls({ thermostat: 28 + v * 60 })}
        />
      )}

      <div className={cn("grid gap-2", has("ignite") && has("pump") ? "grid-cols-2" : "grid-cols-1")}>
        {has("ignite") && (
          <Button
            type="button"
            data-testid="btn-ignite"
            variant="paper"
            size="lg"
            className="w-full"
            onClick={onIgnite}
          >
            <Sparkles className="size-5" />
            Zapáliť
          </Button>
        )}
        {has("pump") && (
          <Button
            type="button"
            data-testid="btn-pump"
            variant={controls.pumpOn ? "ok" : "secondary"}
            size="lg"
            className="w-full"
            onClick={() => onControls({ pumpOn: !controls.pumpOn })}
          >
            Čerpadlo {controls.pumpOn ? "zap" : "vyp"}
          </Button>
        )}
      </div>

      {has("clean") && dirty && !dirtyCleared && (
        <Button type="button" data-testid="btn-clean" variant="secondary" size="lg" onClick={onClean}>
          Vyčistiť výmenník
        </Button>
      )}

      {has("sensor") && falseAlarm && !sensorChecked && (
        <Button type="button" data-testid="btn-sensor" variant="secondary" size="lg" onClick={onSensor}>
          <Search className="size-5" />
          Overiť snímač hladiny
        </Button>
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  display,
  onChange,
  icon,
  testId,
  hint,
  hintTone,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
  icon: ReactNode;
  testId: string;
  hint?: string;
  hintTone?: "ok" | "warn";
}) {
  return (
    <label className="block rounded-md border border-line bg-raised px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-fg">
          {icon}
          {label}
        </span>
        <span className="flex items-center gap-2">
          {hint && (
            <span
              className={cn(
                "text-xs font-medium",
                hintTone === "ok" ? "text-ok" : "text-warn",
              )}
            >
              {hint}
            </span>
          )}
          <span className="tabular-nums text-muted">{display}</span>
        </span>
      </div>
      <input
        data-testid={testId}
        className="ctrl-range"
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
    </label>
  );
}

function HoldButton({
  label,
  icon,
  onHold,
  testId,
  tone,
}: {
  label: string;
  icon: ReactNode;
  onHold: (on: boolean) => void;
  testId: string;
  tone?: "water";
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(
        "flex h-14 touch-none items-center justify-center gap-2 rounded-md border border-border bg-raised px-3 text-base font-medium text-fg select-none active:scale-[0.98]",
        tone === "water" && "border-water/40 bg-water/15 text-fg",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
    >
      {icon}
      {label}
    </button>
  );
}
