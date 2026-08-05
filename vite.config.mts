/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split the big vendor libraries into stable, cacheable chunks so a
        // deploy that only touches app code reuses the browser's cached
        // react/mui bundles, and the browser can fetch chunks in parallel.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Anchored to the package boundary so scoped packages like
          // @xyflow/react or @mui/* can never be caught by a sibling matcher.
          if (/\/node_modules\/@mui\/icons-material\//.test(id)) return "vendor-icons";
          if (/\/node_modules\/(@mui|@emotion)\//.test(id)) return "vendor-mui";
          if (
            /\/node_modules\/(react|react-dom|react-redux|@reduxjs|redux|immer|reselect|scheduler|use-sync-external-store|react-is)\//.test(
              id
            )
          ) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
    css: false,
  },
});
