import path, { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Provide empty modules for Node.js built-ins that the ollama package tries to use
      "node:fs": resolve(__dirname, "./src/polyfills/fs-polyfill.ts"),
      "node:path": resolve(__dirname, "./src/polyfills/path-polyfill.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["electron"],
  },
});
