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
    plugins: {
      "@next/next": nextPlugin
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules
    }
  }
];
