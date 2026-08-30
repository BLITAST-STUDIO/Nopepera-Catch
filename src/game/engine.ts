import { createAudio, type AudioBus } from "./audio";
import { loadImages, type Images } from "./assets";
import { drawFrame } from "./draw";
import {
  CHAR_H,
  FALL_SPEED,
  FIXED_DT,
  GRADE_SCORE,
  GROUND_Y,
  IDEAL,
  LOG_H,
  LOG_W,
  MAX_DT,
  PART_NAME,
  PART_ORDER,
  SAVE_KEY,
  SPRITE,
  TOTAL_ROUNDS,
  randomPartSet,
  rankFor,
  type Attached,
  type Burst,
  type FaceSnap,
  type Falling,
  type Floater,
  type Grade,
  type Mode,
  type PartId,
  type Particle,
  type UiSnap,
} from "./types";

export type GameHandle = {
  destroy: () => void;
  startPlay: () => void;
  openHowto: () => void;
  retry: () => void;
  toTitle: () => void;
  toggleMute: () => void;
  catchNow: () => void;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function expDamp(cur: number, target: number, k: number, dt: number) {
  return lerp(cur, target, 1 - Math.exp(-k * dt));
}

function loadBest(): number {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { v?: number; best?: number };
    return typeof parsed.best === "number" ? parsed.best : 0;
  } catch {
    return 0;
  }
}

function saveBest(best: number) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, best }));
  } catch {
    /* ignore */
  }
}

function charMetrics(x: number, groundY: number) {
  const drawH = CHAR_H;
  const drawW = CHAR_H * (SPRITE.w / SPRITE.h);
  const headW = SPRITE.headW * drawW;
  const headH = SPRITE.headH * drawH;
  const headX = x;
  const headY = groundY - drawH + SPRITE.headCy * drawH;
  return { drawW, drawH, headW, headH, headX, headY };
}

function playBounds() {
  const { headW } = charMetrics(LOG_W / 2, GROUND_Y);
  const pad = headW / 2 + 10;
  return { minX: pad, maxX: LOG_W - pad };
}

function idealOffset(id: PartId, headW: number, headH: number) {
  const i = IDEAL[id];
  return { x: i.nx * (headW / 2), y: i.ny * (headH / 2) };
}

function gradeOf(dist: number, headW: number): Grade {
  const u = headW;
  if (dist < u * 0.11) return "perfect";
  if (dist < u * 0.22) return "good";
  if (dist < u * 0.38) return "ok";
  return "weird";
}

function inHead(px: number, py: number, headX: number, headY: number, headW: number, headH: number) {
  const dx = (px - headX) / (headW * 0.5);
  const dy = (py - headY) / (headH * 0.5);
  return dx * dx + dy * dy <= 1.18;
}

function gradeLabel(g: Grade) {
  if (g === "perfect") return "ドンピシャ";
  if (g === "good") return "おしい";
  if (g === "ok") return "まぁ";
  if (g === "weird") return "変";
  return "スルー";
}

