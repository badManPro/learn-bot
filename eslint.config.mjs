import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextPlugin = require("@next/eslint-plugin-next");
const tsParser = require("@typescript-eslint/parser");

export default [
  {
    ignores: [".next/**", "coverage/**", "node_modules/**"]
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {}
  },
  {
    files: ["apps/web/**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin
    },
    settings: {
      next: {
        rootDir: ["apps/web"]
      }
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules
    }
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message: "packages/ui must stay presentation-only and cannot import Prisma."
            }
          ],
          patterns: [
            {
              group: ["**/prisma/**"],
              message: "packages/ui must not depend on Prisma-managed modules."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["apps/desktop/renderer/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "electron",
              message: "Renderer code must go through the preload bridge instead of importing Electron directly."
            }
          ],
          patterns: [
            {
              group: ["**/electron-main/**"],
              message: "Renderer cannot import Electron main-process modules directly."
            },
            {
              group: ["**/electron-preload/**"],
              message: "Renderer must consume shared contracts or window.desktopApi types instead of preload modules."
            }
          ]
        }
      ]
    }
  }
];
