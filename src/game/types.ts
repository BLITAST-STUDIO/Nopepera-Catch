export const LOG_W = 420;
export const LOG_H = 780;
export const GROUND_Y = 698;
export const CHAR_H = 392;
export const FIXED_DT = 1 / 60;
export const MAX_DT = 0.1;
export const SAVE_KEY = "noppera-catch-v1";
export const TOTAL_ROUNDS = 3;

export const C = {
  paper: "#f3ece6",
  muted: "#9a8f88",
  flesh: "#e8d5c4",
  crimson: "#b4232c",
  ink: "#0c0a0b",
} as const;

export type PartId = "browL" | "browR" | "eyeL" | "eyeR" | "nose" | "mouth";
export type Mode = "title" | "howto" | "roundIntro" | "playing" | "roundClear" | "result";
export type Grade = "perfect" | "good" | "ok" | "weird" | "miss";

export const PART_ORDER: PartId[] = ["browL", "browR", "eyeL", "eyeR", "nose", "mouth"];

export const PART_NAME: Record<PartId, string> = {
  browL: "左まゆげ",
  browR: "右まゆげ",
  eyeL: "左め",
  eyeR: "右め",
  nose: "はな",
  mouth: "くち",
};

export const GRADE_LABEL: Record<Grade, string> = {
  perfect: "ドンピシャ",
  good: "おしい",
  ok: "まぁ",
  weird: "変",
  miss: "スルー",
};

export const GRADE_SCORE: Record<Grade, number> = {
  perfect: 1000,
  good: 640,
  ok: 320,
  weird: 90,
  miss: 0,
};

/** Ideal offsets as fractions of head half-size (nx * hw/2, ny * hh/2). */
export const IDEAL: Record<PartId, { nx: number; ny: number }> = {
  browL: { nx: -0.42, ny: -0.55 },
  browR: { nx: 0.42, ny: -0.55 },
  eyeL: { nx: -0.34, ny: -0.16 },
  eyeR: { nx: 0.34, ny: -0.16 },
  nose: { nx: 0, ny: 0.2 },
  mouth: { nx: 0, ny: 0.52 },
};

/** Draw size as a fraction of head width. Surreal = a bit too big. */
export const PART_SIZE: Record<PartId, { w: number; h: number }> = {
  browL: { w: 0.46, h: 0.2 },
  browR: { w: 0.46, h: 0.18 },
  eyeL: { w: 0.34, h: 0.28 },
  eyeR: { w: 0.32, h: 0.3 },
  nose: { w: 0.34, h: 0.4 },
  mouth: { w: 0.56, h: 0.22 },
};

export const SPRITE_SRC = {
  noppera: "/sprites/noppera.png",
  stage: "/sprites/stage.jpg",
  fx1: "/sprites/fx-1.png",
  fx2: "/sprites/fx-2.png",
  fx3: "/sprites/fx-3.png",
  fx4: "/sprites/fx-4.png",
} as const;

export type SpriteKey = keyof typeof SPRITE_SRC;

/** 3 graphic sets. Index 0 is the original. Spawn picks at random. */
export const PART_SET_COUNT = 3;

export const PART_SRC: Record<PartId, readonly [string, string, string]> = {
  browL: ["/sprites/brow-l.png", "/sprites/brow-l-2.png?v=2", "/sprites/brow-l-3.png?v=2"],
  browR: ["/sprites/brow-r.png", "/sprites/brow-r-2.png?v=2", "/sprites/brow-r-3.png?v=2"],
  eyeL: ["/sprites/eye-l.png", "/sprites/eye-l-2.png?v=2", "/sprites/eye-l-3.png?v=2"],
  eyeR: ["/sprites/eye-r.png", "/sprites/eye-r-2.png?v=2", "/sprites/eye-r-3.png?v=2"],
  nose: ["/sprites/nose.png?v=4", "/sprites/nose-2.png?v=2", "/sprites/nose-3.png?v=2"],
  mouth: ["/sprites/mouth.png", "/sprites/mouth-2.png?v=2", "/sprites/mouth-3.png?v=2"],
};

export function randomPartSet() {
  return Math.floor(Math.random() * PART_SET_COUNT);
}

/** Measured from the cropped noppera sprite (287×900). */
export const SPRITE = {
  w: 287,
  h: 900,
  headCx: 0.5,
  headCy: 180 / 900,
  headW: 266 / 287,
  headH: 352 / 900,
};

export const FALL_SPEED = [176, 250, 340];

export function rankFor(score: number): { title: string; line: string } {
  if (score >= 14000) return { title: "神の顔面", line: "本人より本人。" };
  if (score >= 10000) return { title: "人間認定", line: "通りを歩ける顔です。" };
  if (score >= 6200) return { title: "のっぺら未満", line: "まだ途中の顔。" };
  return { title: "妖怪", line: "完成してしまった。" };
}

export type Attached = {
  id: PartId;
  variant: number;
  relX: number;
  relY: number;
  rot: number;
};

export type Falling = {
  id: PartId;
  variant: number;
  x: number;
  y: number;
  rot: number;
  spin: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
};

export type Burst = {
  x: number;
  y: number;
  t: number;
};

export type FaceSnap = Attached[];

export type UiSnap = {
  mode: Mode;
  score: number;
  best: number;
  round: number;
  partName: string;
  rankTitle: string;
  rankLine: string;
  muted: boolean;
  combo: number;
  lastGrade: Grade | null;
  loading: boolean;
  roundScores: number[];
};
