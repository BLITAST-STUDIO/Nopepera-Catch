import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Rewrite absolute sprite URLs so the ZIP plays from itch.io subpaths. */
function relativeSpriteUrls(): Plugin {
  return {
    name: "itch-relative-sprites",
    transform(code, id) {
      if (!id.replace(/\\/g, "/").includes("/src/game/types.ts")) return;
      if (!code.includes('"/sprites/')) return;
      return {
        code: code.replaceAll('"/sprites/', '"./sprites/'),
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: "./",
  root: path.resolve(here, "itch"),
  publicDir: false,
  plugins: [relativeSpriteUrls(), tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": path.resolve(here, "src") },
  },
  build: {
    outDir: path.resolve(here, "dist-itch"),
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
    cssCodeSplit: false,
  },
});
