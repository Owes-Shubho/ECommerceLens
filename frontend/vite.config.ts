import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5173 },
  // Plotly is a large library that loads only on pages with charts.
  build: { chunkSizeWarningLimit: 5000 },
});
