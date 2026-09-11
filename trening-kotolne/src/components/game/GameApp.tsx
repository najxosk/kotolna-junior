import { useCallback, useEffect, useState } from "react";
import { PlayScreen } from "./PlayScreen";
import {
  CertificateScreen,
  ConfirmReset,
  GlossaryScreen,
  HowToScreen,
  LevelSelectScreen,
  MenuScreen,
  NameScreen,
} from "./Screens";
import { getLevel, LAST_MAIN } from "@/game/levels";
import { defaultSave, loadSave, recordWin, resetProgress, writeSave } from "@/game/save";
import { setSoundOn, unlockAudio, resumeAudioIfNeeded } from "@/game/audio";
import type { LevelScore, SaveData } from "@/game/types";

type Screen = "menu" | "howto" | "glossary" | "levels" | "name" | "play" | "certificate";

export function GameApp() {
  const [save, setSave] = useState<SaveData>(defaultSave);
  const [screen, setScreen] = useState<Screen>("menu");
  const [levelId, setLevelId] = useState(1);
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    setSave(loadSave());
  }, []);

  const persist = useCallback((next: SaveData) => {
    setSave(next);
    writeSave(next);
  }, []);

  useEffect(() => {
    setSoundOn(save.soundOn);
  }, [save.soundOn]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") writeSave(save);
      else resumeAudioIfNeeded();
    };
    document.addEventListener("visibilitychange", onHide);
    const onPageHide = () => writeSave(save);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [save]);

  const startLevel = (id: number) => {
    unlockAudio();
    setLevelId(id);
    setScreen("play");
  };

  const beginNew = () => {
    const next = resetProgress(save);
    persist(next);
    setConfirmNew(false);
    setScreen("name");
  };

  const onWin = useCallback(
    (score: LevelScore) => {
      setSave((prev) => {
        const next = recordWin(prev, levelId, score);
        writeSave(next);
        return next;
      });
    },
    [levelId],
  );

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="phone-shell mx-auto flex h-dvh w-full max-w-md flex-col bg-surface sm:my-3 sm:h-[min(100dvh-24px,920px)] sm:rounded-2xl sm:border sm:border-border">
        <div className="relative min-h-0 flex-1">
          {screen === "menu" && (
            <MenuScreen
              save={save}
              onNew={() => {
                unlockAudio();
                const has = save.unlockedLevel > 1 || Object.keys(save.completed).length > 0;
                if (has) setConfirmNew(true);
                else setScreen("name");
              }}
              onContinue={() => {
                unlockAudio();
                setScreen("levels");
              }}
              onHow={() => setScreen("howto")}
              onGlossary={() => setScreen("glossary")}
              onLevels={() => setScreen("levels")}
              onSound={() => persist({ ...save, soundOn: !save.soundOn })}
            />
          )}
          {screen === "howto" && <HowToScreen onBack={() => setScreen("menu")} />}
          {screen === "glossary" && <GlossaryScreen onBack={() => setScreen("menu")} />}
          {screen === "levels" && (
            <LevelSelectScreen
              save={save}
              onBack={() => setScreen("menu")}
              onPick={startLevel}
            />
          )}
          {screen === "name" && (
            <NameScreen
              initial={save.playerName}
              onBack={() => setScreen("menu")}
              onSubmit={(playerName) => {
                persist({ ...save, playerName, unlockedLevel: Math.max(1, save.unlockedLevel) });
                startLevel(1);
              }}
            />
          )}
          {screen === "play" && (
            <PlayScreen
              level={getLevel(levelId)}
              onWin={onWin}
              onMenu={() => setScreen("menu")}
              onNext={() => {
                if (levelId === LAST_MAIN || levelId >= 13) setScreen("certificate");
                else startLevel(levelId + 1);
              }}
            />
          )}
          {screen === "certificate" && (
            <CertificateScreen
              save={save}
              onBack={() => setScreen("menu")}
              onRename={(playerName) => persist({ ...save, playerName })}
            />
          )}
          {confirmNew && <ConfirmReset onNo={() => setConfirmNew(false)} onYes={beginNew} />}
        </div>
      </div>
    </div>
  );
}
