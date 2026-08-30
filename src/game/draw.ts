import type { Images } from "./assets";
import {
  C,
  CHAR_H,
  GROUND_Y,
  IDEAL,
  LOG_H,
  LOG_W,
  PART_ORDER,
  PART_SIZE,
  SPRITE,
  type Attached,
  type Burst,
  type FaceSnap,
  type Falling,
  type Floater,
  type Mode,
  type PartId,
  type Particle,
} from "./types";

export type View = { scale: number; ox: number; oy: number; dpr: number };

export type DrawState = {
  images: Images;
  view: View;
  mode: Mode;
  charX: number;
  squash: number;
  bobT: number;
  falling: Falling | null;
  attached: Attached[];
  faces: FaceSnap[];
  particles: Particle[];
  floaters: Floater[];
  bursts: Burst[];
  round: number;
  partIndex: number;
  reduce: boolean;
  ox: number;
  oy: number;
  clearT: number;
};

function partWH(id: PartId, headW: number) {
  const s = PART_SIZE[id];
  return { w: s.w * headW, h: s.h * headW };
}

function drawPart(
  ctx: CanvasRenderingContext2D,
  images: Images,
  id: PartId,
  variant: number,
  x: number,
  y: number,
  headW: number,
  rot: number,
  alpha: number,
) {
  const set = images.parts[id];
  const img = set[variant] ?? set[0];
  const { w, h } = partWH(id, headW);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  images: Images,
  x: number,
  groundY: number,
  squash: number,
  bobT: number,
  attached: Attached[],
  ghost: PartId | null,
  ghostAlpha: number,
  ghostVariant = 0,
) {
  const bobY = Math.sin(bobT * 2.2) * 3;
  const feetY = groundY + bobY;
  const asp = SPRITE.w / SPRITE.h;
  const baseW = CHAR_H * asp;
  const baseH = CHAR_H;

  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(2 - squash, squash);
  ctx.translate(-x, -feetY);

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(x, feetY - 3, baseW * 0.4, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const dx = x - baseW / 2;
  const dy = feetY - baseH;
  ctx.drawImage(images.noppera, dx, dy, baseW, baseH);

  const headW = SPRITE.headW * baseW;
  const headH = SPRITE.headH * baseH;
  const headX = x;
  const headY = feetY - baseH + SPRITE.headCy * baseH;

  if (ghost && ghostAlpha > 0) {
    const ideal = IDEAL[ghost];
    const gx = headX + ideal.nx * (headW / 2);
    const gy = headY + ideal.ny * (headH / 2);
    const { w, h } = partWH(ghost, headW);
    ctx.save();
    ctx.globalAlpha = ghostAlpha;
    ctx.strokeStyle = C.flesh;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(gx, gy, w * 0.55, h * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawPart(ctx, images, ghost, ghostVariant, gx, gy, headW, 0, 0.7);
    ctx.restore();
  }

  for (const a of attached) {
    drawPart(ctx, images, a.id, a.variant, headX + a.relX, headY + a.relY, headW, a.rot, 1);
  }
  ctx.restore();

  return { headW, headH, headX, headY };
}

export function drawFrame(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { view } = s;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(view.ox + s.ox * view.scale, view.oy + s.oy * view.scale);
  ctx.scale(view.scale, view.scale);

  ctx.drawImage(s.images.stage, 0, 0, LOG_W, LOG_H);
  ctx.fillStyle = "rgba(12,10,11,0.22)";
  ctx.fillRect(0, 0, LOG_W, LOG_H);

  if (s.mode === "result") {
    const slots = 3;
    const gap = 14;
    const totalW = LOG_W - 28;
    const slotW = (totalW - gap * (slots - 1)) / slots;
    const natW = CHAR_H * (SPRITE.w / SPRITE.h);
    const scale = slotW / (natW * 1.08);
    for (let i = 0; i < slots; i++) {
      const cx = 14 + slotW / 2 + i * (slotW + gap);
      const gy = 390;
      ctx.save();
      ctx.translate(cx, gy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -gy);
      drawCharacter(ctx, s.images, cx, gy, 1, 0, s.faces[i] ?? [], null, 0);
      ctx.restore();
      ctx.fillStyle = C.muted;
      ctx.font = "500 11px 'Zen Kaku Gothic New', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`ROUND ${i + 1}`, cx, gy + 18);
    }
    const grd = ctx.createLinearGradient(0, LOG_H * 0.52, 0, LOG_H);
    grd.addColorStop(0, "rgba(12,10,11,0)");
    grd.addColorStop(1, "rgba(12,10,11,0.72)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LOG_W, LOG_H);
    ctx.restore();
    return;
  }

  const ghostId =
    s.mode === "playing" && s.falling
      ? s.falling.id
      : s.mode === "playing"
        ? PART_ORDER[s.partIndex]
        : null;
  const ghostA = s.round === 1 ? 0.34 : s.round === 2 ? 0.14 : 0;

  const m = drawCharacter(
    ctx,
    s.images,
    s.charX,
    GROUND_Y,
    s.squash,
    s.bobT,
    s.attached,
    ghostId && ghostA > 0 ? ghostId : null,
    ghostA,
    s.falling?.variant ?? 0,
  );

  if (s.falling) {
    drawPart(
      ctx,
      s.images,
      s.falling.id,
      s.falling.variant,
      s.falling.x,
      s.falling.y,
      m.headW,
      s.falling.rot,
      1,
    );
  }

  for (const p of s.particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const fxs = [s.images.fx1, s.images.fx2, s.images.fx3, s.images.fx4];
  for (const b of s.bursts) {
    const frame = Math.min(3, Math.floor(b.t / 0.06));
    const size = 72 + frame * 12;
    ctx.globalAlpha = Math.max(0, 0.9 - b.t * 2.4);
    ctx.drawImage(fxs[frame], b.x - size / 2, b.y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  ctx.font = "700 18px 'Dela Gothic One', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of s.floaters) {
    const t = f.life / f.max;
    ctx.globalAlpha = Math.max(0, 1 - t * t);
    ctx.fillStyle = f.color;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  if (s.mode === "title" || s.mode === "howto") {
    const grd = ctx.createLinearGradient(0, LOG_H * 0.42, 0, LOG_H);
    grd.addColorStop(0, "rgba(12,10,11,0)");
    grd.addColorStop(0.55, "rgba(12,10,11,0.45)");
    grd.addColorStop(1, "rgba(12,10,11,0.88)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LOG_W, LOG_H);
  }

  if (s.mode === "roundIntro") {
    ctx.fillStyle = "rgba(12,10,11,0.42)";
    ctx.fillRect(0, 0, LOG_W, LOG_H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "400 40px 'Dela Gothic One', serif";
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 7;
    ctx.fillStyle = C.paper;
    ctx.strokeText(`ROUND ${s.round}`, LOG_W / 2, LOG_H * 0.36);
    ctx.fillText(`ROUND ${s.round}`, LOG_W / 2, LOG_H * 0.36);
    ctx.font = "500 14px 'Zen Kaku Gothic New', sans-serif";
    ctx.fillStyle = C.muted;
    ctx.fillText("顔を完成させろ", LOG_W / 2, LOG_H * 0.36 + 38);
  }

  if (s.mode === "roundClear") {
    const max = s.reduce ? 0.42 : 0.82;
    const elapsed = Math.max(0, max - s.clearT);
    const flash = elapsed < 0.12 ? (1 - elapsed / 0.12) * 0.28 : 0;
    if (flash > 0) {
      ctx.fillStyle = `rgba(243,236,230,${flash})`;
      ctx.fillRect(0, 0, LOG_W, LOG_H);
    }
    const fadeIn = Math.min(1, elapsed / 0.08);
    const fadeOut = s.clearT < 0.16 ? s.clearT / 0.16 : 1;
    const a = fadeIn * fadeOut;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "400 34px 'Dela Gothic One', serif";
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 7;
    ctx.fillStyle = C.paper;
    ctx.strokeText("完成！", LOG_W / 2, 148);
    ctx.fillText("完成！", LOG_W / 2, 148);
    ctx.font = "500 13px 'Zen Kaku Gothic New', sans-serif";
    ctx.fillStyle = C.muted;
    ctx.fillText(`ROUND ${s.round}`, LOG_W / 2, 178);
    ctx.restore();
  }

  ctx.restore();
}
