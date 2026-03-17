import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  dts: true,
  shims: true,
  onSuccess:
    "node --input-type=module -e \"import { cpSync, mkdirSync } from 'node:fs'; mkdirSync('dist', { recursive: true }); cpSync('scripts', 'dist/scripts', { recursive: true });\"",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
