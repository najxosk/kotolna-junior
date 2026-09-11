import type { ControlKey, Controls, LevelDef, SimState } from "./types";
import { draftBand, mixBand } from "./sim";

export type Advice = {
  action: string;
  why: string;
  rest: string[];
};

/**
 * Jedna konkrétna rada, čo urobiť hneď — podľa merákov a cieľa levelu.
 */
export function advise(sim: SimState, c: Controls, level: LevelDef): Advice {
  const has = (k: ControlKey) => level.controls.includes(k);
  const w = level.win;
  const mix = mixBand(c.gasOpen, c.airFlow);
  const draft = draftBand(c.chimneyDraft);

  if (sim.missing.length === 0 && sim.hold > 0) {
    return {
      action: "Nič nehýb. Pruh „Stabilizácia cieľa“ sa plní — len chvíľu počkaj.",
      why: "Kotol už drží, čo má. Keď sa pruh zaplní, level je splnený.",
      rest: [],
    };
  }

  // 1. Bezpečnosť a poruchy
  if (sim.falseAlarm && !sim.sensorChecked && has("sensor")) {
    return {
      action: "Pozri na vodoznak (sklenená trubica) a stlač „Overiť snímač hladiny“.",
      why: "Merák môže klamať. Keď vodoznak vodu ukazuje, nediaľuj naslepo.",
      rest: collectRest(sim, c, level, "sensor"),
    };
  }

  if (sim.waterLevel < 0.22) {
    return {
      action: "Drž „Dopustiť vodu“, kým merák vody nie je v zelenej zóne.",
      why: "Bez vody sa kotol prehreje. Najprv voda, až potom oheň.",
      rest: collectRest(sim, c, level, "water"),
    };
  }

  if (sim.waterLevel > 0.9 && has("water")) {
    return {
      action: "Drž „Vypustiť“, kým hladina klesne do zelenej zóny.",
      why: "Priveľa vody nechá málo miesta na paru.",
      rest: collectRest(sim, c, level, "water"),
    };
  }

  if (sim.reliefOpen || sim.pressure > 2.55) {
    if (has("pump") && !c.pumpOn) {
      return {
        action: "Hneď zapni Čerpadlo a uber Plyn.",
        why: "Tlak rastie, lebo teplo nemá kam ísť. Obeh ho odnesie do radiátorov.",
        rest: collectRest(sim, c, level, "pressure"),
      };
    }
    return {
      action: "Uber Plyn — oheň je mocný a tlak ide hore.",
      why: "Poistka je záchrana, nie cieľ. Najprv zníž záťaž.",
      rest: collectRest(sim, c, level, "pressure"),
    };
  }

  if (sim.roomSmoke > 0.2 && has("draft") && draft === "weak") {
    return {
      action: "Posuň „Ťah komína“ na stred (okolo 50 %), kým nápis nebude „dobrý ťah“.",
      why: "Slabý ťah tlačí dym do kotolne. Spaliny musia ísť komínom.",
      rest: collectRest(sim, c, level, "draft"),
    };
  }

  if (sim.dirtyExchanger && has("clean") && (w.dirtyCleared || sim.smoke > 0.35)) {
    return {
      action: "Stlač „Vyčistiť výmenník“. Samotné posuvníky špinu nespravia.",
      why: "Keď zmes aj ťah sedia a dym ostáva, sadze berú cestu spalinám.",
      rest: collectRest(sim, c, level, "clean"),
    };
  }

  if (w.water && (sim.waterLevel < w.water[0] || sim.waterLevel > w.water[1]) && has("water")) {
    if (sim.waterLevel < w.water[0]) {
      return {
        action: "Dopusti vodu, kým je merák v zelenej (stred skla).",
        why: "Hladina ešte nie je tam, kde má kotol pracovať.",
        rest: collectRest(sim, c, level, "water"),
      };
    }
    return {
      action: "Trochu vypusti — hladina je nad zelenou zónou.",
      why: "Cieľ je pásmo, nie plný kotol.",
      rest: collectRest(sim, c, level, "water"),
    };
  }

  // 2. Reťaz ohňa
  if ((w.flameMin !== undefined || has("ignite")) && sim.flame < (w.flameMin ?? 0.12)) {
    if (sim.thermoOff && has("thermostat")) {
      return {
        action: "Zdvihni Termostat. Horák zhasol, lebo teplota dosiahla nastavenie.",
        why: "Termostat je vypínač podľa tepla. Nízko nastavený oheň pustí len chvíľu.",
        rest: collectRest(sim, c, level, "thermo"),
      };
    }
    if (c.gasOpen < 0.12 && has("gas")) {
      return {
        action: "Otvor Plyn aspoň na polovicu, potom stlač Zapáliť.",
        why: "Bez paliva nie je čo zapáliť.",
        rest: collectRest(sim, c, level, "gas"),
      };
    }
    if (!sim.ignited && has("ignite")) {
      return {
        action: "Stlač „Zapáliť“. Plyn už ide — treba iskru.",
        why: "Plyn sám od seba nehorí. Zážih je iskra pri horáku.",
        rest: collectRest(sim, c, level, "ignite"),
      };
    }
    if (mix === "rich" && has("air")) {
      return {
        action: "Pridaj Vzduch, kým nápis nebude „dobrý pomer“. Teraz ho málo.",
        why: "Málo kyslíka = slabý žltý plameň a dym.",
        rest: collectRest(sim, c, level, "air"),
      };
    }
    if (mix === "lean" && has("air")) {
      return {
        action: "Uber Vzduch, kým nápis nebude „dobrý pomer“. Teraz ho veľa.",
        why: "Prebytok vzduchu plameň chladí a oslabuje.",
        rest: collectRest(sim, c, level, "air"),
      };
    }
    if (c.gasOpen < 0.35 && has("gas")) {
      return {
        action: "Pridaj Plyn — horák horí, ale slabo.",
        why: "Na stály plameň treba dosť paliva.",
        rest: collectRest(sim, c, level, "gas"),
      };
    }
  }

  // 3. Vzduch / ťah / účinnosť
  if (has("air") && mix === "rich" && (sim.smoke > 0.28 || (w.smokeMax !== undefined && sim.smoke > w.smokeMax))) {
    return {
      action: "Posuň Vzduch nahor, kým nebude „dobrý pomer“ a dym neklesne.",
      why: "Oheň sa dusí. Spaľovanie potrebuje kyslík.",
      rest: collectRest(sim, c, level, "air"),
    };
  }

  if (has("air") && mix === "lean" && w.efficiencyMin !== undefined && sim.efficiency < w.efficiencyMin) {
    return {
      action: "Uber Vzduch k stredu. Nápis má byť „dobrý pomer“, nie „veľa vzduchu“.",
      why: "Veľa vzduchu kradne teplo do komína — účinnosť padá.",
      rest: collectRest(sim, c, level, "air"),
    };
  }

  if (has("draft") && draft === "strong" && w.efficiencyMin !== undefined && sim.efficiency < w.efficiencyMin) {
    return {
      action: "Privri Ťah komína na stred (okolo 50 %). Teraz je mocný.",
      why: "Priveľký ťah vyťahuje teplo skôr, než zohreje vodu.",
      rest: collectRest(sim, c, level, "draft"),
    };
  }

  if (has("draft") && draft === "weak" && (w.roomSmokeMax !== undefined || w.smokeMax !== undefined)) {
    return {
      action: "Priotvor Ťah komína na stred. Nápis má byť „dobrý ťah“.",
      why: "Bez ťahu spaliny nemajú kam ísť.",
      rest: collectRest(sim, c, level, "draft"),
    };
  }

  // 4. Obeh a teplota
  if (w.pumpOn && !c.pumpOn && has("pump")) {
    return {
      action: "Zapni Čerpadlo. Horí, ale teplo ostáva v kotle.",
      why: "Čerpadlo nosí horúcu vodu do radiátorov.",
      rest: collectRest(sim, c, level, "pump"),
    };
  }

  if (w.circuitTemp && sim.circuitTemp < w.circuitTemp[0]) {
    if (has("pump") && !c.pumpOn) {
      return {
        action: "Zapni Čerpadlo, nech sa okruh začne hriať.",
        why: "Bez obehu sú radiátory ľadové, aj keď kotol horí.",
        rest: collectRest(sim, c, level, "pump"),
      };
    }
    if (sim.thermoOff && has("thermostat")) {
      return {
        action: "Zdvihni Termostat, aby horák znova nabehol.",
        why: "Okruh je ešte studený a termostat už oheň vypol.",
        rest: collectRest(sim, c, level, "thermo"),
      };
    }
    if (c.gasOpen < 0.4 && has("gas")) {
      return {
        action: "Pridaj trochu Plynu a nechaj čerpadlo bežať.",
        why: "Okruh sa ohrieva pomaly. Väčší oheň to urýchli.",
        rest: collectRest(sim, c, level, "circuit"),
      };
    }
    return {
      action: "Počkaj s čerpadlom zapnutým. Okruh sa ešte zohrieva.",
      why: "Teplo ide do radiátorov. Merák okruhu musí vystúpiť do cieľa.",
      rest: collectRest(sim, c, level, "circuit"),
    };
  }

  if (w.circuitTemp && sim.circuitTemp > w.circuitTemp[1]) {
    return {
      action: "Uber Plyn alebo zníž Termostat — okruh je príliš horúci.",
      why: "Cieľ je pásmo, nie maximum. Veľký oheň preženie teplotu.",
      rest: collectRest(sim, c, level, "circuit"),
    };
  }

  if (w.pressure && (sim.pressure < w.pressure[0] || sim.pressure > w.pressure[1])) {
    if (sim.pressure > w.pressure[1]) {
      return {
        action: has("pump") && !c.pumpOn
          ? "Zapni Čerpadlo — tlak je vysoko, teplo ostáva v kotle."
          : "Uber Plyn, kým tlak nespadne do bezpečného pásma.",
        why: "Vysoký tlak hlási, že teplo nemá dosť odvodu.",
        rest: collectRest(sim, c, level, "pressure"),
      };
    }
  }

  if (w.efficiencyMin !== undefined && sim.efficiency < w.efficiencyMin) {
    if (mix !== "good" && has("air")) {
      return {
        action: mix === "rich"
          ? "Pridaj Vzduch na „dobrý pomer“."
          : "Uber Vzduch na „dobrý pomer“.",
        why: "Účinnosť rastie pri čistom plameni, nie pri extrémoch.",
        rest: collectRest(sim, c, level, "air"),
      };
    }
    if (draft !== "good" && has("draft")) {
      return {
        action: "Daj Ťah komína na stred — nápis „dobrý ťah“.",
        why: "Krajný ťah buď dymí, alebo kradne teplo.",
        rest: collectRest(sim, c, level, "draft"),
      };
    }
  }

  if (w.smokeMax !== undefined && sim.smoke > w.smokeMax) {
    return {
      action: has("air")
        ? "Uprav Vzduch na „dobrý pomer“ a skontroluj ťah."
        : "Priotvor ťah, dym musí ísť komínom.",
      why: "Dym znamená, že palivo sa nespáli dočista.",
      rest: collectRest(sim, c, level, "smoke"),
    };
  }

  // Fallback: prvý chýbajúci cieľ z fyziky
  if (sim.missing[0]) {
    return {
      action: sim.missing[0],
      why: level.lesson,
      rest: sim.missing.slice(1),
    };
  }

  return {
    action: "Si blízko. Skontroluj meráky — zelená je v poriadku — a chvíľu počkaj.",
    why: level.lesson,
    rest: [],
  };
}

function collectRest(sim: SimState, _c: Controls, _level: LevelDef, skip: string): string[] {
  return sim.missing.filter((m) => {
    if (skip === "water" && m.includes("Hladina")) return false;
    if (skip === "air" && (m.includes("Dym") || m.includes("Účinnosť") || m.includes("vzduch"))) return false;
    if (skip === "draft" && (m.includes("kotolne") || m.includes("ťah") || m.includes("Účinnosť"))) return false;
    if (skip === "pump" && (m.includes("Čerpadlo") || m.includes("Okruh"))) return false;
    if (skip === "clean" && m.includes("Výmenník")) return false;
    if (skip === "sensor" && m.includes("snímač")) return false;
    if (skip === "pressure" && m.includes("Tlak")) return false;
    return true;
  });
}
