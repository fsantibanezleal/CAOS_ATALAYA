import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA served at the root of the custom domain simlab.fasl-work.com (GitHub Pages).
export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: { outDir: "dist", sourcemap: false },
});
