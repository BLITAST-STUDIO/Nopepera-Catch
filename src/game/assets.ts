import { PART_ORDER, PART_SET_COUNT, PART_SRC, SPRITE_SRC, type PartId, type SpriteKey } from "./types";

export type Images = Record<SpriteKey, HTMLImageElement> & {
  parts: Record<PartId, HTMLImageElement[]>;
};

function loadOne(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

export function loadImages(): Promise<Images> {
  const shared = Object.entries(SPRITE_SRC) as [SpriteKey, string][];
  const partLoads = PART_ORDER.flatMap((id) =>
    PART_SRC[id].map((src, vi) => loadOne(src).then((img) => ({ id, vi, img }))),
  );

  return Promise.all([
    Promise.all(shared.map(([key, src]) => loadOne(src).then((img) => [key, img] as const))),
    Promise.all(partLoads),
  ]).then(([sharedPairs, partPairs]) => {
    const parts = Object.fromEntries(PART_ORDER.map((id) => [id, Array.from({ length: PART_SET_COUNT })])) as Record<
      PartId,
      HTMLImageElement[]
    >;
    for (const p of partPairs) parts[p.id][p.vi] = p.img;
    return { ...(Object.fromEntries(sharedPairs) as Record<SpriteKey, HTMLImageElement>), parts } as Images;
  });
}