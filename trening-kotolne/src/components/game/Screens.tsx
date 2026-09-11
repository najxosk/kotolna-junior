import { useState, type ReactNode } from "react";
import {
  Award,
  BookOpen,
  ChevronRight,
  HelpCircle,
  Lock,
  Play,
  RotateCcw,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GLOSSARY } from "@/game/glossary";
import { LAST_MAIN, LEVELS } from "@/game/levels";
import type { LevelDef, LevelScore, SaveData } from "@/game/types";
import { cn } from "@/lib/utils";

export function MenuScreen({
  save,
  onNew,
  onContinue,
  onHow,
  onGlossary,
  onLevels,
  onSound,
}: {
  save: SaveData;
  onNew: () => void;
  onContinue: () => void;
  onHow: () => void;
  onGlossary: () => void;
  onLevels: () => void;
  onSound: () => void;
}) {
  const hasProgress = save.unlockedLevel > 1 || Object.keys(save.completed).length > 0;
  return (
    <div className="flex h-full flex-col px-5 pb-6 pt-8">
      <button
        type="button"
        className="self-end text-muted"
        onClick={onSound}
        aria-label={save.soundOn ? "Vypnúť zvuk" : "Zapnúť zvuk"}
      >
        {save.soundOn ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
      </button>
      <div className="mt-4 flex-1">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Tréning kotolne</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-fg">Kotolňa Junior</h1>
        <p className="mt-3 max-w-[22ch] text-base leading-snug text-muted">
          Voda, oheň, vzduch a rozum. Nauč sa kotol — hravo a bezpečne.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Button data-testid="btn-new-game" size="lg" className="w-full" onClick={onNew}>
          <Play className="size-5" />
          Nová hra
        </Button>
        <Button
          data-testid="btn-continue"
          size="lg"
          variant="secondary"
          className="w-full"
          disabled={!hasProgress}
          onClick={onContinue}
        >
          Pokračovať
        </Button>
        <Button size="lg" variant="ghost" className="w-full" onClick={onLevels}>
          Levely
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onGlossary}>
            <BookOpen className="size-4" />
            Glosár
          </Button>
          <Button variant="secondary" onClick={onHow}>
            <HelpCircle className="size-4" />
            Ako hrať
          </Button>
        </div>
      </div>
    </div>
  );
}

