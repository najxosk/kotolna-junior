import type { Controls, LevelDef, SimState, WinSpec } from "./types";

/** Fyzikálny krok ~120 ms. */
export const PHYSICS_DT = 0.12;

/** Levely bez termostatu ho držia vysoko, aby horák sám od seba nezhasínal. */
const IDLE_THERMO = 108;

export const DEFAULT_CONTROLS: Controls = {
  gasOpen: 0,
  airFlow: 0.55,
  chimneyDraft: 0.5,
  thermostat: IDLE_THERMO,
  pumpOn: false,
};

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function hasPumpControl(level: LevelDef) {
  return level.controls.includes("pump");
}

export function hasThermoControl(level: LevelDef) {
  return level.controls.includes("thermostat");
}

/** Ideálny vzduch rastie s plynom — viac paliva potrebuje viac kyslíka. */
export function idealAirFor(gas: number) {
  return clamp(0.14 + gas * 0.72, 0.14, 0.96);
}

export type MixBand = "rich" | "good" | "lean";
export type DraftBand = "weak" | "good" | "strong";

export function mixBand(gas: number, air: number): MixBand {
  const err = air - idealAirFor(gas);
  if (err < -0.12) return "rich";
  if (err > 0.14) return "lean";
  return "good";
}

export function draftBand(draft: number): DraftBand {
  if (draft < 0.34) return "weak";
  if (draft > 0.66) return "strong";
  return "good";
}

function applyLocks(c: Controls, level: LevelDef): Controls {
  const locked: Partial<Controls> = { ...level.locked };
  if (!hasThermoControl(level) && locked.thermostat === undefined) {
    locked.thermostat = IDLE_THERMO;
  }
  return { ...c, ...locked };
}

export function createSim(level: LevelDef): { controls: Controls; sim: SimState } {
  const controls: Controls = {
    ...DEFAULT_CONTROLS,
    ...level.initialControls,
  };
  if (!hasThermoControl(level)) controls.thermostat = level.locked?.thermostat ?? IDLE_THERMO;

  const init = {
    waterLevel: 0.55,
    ignited: false,
    temperature: 22,
    circuitTemp: 18,
    dirtyExchanger: false,
    falseAlarm: false,
    thermoOff: false,
    ...level.initialSim,
  };
  const sim: SimState = {
    waterLevel: init.waterLevel,
    fillValve: 0,
    drainValve: 0,
    ignitePulse: 0,
    ignited: init.ignited,
    flame: 0,
    mixQuality: 0,
    flameKind: "off",
    temperature: init.temperature,
    circuitTemp: init.circuitTemp,
    pressure: 1.1,
    smoke: 0,
    roomSmoke: 0,
    efficiency: 0,
    fuelUsed: 0,
    reliefOpen: false,
    dirtyExchanger: init.dirtyExchanger,
    dirtyCleared: false,
    falseAlarm: init.falseAlarm,
    sensorChecked: false,
    thermoOff: init.thermoOff,
    safetyOk: true,
    status: "ok",
    coach: null,
    hold: 0,
    elapsed: 0,
    won: false,
    failed: false,
    failReason: null,
    alarmSeconds: 0,
    efficiencyIntegral: 0,
    maxPressure: 1.1,
    missing: [],
  };
  return { controls, sim };
}

/**
 * Kauzálny model:
 * plameň = plyn + vzduch v pomere + zážih + voda
 * málo vzduchu → dym, žltý plameň, slabšie teplo
 * veľa vzduchu → chladenie, nízka účinnosť
 * slabý ťah → dym do kotolne
 * silný ťah → teplo do komína
 * čerpadlo vypnuté → teplo ostáva v kotle, rastie tlak
 */
