import { useEffect, useRef, useState } from "react";
import { BookOpen, HelpCircle, Pause, X } from "lucide-react";
import { BoilerScene } from "./BoilerScene";
import { ControlPanel } from "./ControlPanel";
import { Gauges } from "./Gauges";
import { BriefOverlay, GlossaryScreen, ResultOverlay } from "./Screens";
import { Button } from "@/components/ui/button";
import {
  resumeAudioIfNeeded,
  sfxFail,
  sfxFill,
  sfxIgnite,
  sfxSuccess,
  startPump,
  stopPump,
} from "@/game/audio";
import { advise } from "@/game/hints";
import { LAST_MAIN } from "@/game/levels";
import { clamp, createSim, PHYSICS_DT, scoreLevel, step } from "@/game/sim";
import type { Controls, LevelDef, LevelScore, SimState } from "@/game/types";
import { cn } from "@/lib/utils";

type Phase = "brief" | "run" | "result" | "pause" | "glossary" | "help";

export function PlayScreen({
  level,
  onWin,
  onMenu,
  onNext,
}: {
  level: LevelDef;
  onWin: (score: LevelScore) => void;
  onMenu: () => void;
  onNext: () => void;
}) {
  const boot = createSim(level);
  const [phase, setPhase] = useState<Phase>("brief");
  const [sim, setSim] = useState<SimState>(boot.sim);
  const [controls, setControls] = useState<Controls>(boot.controls);
  const [score, setScore] = useState<LevelScore | null>(null);
  const [stuck, setStuck] = useState(false);
  const [nudge, setNudge] = useState(false);
  const simRef = useRef(boot.sim);
  const controlsRef = useRef(boot.controls);
  const phaseRef = useRef(phase);
  const reported = useRef(false);
  const lastPump = useRef(boot.controls.pumpOn);
  const stuckAcc = useRef(0);
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;
  phaseRef.current = phase;

  const reset = () => {
    const fresh = createSim(level);
    simRef.current = fresh.sim;
    controlsRef.current = fresh.controls;
    setSim(fresh.sim);
    setControls(fresh.controls);
    setScore(null);
    setStuck(false);
    setNudge(false);
    stuckAcc.current = 0;
    reported.current = false;
    stopPump();
  };

  useEffect(() => {
    reset();
    setPhase("brief");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id]);

  useEffect(() => {
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (phaseRef.current === "run") {
        acc += dt;
        let changed = false;
        while (acc >= PHYSICS_DT) {
          simRef.current = step(simRef.current, controlsRef.current, level, PHYSICS_DT);
          acc -= PHYSICS_DT;
          changed = true;
        }
        if (changed) {
          const s = simRef.current;
          setSim(s);
          if (s.missing.length > 0 && s.hold < 0.35 && !s.won && !s.failed) {
            stuckAcc.current += PHYSICS_DT;
          } else {
            stuckAcc.current = 0;
          }
          const nowStuck = stuckAcc.current > 16;
          const nowNudge = stuckAcc.current > 28;
          setStuck((prev) => (prev === nowStuck ? prev : nowStuck));
          setNudge((prev) => (prev === nowNudge ? prev : nowNudge));
          if (s.won && !reported.current) {
            reported.current = true;
            const sc = scoreLevel(s, level);
            setScore(sc);
            sfxSuccess();
            setPhase("result");
            onWinRef.current(sc);
          } else if (s.failed && !reported.current) {
            reported.current = true;
            sfxFail();
            setPhase("result");
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);

  const patchControls = (patch: Partial<Controls>) => {
    const next = { ...controlsRef.current, ...patch };
    controlsRef.current = next;
    setControls(next);
    if (patch.pumpOn !== undefined && patch.pumpOn !== lastPump.current) {
      lastPump.current = patch.pumpOn;
      if (patch.pumpOn) startPump();
      else stopPump();
    }
  };

  const holdProgress = Math.min(1, sim.hold / Math.max(0.01, level.win.holdSec));
  const advice = advise(sim, controls, level);
  const openHelp = () => setPhase("help");

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          className="flex size-11 items-center justify-center text-muted"
          onClick={() => setPhase("pause")}
          aria-label="Pauza"
        >
          <Pause className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">
            {level.id}. {level.title}
          </p>
          <p className="truncate text-xs text-muted">{level.subtitle}</p>
        </div>
        <button
          type="button"
          data-testid="btn-help"
          className={cn(
            "relative flex size-11 items-center justify-center rounded-md text-muted",
            (stuck || phase === "help") && "bg-accent/20 text-accent",
            stuck && "animate-pulse",
          )}
          onClick={openHelp}
          aria-label="Pomoc, čo ďalej"
        >
          <HelpCircle className="size-6" />
          {stuck && (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent" />
          )}
        </button>
        <button
          type="button"
          className="flex size-11 items-center justify-center text-muted"
          onClick={() => setPhase("glossary")}
          aria-label="Glosár"
        >
          <BookOpen className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <BoilerScene sim={sim} controls={controls} showCircuit={level.controls.includes("pump")} />
        <div className="mt-2">
          <Gauges sim={sim} active={level.gauges} />
        </div>
        {nudge && phase === "run" && (
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-accent/40 bg-accent/15 px-3 py-2 text-left text-sm text-fg"
            onClick={openHelp}
          >
            Zasekol si sa? Stlač otáznik — poradím ďalší krok.
          </button>
        )}
        {sim.coach && phase === "run" && !nudge && (
          <p
            className={cn(
              "mt-2 rounded-md border px-3 py-2 text-sm leading-snug",
              sim.status === "alarm"
                ? "border-alarm/40 bg-alarm/10 text-fg"
                : "border-line bg-raised text-muted",
            )}
          >
            {sim.coach}
          </p>
        )}
        {phase === "run" && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs uppercase tracking-wide text-faint">
              <span>Stabilizácia cieľa</span>
              <span className="tabular-nums">{Math.round(holdProgress * 100)} %</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-inset">
              <div
                className="h-full bg-accent transition-[width] duration-150"
                style={{ width: `${Math.round(holdProgress * 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-3">
          <ControlPanel
            unlocked={level.controls}
            controls={controls}
            onControls={patchControls}
            onFill={(on) => {
              if (on) {
                simRef.current = {
                  ...simRef.current,
                  fillValve: 1,
                  waterLevel: clamp(simRef.current.waterLevel + 0.09, 0, 1),
                };
                setSim(simRef.current);
                sfxFill();
              } else {
                simRef.current = { ...simRef.current, fillValve: 0 };
              }
            }}
            onDrain={(on) => {
              if (on) {
                simRef.current = {
                  ...simRef.current,
                  drainValve: 1,
                  waterLevel: clamp(simRef.current.waterLevel - 0.08, 0, 1),
                };
                setSim(simRef.current);
              } else {
                simRef.current = { ...simRef.current, drainValve: 0 };
              }
            }}
            onIgnite={() => {
              resumeAudioIfNeeded();
              sfxIgnite();
              simRef.current = { ...simRef.current, ignitePulse: 0.45 };
            }}
            onClean={() => {
              simRef.current = {
                ...simRef.current,
                dirtyExchanger: false,
                dirtyCleared: true,
              };
              setSim(simRef.current);
            }}
            onSensor={() => {
              simRef.current = { ...simRef.current, sensorChecked: true };
              setSim(simRef.current);
            }}
            dirty={sim.dirtyExchanger}
            dirtyCleared={sim.dirtyCleared}
            sensorChecked={sim.sensorChecked}
            falseAlarm={sim.falseAlarm}
          />
        </div>
        {phase === "run" && (
          <Button
            data-testid="btn-check"
            variant={stuck ? "primary" : "secondary"}
            className="mt-3 w-full"
            onClick={openHelp}
          >
            <HelpCircle className="size-5" />
            Potrebujem radu
          </Button>
        )}
      </div>

      {phase === "brief" && (
        <BriefOverlay
          level={level}
          onClose={onMenu}
          onStart={() => {
            resumeAudioIfNeeded();
            setPhase("run");
          }}
        />
      )}

      {phase === "result" && (
        <ResultOverlay
          ok={sim.won}
          level={level}
          score={score}
          failReason={sim.failReason}
          onNext={onNext}
          onRetry={() => {
            reset();
            setPhase("brief");
          }}
          onMenu={onMenu}
        />
      )}

      {phase === "pause" && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-bg/80 p-5">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display text-2xl text-fg">Pauza</h2>
            <p className="mt-1 text-sm text-muted">{level.lesson}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button size="lg" onClick={() => setPhase("run")}>
                Pokračovať
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  reset();
                  setPhase("brief");
                }}
              >
                Reštart levelu
              </Button>
              <Button variant="ghost" onClick={onMenu}>
                Do menu
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === "help" && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-bg/80 p-5">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl whitespace-nowrap text-fg">Čo ďalej</h2>
              <button
                type="button"
                className="flex size-11 shrink-0 items-center justify-center text-muted"
                onClick={() => setPhase("run")}
                aria-label="Zavrieť radu"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-3 text-base leading-snug text-fg">{advice.action}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{advice.why}</p>
            {advice.rest.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
                {advice.rest.slice(0, 3).map((r) => (
                  <li key={r} className="text-sm text-muted">
                    Potom: {r}
                  </li>
                ))}
              </ul>
            )}
            <Button size="lg" className="mt-4 w-full" onClick={() => setPhase("run")}>
              Idem to skúsiť
            </Button>
          </div>
        </div>
      )}

      {phase === "glossary" && (
        <div className="absolute inset-0 z-20 bg-surface">
          <GlossaryScreen onBack={() => setPhase("run")} />
        </div>
      )}

      {level.id === LAST_MAIN && <span className="hidden" data-last-main="" />}
    </div>
  );
}
