"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGame, type GameHandle } from "@/game/engine";
import type { UiSnap } from "@/game/types";

const INITIAL: UiSnap = {
  mode: "title",
  score: 0,
  best: 0,
  round: 1,
  partName: "左まゆげ",
  rankTitle: "",
  rankLine: "",
  muted: false,
  combo: 0,
  lastGrade: null,
  loading: true,
  roundScores: [0, 0, 0],
};

export function NopperaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const [ui, setUi] = useState<UiSnap>(INITIAL);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas, setUi);
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [mounted]);

  const g = gameRef.current;
  const playing = ui.mode === "playing" || ui.mode === "roundIntro" || ui.mode === "roundClear";
  const showCatch = ui.mode === "playing" || ui.mode === "roundIntro";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: "none" }}
        aria-label="のっぺらCATCH"
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              aria-label={ui.muted ? "サウンドをオン" : "サウンドをオフ"}
              onClick={() => g?.toggleMute()}
            >
              {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </Button>
          </div>
          {playing ? (
            <div className="text-right">
              <p className="font-display text-lg leading-tight tracking-tight tabular-nums">{ui.score}</p>
              <p className="text-xs text-muted">ROUND {ui.round} ・ {ui.partName}</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-xs text-muted">BEST</p>
              <p className="font-display text-base tabular-nums leading-tight">{ui.best}</p>
            </div>
          )}
        </header>

        <div className="flex-1" />

        {ui.mode === "title" && (
          <div className="pointer-events-auto flex flex-col items-center gap-6 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.28em] text-muted">NOPPERA CATCH</p>
              <h1 className="font-display text-4xl leading-none sm:text-5xl">のっぺらCATCH</h1>
              <p className="text-sm text-muted">顔面で受け止めろ</p>
            </div>
            <Button
              size="xl"
              disabled={ui.loading}
              onClick={() => g?.openHowto()}
            >
              はじめる
            </Button>
            <p className="max-w-xs text-xs leading-relaxed text-subtle">
              左右に動かして、落ちてくるパーツを顔の位置でキャッチ。
            </p>
          </div>
        )}

        {ui.mode === "howto" && (
          <div className="pointer-events-auto mx-auto mb-[max(1.25rem,env(safe-area-inset-bottom))] w-[min(100%-2rem,22rem)] rounded-xl border border-border bg-surface/95 p-4">
            <h2 className="font-display text-xl">あそびかた</h2>
            <ol className="mt-3 space-y-2 text-sm leading-snug text-fg">
              <li>
                <span className="text-muted">1.</span> 左右にのっぺらを動かす
              </li>
              <li>
                <span className="text-muted">2.</span> パーツが顔の高さに来たらキャッチ
              </li>
              <li>
                <span className="text-muted">3.</span> 完成しても、たぶん変な顔になる
              </li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              移動：ドラッグ / ←→　キャッチ：タップ / スペース
            </p>
            <Button className="mt-4 w-full" size="lg" onClick={() => g?.startPlay()}>
              キャッチ！
            </Button>
          </div>
        )}

        {ui.mode === "result" && (
          <div className="pointer-events-auto mx-auto mb-[max(1.5rem,env(safe-area-inset-bottom))] w-[min(100%-2rem,22rem)] rounded-xl border border-border bg-surface p-5">
            <p className="text-xs tracking-[0.2em] text-muted">本日の顔面</p>
            <h2 className="mt-1 font-display text-3xl leading-none">{ui.rankTitle}</h2>
            <p className="mt-2 text-sm text-muted">{ui.rankLine}</p>
            <p className="mt-4 font-display text-3xl tabular-nums leading-none">{ui.score}</p>
            <p className="mt-1 text-xs text-subtle">
              R1 {ui.roundScores[0]} ・ R2 {ui.roundScores[1]} ・ R3 {ui.roundScores[2]}
            </p>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" size="lg" onClick={() => g?.retry()}>
                もういちど
              </Button>
              <Button variant="ghost" size="lg" onClick={() => g?.toTitle()}>
                タイトル
              </Button>
            </div>
          </div>
        )}

        {showCatch && (
          <div className="pointer-events-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="catch"
              className="h-16 w-full rounded-lg font-display text-xl tracking-wide"
              onPointerDown={(e) => {
                e.preventDefault();
                g?.catchNow();
              }}
            >
              キャッチ
            </Button>
            <p className="mt-2 hidden text-center text-xs text-subtle sm:block">
              SPACE でもキャッチ
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
