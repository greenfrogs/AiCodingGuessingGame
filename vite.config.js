import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoBase = "/AiCodingGuessingGame/";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages project site lives at /<repo-name>/, not root.
  base: command === "serve" ? "/" : repoBase
}));