export function step(
  sim: SimState,
  controlsIn: Controls,
  level: LevelDef,
  dt: number,
): SimState {
  if (sim.won || sim.failed) return sim;

  const c = applyLocks(controlsIn, level);
  const next: SimState = { ...sim };
  const pumpInLevel = hasPumpControl(level);

  next.elapsed += dt;
  next.ignitePulse = Math.max(0, sim.ignitePulse - dt);

  next.waterLevel = clamp(
    sim.waterLevel +
      (sim.fillValve * 0.24 - sim.drainValve * 0.2) * dt -
      (sim.reliefOpen ? 0.03 * dt : 0),
    0,
    1,
  );

  const lowWater = next.waterLevel < 0.22;
  const overfill = next.waterLevel > 0.93;

  if (sim.ignitePulse > 0 && c.gasOpen > 0.08 && !lowWater) next.ignited = true;
  if (c.gasOpen < 0.04) next.ignited = false;
  if (lowWater) next.ignited = false;

  // Termostat s hysterézou ~7 °C, aby horák neblikál.
  const setPoint = c.thermostat;
  if (sim.temperature >= setPoint) next.thermoOff = true;
  if (sim.temperature <= setPoint - 7) next.thermoOff = false;

  const wantFlame =
    next.ignited && c.gasOpen > 0.08 && !lowWater && !next.thermoOff;

  const idealAir = idealAirFor(c.gasOpen);
  const airErr = c.airFlow - idealAir;
  const absErr = Math.abs(airErr);
  const mixQuality = absErr <= 0.08 ? 1 : clamp(1 - (absErr - 0.08) / 0.3, 0, 1);
  next.mixQuality = mixQuality;

  const draft = c.chimneyDraft;
  const underDraft = clamp((0.34 - draft) / 0.34, 0, 1);
  const overDraft = clamp((draft - 0.66) / 0.34, 0, 1);
  const rich = clamp((-airErr - 0.06) / 0.28, 0, 1);
  const lean = clamp((airErr - 0.08) / 0.3, 0, 1);
  const dirtyFactor = next.dirtyExchanger ? 0.55 : 1;
  const draftFactor = 1 - 0.42 * underDraft;

  if (wantFlame) {
    next.flame = clamp(
      c.gasOpen * (0.22 + 0.78 * mixQuality) * draftFactor * dirtyFactor,
      0,
      1,
    );
  } else {
    next.flame = 0;
  }

  if (next.flame < 0.04) next.flameKind = "off";
  else if (rich > 0.4) next.flameKind = "sooty";
  else if (lean > 0.45) next.flameKind = "lean";
  else next.flameKind = "good";

  next.smoke = clamp(
    (next.flame > 0.04 ? 0.06 : 0) +
      rich * 0.82 +
      underDraft * 0.5 * Math.max(next.flame, 0.12) +
      (next.dirtyExchanger && next.flame > 0.05 ? 0.52 : 0),
    0,
    1,
  );
  next.roomSmoke = clamp(underDraft * (0.32 + next.smoke * 0.7), 0, 1);

  // Teplo: palivo dáva výkon, prebytok vzduchu/ťahu ho kradne, čerpadlo ho odnáša.
  const heatIn = next.flame * (2.0 + 7.0 * mixQuality);
  const excessLoss = next.flame * (lean * 4.2 + overDraft * 5.2);
  const pumpExtract =
    c.pumpOn && next.waterLevel > 0.28
      ? Math.max(0, sim.temperature - sim.circuitTemp) * 0.1
      : 0;
  const building = pumpInLevel ? 0 : next.flame * 1.2;
  const ambient = (sim.temperature - 20) * 0.05;

  next.temperature = clamp(
    sim.temperature + (heatIn - excessLoss - pumpExtract - building - ambient) * dt,
    16,
    124,
  );

  const circuitLoss = (sim.circuitTemp - 16) * (c.pumpOn ? 0.028 : 0.045);
  next.circuitTemp = clamp(
    sim.circuitTemp + (pumpExtract * 0.88 - circuitLoss) * dt,
    14,
    94,
  );

  // Tlak: základ od teploty + extra, keď horí bez obehu (teplo nemá kam ísť).
  const boiling = Math.max(0, next.temperature - 70);
  const trapped =
    !c.pumpOn && next.flame > 0.12 && pumpInLevel ? Math.max(0, next.temperature - 72) * 0.028 : 0;
  const pTarget = 1.08 + boiling * 0.012 + trapped;
  next.pressure = clamp(sim.pressure + (pTarget - sim.pressure) * clamp(dt * 0.55, 0, 1), 0.9, 3.15);

  next.reliefOpen = next.pressure >= 3.0;
  if (next.reliefOpen) {
    next.pressure = 2.92;
    next.temperature -= 2.4 * dt;
  }
  next.maxPressure = Math.max(sim.maxPressure, next.pressure);

  next.fuelUsed = sim.fuelUsed + c.gasOpen * dt;

  const combustion =
    mixQuality * (1 - overDraft * 0.55) * (1 - lean * 0.4) * dirtyFactor;
  const useFactor = pumpInLevel && !c.pumpOn ? 0.72 : 1;
  const instant = next.flame > 0.08 ? clamp(combustion * useFactor, 0, 1) : 0;
  if (next.flame > 0.08) next.efficiency = instant;
  else if (next.ignited && next.thermoOff) next.efficiency = sim.efficiency;
  else next.efficiency = sim.efficiency * Math.exp(-dt / 1.8);

  next.efficiencyIntegral += next.efficiency * dt;

  const emptyFire = next.waterLevel < 0.2 && next.flame > 0.12;
  const dangerPressure = next.pressure > 2.7;
  const heavySmoke = next.roomSmoke > 0.62;
  next.safetyOk = !lowWater && !overfill && !dangerPressure && !heavySmoke && !next.reliefOpen;

  if (emptyFire || dangerPressure || next.reliefOpen || heavySmoke) next.status = "alarm";
  else if (lowWater || next.smoke > 0.45 || next.temperature > 98 || !next.safetyOk)
    next.status = "warn";
  else next.status = "ok";

  if (next.status === "alarm") next.alarmSeconds += dt;

  next.coach = pickCoach(next, c, level);
  next.missing = missingGoals(next, c, level.win);

  if (next.missing.length === 0) next.hold += dt;
  else next.hold = Math.max(0, next.hold - dt * 1.6);

  if (next.hold >= level.win.holdSec) {
    next.won = true;
    next.coach = "Výborne. Kotol drží, čo má.";
  }

  const fail = checkFail(next, level, emptyFire, overfill);
  if (fail) {
    next.failed = true;
    next.failReason = fail;
  }

  return next;
}