export function HowToScreen({ onBack }: { onBack: () => void }) {
  const steps = [
    {
      t: "Krátky brief",
      d: "Každý level povie, čo je zle a prečo to fyzika tak chce. Potom ideš do kotolne.",
    },
    {
      t: "Veľké ovládanie",
      d: "Posuvníky a tlačidlá sú na palec. Drž „Dopustiť vodu“, kým hladina nie je v zelenej.",
    },
    {
      t: "Sleduj meráky",
      d: "Zelená je v poriadku, oranžová pozor, červená alarm. Plameň a dym ukážu, či zmes sedí.",
    },
    {
      t: "Zasekol si sa?",
      d: "Stlač otáznik hore alebo „Potrebujem radu“. Hra ti povie jeden ďalší krok — nie celé riešenie.",
    },
    {
      t: "Stabilizuj",
      d: "Keď cieľ držíš pár sekúnd, level sa splní. Potom si prečítaj, prečo to tak je.",
    },
  ];
  return (
    <Sheet title="Ako hrať" onBack={onBack}>
      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-raised text-sm font-semibold text-accent">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-fg">{s.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

export function GlossaryScreen({ onBack }: { onBack: () => void }) {
  return (
    <Sheet title="Glosár" onBack={onBack}>
      <div className="flex flex-col gap-3">
        {GLOSSARY.map((g) => (
          <article key={g.id} className="rounded-md border border-line bg-raised p-3">
            <h3 className="font-display text-lg text-fg">{g.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{g.body}</p>
          </article>
        ))}
      </div>
    </Sheet>
  );
}

export function LevelSelectScreen({
  save,
  onBack,
  onPick,
}: {
  save: SaveData;
  onBack: () => void;
  onPick: (id: number) => void;
}) {
  return (
    <Sheet title="Levely" onBack={onBack}>
      <div className="flex flex-col gap-2">
        {LEVELS.map((lv) => {
          const locked = lv.id > save.unlockedLevel;
          const score = save.completed[String(lv.id)];
          return (
            <button
              key={lv.id}
              type="button"
              disabled={locked}
              data-testid={`level-${lv.id}`}
              onClick={() => onPick(lv.id)}
              className={cn(
                "flex items-center gap-3 rounded-md border border-line bg-raised px-3 py-3 text-left",
                locked && "opacity-45",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-inset font-display text-lg text-accent">
                {locked ? <Lock className="size-4 text-faint" /> : lv.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-fg">
                  {lv.bonus ? "Bonus · " : ""}
                  {lv.title}
                </span>
                <span className="block truncate text-sm text-muted">{lv.subtitle}</span>
              </span>
              {score && <Stars n={score.stars} />}
              {!locked && <ChevronRight className="size-4 text-faint" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function NameScreen({
  initial,
  onSubmit,
  onBack,
}: {
  initial: string;
  onSubmit: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <Sheet title="Ako ťa volajú?" onBack={onBack}>
      <p className="text-sm text-muted">Meno pôjde na certifikát Kotolník junior. Môžeš ho neskôr zmeniť.</p>
      <input
        data-testid="input-name"
        className="mt-4 h-14 w-full rounded-md border border-border bg-inset px-4 text-lg text-fg placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        placeholder="Tvoje meno"
        maxLength={32}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="given-name"
      />
      <Button
        data-testid="btn-save-name"
        size="lg"
        className="mt-4 w-full"
        onClick={() => onSubmit(name.trim() || "Kotolník")}
      >
        Poďme do kotolne
      </Button>
    </Sheet>
  );
}

export function BriefOverlay({
  level,
  onStart,
  onClose,
}: {
  level: LevelDef;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-bg/95">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <button type="button" className="ml-auto block p-2 text-muted" onClick={onClose} aria-label="Zavrieť">
          <X className="size-5" />
        </button>
        <p className="text-sm font-medium text-accent">
          Level {level.id}
          {level.bonus ? " · bonus" : ""}
        </p>
        <h2 className="mt-1 font-display text-3xl text-fg">{level.title}</h2>
        <p className="mt-3 text-base leading-relaxed text-fg">{level.brief}</p>
        <div className="mt-4 space-y-3 rounded-lg border border-line bg-raised p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Prečo to tak je</p>
          <p className="text-sm leading-relaxed text-muted">{level.physics}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Keď to spravíš zle</p>
          <p className="text-sm leading-relaxed text-muted">{level.wrong}</p>
        </div>
        <p className="mt-4 font-display text-lg leading-snug text-fg">{level.lesson}</p>
        <p className="mt-3 text-sm text-muted">Zasekol si sa? V kotolni stlač otáznik — poradí ďalší krok.</p>
      </div>
      <div className="shrink-0 border-t border-line p-4">
        <Button data-testid="btn-start-level" size="lg" className="w-full" onClick={onStart}>
          Idem na to
        </Button>
      </div>
    </div>
  );
}

export function ResultOverlay({
  ok,
  level,
  score,
  failReason,
  onNext,
  onRetry,
  onMenu,
}: {
  ok: boolean;
  level: LevelDef;
  score: LevelScore | null;
  failReason: string | null;
  onNext: () => void;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-bg/95">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <p className={cn("text-sm font-semibold uppercase tracking-wide", ok ? "text-ok" : "text-alarm")}>
          {ok ? "Splnené" : "Zastavené"}
        </p>
        <h2 className="mt-1 font-display text-3xl text-fg">{ok ? "Pekná práca" : "Poďme to ešte raz"}</h2>
        <p className="mt-3 text-base leading-relaxed text-fg">
          {ok ? level.why : failReason ?? "Cieľ sa nepodarilo udržať."}
        </p>
        {ok && score && level.scoring && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat k="Účinnosť" v={`${score.efficiency}`} />
            <Stat k="Bezpečnosť" v={`${score.safety}`} />
            <Stat k="Úspora" v={`${score.fuel}`} />
          </div>
        )}
        {ok && score && (
          <div className="mt-3 flex items-center gap-2">
            <Stars n={score.stars} />
            <span className="text-sm text-muted">celkom {score.total}</span>
          </div>
        )}
        <p className="mt-4 rounded-md border border-line bg-raised p-3 font-display text-base leading-snug text-fg">
          {level.lesson}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-line p-4">
        {ok ? (
          <Button data-testid="btn-next" size="lg" className="w-full" onClick={onNext}>
            {level.id === LAST_MAIN ? "Certifikát" : "Ďalší level"}
            <ChevronRight className="size-5" />
          </Button>
        ) : (
          <Button data-testid="btn-retry" size="lg" className="w-full" onClick={onRetry}>
            <RotateCcw className="size-5" />
            Skúsiť znova
          </Button>
        )}
        <Button variant="ghost" onClick={onMenu}>
          Do menu
        </Button>
      </div>
    </div>
  );
}

export function ConfirmReset({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-bg/80 p-5">
      <div className="w-full rounded-xl border border-border bg-surface p-5">
        <h2 className="font-display text-2xl text-fg">Začať odznova?</h2>
        <p className="mt-2 text-sm text-muted">Postup v leveloch sa vynuluje. Meno a zvuk ostanú.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onNo}>
            Nie
          </Button>
          <Button className="flex-1" onClick={onYes}>
            Nová hra
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CertificateScreen({
  save,
  onBack,
  onRename,
}: {
  save: SaveData;
  onBack: () => void;
  onRename: (name: string) => void;
}) {
  const scores = Object.values(save.completed);
  const avg =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((a, s) => a + s.total, 0) / scores.length);
  const date = new Date().toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(save.playerName);

  return (
    <div className="flex h-full flex-col bg-bg p-4">
      <button type="button" className="self-start p-2 text-muted" onClick={onBack} aria-label="Späť">
        <X className="size-5" />
      </button>
      <div className="relative mx-auto mt-2 w-full max-w-sm flex-1 rounded-xl bg-paper p-6 text-ink shadow-panel">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-copper">
          Osvedčenie o spôsobilosti
        </p>
        <h2 className="mt-3 text-center font-display text-3xl leading-tight">Kotolník junior</h2>
        <p className="mt-4 text-center text-sm text-ink/70">Týmto sa potvrdzuje, že</p>
        {editing ? (
          <form
            className="mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              onRename(name.trim() || "Kotolník");
              setEditing(false);
            }}
          >
            <input
              className="h-12 w-full rounded-sm border border-ink/20 bg-paper px-3 text-center font-display text-2xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
            <Button type="submit" size="sm" className="mx-auto mt-2">
              Uložiť
            </Button>
          </form>
        ) : (
          <button
            type="button"
            className="mt-2 block w-full text-center font-display text-3xl text-ink underline decoration-ink/20 underline-offset-4"
            onClick={() => setEditing(true)}
          >
            {save.playerName || "Kotolník"}
          </button>
        )}
        <p className="mt-4 text-center text-sm leading-relaxed text-ink/75">
          ovláda základy kotlového zariadenia: vodu, horák, vzduch, ťah, obeh, tlak a účinnosť.
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-ink/15 pt-4 text-sm">
          <span>{date}</span>
          <span className="tabular-nums">skóre {avg}</span>
        </div>
        <div className="stamp-in pointer-events-none absolute right-5 bottom-16 flex size-24 items-center justify-center rounded-full border-4 border-accent/80 text-center font-display text-xs leading-tight text-accent">
          <span>
            KOTOLŇA
            <br />
            JUNIOR
            <br />
            {avg}
          </span>
        </div>
        <Award className="mx-auto mt-6 size-8 text-copper" />
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} z 3`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          className={cn("size-3.5", i <= n ? "fill-accent text-accent" : "text-faint")}
        />
      ))}
    </span>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-line bg-raised px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-faint">{k}</p>
      <p className="mt-0.5 font-display text-xl tabular-nums text-fg">{v}</p>
    </div>
  );
}

function Sheet({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-3 py-3">
        <button type="button" className="flex size-11 items-center justify-center text-muted" onClick={onBack}>
          <X className="size-5" />
        </button>
        <h2 className="font-display text-2xl text-fg">{title}</h2>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pb-8">{children}</div>
    </div>
  );
}
