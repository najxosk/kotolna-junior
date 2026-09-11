export type ControlKey =
  | "gas"
  | "air"
  | "draft"
  | "water"
  | "pump"
  | "ignite"
  | "clean"
  | "thermostat"
  | "sensor";

export type GaugeKey = "temp" | "pressure" | "water" | "smoke" | "efficiency" | "circuit";

export type FlameKind = "off" | "sooty" | "good" | "lean";

export type StatusTone = "ok" | "warn" | "alarm";

export interface Controls {
  gasOpen: number;
  airFlow: number;
  chimneyDraft: number;
  thermostat: number;
  pumpOn: boolean;
}

export interface WinSpec {
  water?: [number, number];
  flameMin?: number;
  smokeMax?: number;
  roomSmokeMax?: number;
  efficiencyMin?: number;
  temp?: [number, number];
  circuitTemp?: [number, number];
  pressure?: [number, number];
  pumpOn?: boolean;
  dirtyCleared?: boolean;
  sensorChecked?: boolean;
  holdSec: number;
}

export interface LevelDef {
  id: number;
  title: string;
  subtitle: string;
  brief: string;
  physics: string;
  wrong: string;
  why: string;
  lesson: string;
  controls: ControlKey[];
  gauges: GaugeKey[];
  initialControls: Partial<Controls>;
  initialSim: Partial<SimInit>;
  locked?: Partial<Controls>;
  win: WinSpec;
  scoring: boolean;
  bonus?: boolean;
  timeLimitSec?: number;
}

export interface SimInit {
  waterLevel: number;
  ignited: boolean;
  temperature: number;
  circuitTemp: number;
  dirtyExchanger: boolean;
  falseAlarm: boolean;
  thermoOff: boolean;
}

export interface SimState {
  waterLevel: number;
  fillValve: number;
  drainValve: number;
  ignitePulse: number;
  ignited: boolean;
  flame: number;
  mixQuality: number;
  flameKind: FlameKind;
  temperature: number;
  circuitTemp: number;
  pressure: number;
  smoke: number;
  roomSmoke: number;
  efficiency: number;
  fuelUsed: number;
  reliefOpen: boolean;
  dirtyExchanger: boolean;
  dirtyCleared: boolean;
  falseAlarm: boolean;
  sensorChecked: boolean;
  thermoOff: boolean;
  safetyOk: boolean;
  status: StatusTone;
  coach: string | null;
  hold: number;
  elapsed: number;
  won: boolean;
  failed: boolean;
  failReason: string | null;
  alarmSeconds: number;
  efficiencyIntegral: number;
  maxPressure: number;
  missing: string[];
}

export interface LevelScore {
  total: number;
  efficiency: number;
  safety: number;
  fuel: number;
  stars: 1 | 2 | 3;
}

export interface SaveData {
  version: number;
  playerName: string;
  unlockedLevel: number;
  completed: Record<string, LevelScore>;
  soundOn: boolean;
}