function checkFail(
  s: SimState,
  level: LevelDef,
  emptyFire: boolean,
  overfill: boolean,
): string | null {
  if (emptyFire && s.elapsed > 3.5) {
    return "Kotol horí skoro nasucho. Vodu treba držať v zelenej zóne — inak sa teleso prehreje.";
  }
  if (overfill && s.waterLevel > 0.97 && s.elapsed > 2.2) {
    return "Vody je priveľa. Preplnený kotol nemá miesto na paru a môže striekať do potrubia.";
  }
  if (s.reliefOpen && s.alarmSeconds > 3.5) {
    return "Tlak vyhnal poistný ventil. Teplo nemalo kam ísť — zníž oheň alebo zapni obeh.";
  }
  if (s.roomSmoke > 0.8 && s.elapsed > 14) {
    return "Dym ide do kotolne. Slabý ťah alebo málo vzduchu. Spaliny musia ísť komínom.";
  }
  if (level.timeLimitSec && s.elapsed > level.timeLimitSec) {
    return "Čas vypršal. Skús to znova — tentoraz po menších krokoch.";
  }
  return null;
}

function missingGoals(s: SimState, c: Controls, w: WinSpec): string[] {
  const miss: string[] = [];
  if (w.water && (s.waterLevel < w.water[0] || s.waterLevel > w.water[1])) {
    miss.push("Hladina nie je v zelenej zóne.");
  }
  if (w.flameMin !== undefined && s.flame < w.flameMin) {
    if (s.thermoOff) miss.push("Termostat vypol horák. Zdvihni ho, ak ešte treba teplo.");
    else miss.push("Horák nehorí dosť silno. Treba plyn, vzduch aj zážih.");
  }
  if (w.smokeMax !== undefined && s.smoke > w.smokeMax) {
    miss.push("Dym je stále vysoký. Uprav vzduch, ťah alebo vyčisti výmenník.");
  }
  if (w.roomSmokeMax !== undefined && s.roomSmoke > w.roomSmokeMax) {
    miss.push("Dym uniká do kotolne. Priotvor ťah komína.");
  }
  if (w.efficiencyMin !== undefined && s.efficiency < w.efficiencyMin) {
    miss.push("Účinnosť je nízka. Hľadaj pokojný plameň a stredný ťah.");
  }
  if (w.temp && (s.temperature < w.temp[0] || s.temperature > w.temp[1])) {
    miss.push("Teplota kotla nie je v cieli.");
  }
  if (
    w.circuitTemp &&
    (s.circuitTemp < w.circuitTemp[0] || s.circuitTemp > w.circuitTemp[1])
  ) {
    miss.push("Okruh je studený. Čerpadlo musí točiť vodu do radiátorov.");
  }
  if (w.pressure && (s.pressure < w.pressure[0] || s.pressure > w.pressure[1])) {
    miss.push("Tlak nie je v bezpečnom pásme. Zapni obeh alebo zníž plyn.");
  }
  if (w.pumpOn && !c.pumpOn) miss.push("Obehové čerpadlo je vypnuté.");
  if (w.dirtyCleared && !s.dirtyCleared) {
    miss.push("Výmenník je ešte zašpinený — dym ostane, kým ho nevyčistíš.");
  }
  if (w.sensorChecked && !s.sensorChecked) {
    miss.push("Over hladinu na vodoznaku. Snímač môže klamať.");
  }
  return miss;
}