export function createGame(
  canvas: HTMLCanvasElement,
  onUi: (ui: UiSnap) => void,
): GameHandle {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const audio: AudioBus = createAudio();
  let images: Images | null = null;
  let loaded = false;

  let mode: Mode = "title";
  let score = 0;
  let best = loadBest();
  let round = 1;
  let partIndex = 0;
  let combo = 0;
  let lastGrade: Grade | null = null;
  let roundScores: number[] = [0, 0, 0];
  let roundBase = 0;

  let charX = LOG_W / 2;
  let charTarget = LOG_W / 2;
  let squash = 1;
  let bobT = 0;

  let falling: Falling | null = null;
  let attached: Attached[] = [];
  let faces: FaceSnap[] = [];
  let spawnWait = 0;
  let introT = 0;
  let freeze = 0;
  let trauma = 0;

  const particles: Particle[] = [];
  const floaters: Floater[] = [];
  const bursts: Burst[] = [];

  const keys = new Set<string>();
  let pointerId: number | null = null;
  let pointerX = LOG_W / 2;
  let pointerDown = false;
  let pointerMoved = 0;
  let catchQueued = false;
  let padCatchWas = false;
  let muted = audio.getMuted();

  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, cssW: 0, cssH: 0 };

  function emitUi() {
    const rank = rankFor(score);
    onUi({
      mode,
      score,
      best,
      round,
      partName:
        mode === "roundClear"
          ? "完成"
          : PART_NAME[PART_ORDER[Math.min(partIndex, PART_ORDER.length - 1)]],
      rankTitle: rank.title,
      rankLine: rank.line,
      muted,
      combo,
      lastGrade,
      loading: !loaded,
      roundScores: roundScores.slice(),
    });
  }

  function worldFromClient(clientX: number) {
    const r = canvas.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * canvas.width;
    return { x: (sx - view.ox) / view.scale };
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === view.cssW && cssH === view.cssH && dpr === view.dpr) return;
    view.cssW = cssW;
    view.cssH = cssH;
    view.dpr = dpr;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    const scale = Math.min(canvas.width / LOG_W, canvas.height / LOG_H);
    view.scale = scale;
    view.ox = (canvas.width - LOG_W * scale) / 2;
    view.oy = (canvas.height - LOG_H * scale) / 2;
  }

  function spawnPart(id: PartId) {
    const { minX, maxX } = playBounds();
    falling = {
      id,
      variant: randomPartSet(),
      x: lerp(minX, maxX, Math.random()),
      y: -48,
      rot: (Math.random() - 0.5) * 0.4,
      spin: (Math.random() - 0.5) * 1.2,
    };
    emitUi();
  }

  function burst(x: number, y: number, color: string, n = 18) {
    bursts.push({ x, y, t: 0 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        life: 0,
        max: 0.35 + Math.random() * 0.35,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  function floatText(x: number, y: number, text: string, color: string) {
    floaters.push({ x, y, text, life: 0, max: 0.85, color });
  }

  function finishReveal() {
    if (round >= TOTAL_ROUNDS) {
      if (score > best) {
        best = score;
        saveBest(best);
      }
      mode = "result";
      audio.result();
      emitUi();
      return;
    }
    round += 1;
    partIndex = 0;
    attached = [];
    roundBase = score;
    mode = "roundIntro";
    introT = 1.05;
    audio.round();
    emitUi();
  }

  function nextAfterPart() {
    falling = null;
    partIndex += 1;
    if (partIndex >= PART_ORDER.length) {
      faces[round - 1] = attached.map((a) => ({ ...a }));
      roundScores[round - 1] = score - roundBase;
      mode = "roundClear";
      introT = reduce ? 0.42 : 0.82;
      squash = 0.84;
      trauma = Math.min(1, trauma + 0.18);
      audio.complete();
      emitUi();
      return;
    }
    spawnWait = 0.48;
    emitUi();
  }

  function tryCatch() {
    if (mode !== "playing" || !falling) {
      if (mode === "playing") audio.whiff();
      return;
    }
    const m = charMetrics(charX, GROUND_Y);
    const hit = inHead(falling.x, falling.y, m.headX, m.headY, m.headW, m.headH);
    if (!hit) {
      audio.whiff();
      return;
    }
    const relX = falling.x - m.headX;
    const relY = falling.y - m.headY;
    const ideal = idealOffset(falling.id, m.headW, m.headH);
    const dist = Math.hypot(relX - ideal.x, relY - ideal.y);
    const grade = gradeOf(dist, m.headW);
    attached = attached.filter((a) => a.id !== falling!.id);
    attached.push({ id: falling.id, variant: falling.variant, relX, relY, rot: falling.rot });
    lastGrade = grade;
    if (grade === "perfect") combo += 1;
    else combo = 0;
    const add = GRADE_SCORE[grade] + (combo > 1 ? (combo - 1) * 180 : 0);
    score += add;
    squash = 0.86;
    freeze = reduce ? 0 : 0.055;
    trauma = Math.min(1, trauma + (grade === "perfect" ? 0.45 : 0.28));
    const color = grade === "weird" ? "#b4232c" : "#e8d5c4";
    burst(falling.x, falling.y, color);
    floatText(
      falling.x,
      falling.y - 28,
      grade === "perfect" && combo > 1 ? `${combo} COMBO` : gradeLabel(grade),
      color,
    );
    audio.catch(grade);
    nextAfterPart();
  }

  function missFall() {
    if (!falling) return;
    lastGrade = "miss";
    combo = 0;
    trauma = Math.min(1, trauma + 0.2);
    floatText(falling.x, GROUND_Y - 40, "スルー", "#9a8f88");
    audio.miss();
    nextAfterPart();
  }

  function resetRun(nextMode: Mode) {
    score = 0;
    round = 1;
    partIndex = 0;
    combo = 0;
    lastGrade = null;
    roundScores = [0, 0, 0];
    roundBase = 0;
    attached = [];
    faces = [];
    falling = null;
    spawnWait = 0;
    charX = LOG_W / 2;
    charTarget = LOG_W / 2;
    mode = nextMode;
    introT = nextMode === "roundIntro" ? 1.05 : 0;
    emitUi();
  }

  function inputMove(dt: number) {
    let axis = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) axis -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) axis += 1;
    const pads = navigator.getGamepads?.() ?? [];
    let padCatch = false;
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0;
      if (Math.abs(ax) > 0.18) axis += ax;
      if (p.buttons[14]?.pressed) axis -= 1;
      if (p.buttons[15]?.pressed) axis += 1;
      if (p.buttons[0]?.pressed) padCatch = true;
    }
    if (padCatch && !padCatchWas) catchQueued = true;
    padCatchWas = padCatch;
    axis = clamp(axis, -1, 1);
    const { minX, maxX } = playBounds();
    if (pointerDown) {
      charTarget = clamp(pointerX, minX, maxX);
    } else if (axis !== 0) {
      charTarget = clamp(charTarget + axis * 280 * dt, minX, maxX);
    }
    charX = expDamp(charX, charTarget, 14, dt);
  }

  function stepSim(dt: number) {
    bobT += dt;
    squash = expDamp(squash, 1, 12, dt);
    trauma = Math.max(0, trauma - dt * 2.4);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
      if (p.life >= p.max) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life += dt;
      f.y -= 36 * dt;
      if (f.life >= f.max) floaters.splice(i, 1);
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].t += dt;
      if (bursts[i].t > 0.28) bursts.splice(i, 1);
    }

    if (mode === "title" || mode === "howto") {
      if (!falling) {
        spawnPart(PART_ORDER[Math.floor(Math.random() * PART_ORDER.length)]);
      } else {
        falling.y += 90 * dt;
        falling.rot += falling.spin * dt;
        if (falling.y > LOG_H + 40) falling = null;
      }
      return;
    }

    if (mode === "roundIntro") {
      introT -= dt;
      if (introT <= 0) {
        mode = "playing";
        spawnWait = 0.2;
        emitUi();
      }
      return;
    }

    if (mode === "roundClear") {
      catchQueued = false;
      introT -= dt;
      if (introT <= 0) finishReveal();
      return;
    }

    if (mode !== "playing") return;

    inputMove(dt);

    if (spawnWait > 0 && !falling) {
      spawnWait -= dt;
      if (spawnWait <= 0) spawnPart(PART_ORDER[partIndex]);
    }

    if (falling) {
      const speed = FALL_SPEED[round - 1] ?? 160;
      falling.y += speed * dt;
      falling.rot += falling.spin * dt * 0.35;
      const m = charMetrics(charX, GROUND_Y);
      if (falling.y > m.headY + m.headH * 0.62) missFall();
    }

    if (catchQueued) {
      catchQueued = false;
      tryCatch();
    }
  }

  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let running = true;

  function frame(now: number) {
    if (!running) return;
    layout();
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, MAX_DT);
    if (document.hidden) dt = 0;

    if (freeze > 0) {
      freeze -= dt;
      dt = 0;
    }

    acc += dt;
    while (acc >= FIXED_DT) {
      stepSim(FIXED_DT);
      acc -= FIXED_DT;
    }

    const ctx = canvas.getContext("2d");
    if (ctx && images) {
      const shake = reduce ? 0 : trauma * trauma;
      const ox = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;
      const oy = shake ? (Math.random() * 2 - 1) * 8 * shake : 0;
      drawFrame(ctx, {
        images,
        view,
        mode,
        charX,
        squash,
        bobT: reduce ? 0 : bobT,
        falling,
        attached,
        faces,
        particles,
        floaters,
        bursts,
        round,
        partIndex,
        reduce,
        ox,
        oy,
        clearT: mode === "roundClear" ? introT : 0,
      });
    }
    raf = requestAnimationFrame(frame);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (["Space", "ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    audio.unlock();
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "Enter") {
      if (mode === "title") {
        openHowto();
        return;
      }
      if (mode === "howto") {
        startPlay();
        return;
      }
      if (mode === "result") {
        retry();
        return;
      }
      if (mode === "playing") catchQueued = true;
    }
    if (e.code === "Escape") toTitle();
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function onBlur() {
    keys.clear();
    pointerDown = false;
    pointerId = null;
  }

  function onPointerDown(e: PointerEvent) {
    audio.unlock();
    const w = worldFromClient(e.clientX);
    pointerId = e.pointerId;
    pointerX = w.x;
    pointerDown = true;
    pointerMoved = 0;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  function onPointerMove(e: PointerEvent) {
    if (pointerId !== e.pointerId || !pointerDown) return;
    const w = worldFromClient(e.clientX);
    pointerMoved += Math.abs(w.x - pointerX);
    pointerX = w.x;
  }
  function onPointerUp(e: PointerEvent) {
    if (pointerId !== e.pointerId) return;
    const wasTap = pointerMoved < 14;
    pointerDown = false;
    pointerId = null;
    if (wasTap && mode === "playing") catchQueued = true;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  function startPlay() {
    audio.unlock();
    resetRun("roundIntro");
    audio.round();
  }
  function openHowto() {
    audio.unlock();
    mode = "howto";
    emitUi();
  }
  function retry() {
    audio.unlock();
    startPlay();
  }
  function toTitle() {
    resetRun("title");
    falling = null;
  }
  function toggleMute() {
    muted = audio.toggleMute();
    emitUi();
  }

  void loadImages()
    .then((imgs) => {
      images = imgs;
      loaded = true;
      emitUi();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    })
    .catch((err) => {
      console.error(err);
    });

  emitUi();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
    startPlay,
    openHowto,
    retry,
    toTitle,
    toggleMute,
    catchNow() {
      audio.unlock();
      catchQueued = true;
    },
  };
}
