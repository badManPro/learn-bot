import path from "node:path";

import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const bundledWorkspaceDeps = ["@learn-bot/ai-contracts", "@learn-bot/core", "@learn-bot/domain-packs", "@learn-bot/ui"];

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: path.resolve(__dirname, "./electron-main/main.ts")
      },
      outDir: "dist/main"
    },
    plugins: [externalizeDepsPlugin({ exclude: bundledWorkspaceDeps })]
  },
  preload: {
    build: {
      lib: {
        entry: path.resolve(__dirname, "./electron-preload/preload.ts")
      },
      outDir: "dist/preload"
    },
    plugins: [externalizeDepsPlugin({ exclude: bundledWorkspaceDeps })]
  },
  renderer: {
    root: path.resolve(__dirname, "./renderer"),
    build: {
      outDir: path.resolve(__dirname, "./dist/renderer"),
      rollupOptions: {
        input: path.resolve(__dirname, "./renderer/index.html")
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./renderer/src")
      }
    }
  }
});
