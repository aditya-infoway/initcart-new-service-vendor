import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), tailwindcss()],
  base: "/servicevendor2/",
  build: {
    outDir: "dist",
    sourcemap: false,
    cssMinify: true,
    minify: "esbuild",
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5001,
  },
  appType: "spa",
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
      "components": path.join(__dirname, "src/components"),
    },
  },
});
