import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the src/web/ SPA (Phase 6). Kept as a separate build step from the
// server (tsc) so the API/domain/store code never depends on a browser
// bundler, per design.md's hexagonal layering.
export default defineConfig({
  root: "src/web",
  plugins: [react()],
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
