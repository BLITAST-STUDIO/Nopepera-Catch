import { SPRITE_SRC, type SpriteKey } from "./types";

export type Images = Record<SpriteKey, HTMLImageElement>;

export function loadImages(): Promise<Images> {
  const entries = Object.entries(SPRITE_SRC) as [SpriteKey, string][];
  return Promise.all(
    entries.map(
      ([key, src]) =>
        new Promise<[SpriteKey, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve([key, img]);
          img.onerror = () => reject(new Error(`failed to load ${src}`));
          img.src = src;
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs) as Images);
}