function pickCoach(s: SimState, c: Controls, level: LevelDef): string | null {
  if (s.waterLevel < 0.22) {
    return "Pozor — málo vody. Najprv dopustiť, až potom kúriť.";
  }
  if (s.waterLevel > 0.9) return "Hladina je vysoko. Trochu vypusti, nech ostane rezerva.";
  if (s.falseAlarm && !s.sensorChecked && s.waterLevel > 0.4) {
    return "Merák hlási prázdno, ale vodoznak ukazuje vodu. Over snímač, nalievať zbytočne netreba.";
  }
  if (s.thermoOff && s.ignited) {
    return "Termostat vypol horák — teplota dosiahla nastavenie. Ak treba ešte kúriť, zdvihni ho.";
  }
  if (s.roomSmoke > 0.28) {
    return "Dym do miestnosti: ťah je slabý. Priotvor dymák, spaliny patria do komína.";
  }
  if (s.flame > 0.06 && mixBand(c.gasOpen, c.airFlow) === "rich") {
    return "Žltý koptivý plameň = málo vzduchu. Pridaj vzduchák, kým dym neklesne.";
  }
  if (s.flame > 0.06 && mixBand(c.gasOpen, c.airFlow) === "lean") {
    return "Plameň je bledý. Veľa vzduchu ho chladí a teplo ide do komína — trochu ubrať.";
  }
  if (s.dirtyExchanger && s.smoke > 0.4 && mixBand(c.gasOpen, c.airFlow) === "good" && c.chimneyDraft > 0.34) {
    return "Zmes aj ťah sedia, ale dym ostáva. Výmenník je špinavý — vyčisti ho.";
  }
  if (draftBand(c.chimneyDraft) === "strong" && s.flame > 0.1) {
    return "Ťah je mocný. Teplo uletí komínom — trochu privri dymák.";
  }
  if (hasPumpControl(level) && s.flame > 0.25 && !c.pumpOn && s.temperature > 70) {
    return "Horí, ale teplo ostáva v kotle. Zapni čerpadlo, nech ide do radiátorov.";
  }
  if (s.reliefOpen) return "Poistný ventil púšťa. Zníž plyn alebo odveď teplo obehom.";
  if (!s.ignited && c.gasOpen > 0.3 && s.flame < 0.05) {
    return "Plyn ide, ale nehorí. Treba zážih — a vodu v kotle.";
  }
  if (s.flameKind === "good" && s.efficiency > 0.62 && s.safetyOk) {
    return "Pekný plameň, čistý odvod. Takto to má byť.";
  }
  return null;
}

export function scoreLevel(
  sim: SimState,
  level: LevelDef,
): {
  total: number;
  efficiency: number;
  safety: number;
  fuel: number;
  stars: 1 | 2 | 3;
} {
  const avgEff =
    sim.elapsed > 0.5 ? clamp(sim.efficiencyIntegral / sim.elapsed, 0, 1) : sim.efficiency;
  const efficiency = Math.round(avgEff * 100);
  const safety = Math.round(
    clamp(100 - sim.alarmSeconds * 14 - Math.max(0, sim.maxPressure - 2.3) * 35, 0, 100),
  );
  const expectedFuel = Math.max(6, level.win.holdSec * 0.5 + 5);
  const fuel = Math.round(
    clamp(100 - ((sim.fuelUsed - expectedFuel) / expectedFuel) * 70, 0, 100),
  );
  const total = Math.round(efficiency * 0.4 + safety * 0.4 + fuel * 0.2);
  const stars: 1 | 2 | 3 = total >= 82 ? 3 : total >= 62 ? 2 : 1;
  return { total, efficiency, safety, fuel, stars };
}

export function displayedWater(sim: SimState): number {
  if (sim.falseAlarm && !sim.sensorChecked) return 0.07;
  return sim.waterLevel;
}
