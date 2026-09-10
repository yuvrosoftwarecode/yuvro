import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-native": path.resolve(__dirname, "./src/lib/emptyStub.ts"),
      "react-native-fs": path.resolve(__dirname, "./src/lib/emptyStub.ts"),
    },
  },
  optimizeDeps: {
    include: ["recharts", "alasql", "mingo", "jspdf", "xlsx"],
    exclude: [
      "@uiw/react-codemirror",
      "@codemirror/lang-python",
      "@codemirror/lang-java",
      "@codemirror/lang-html",
      "@codemirror/lang-markdown",
      "@codemirror/lang-sql",
      "@codemirror/lang-javascript",
      "@codemirror/lang-css",
      "@codemirror/lang-json",
      "@codemirror/lang-cpp",
      "@uiw/codemirror-theme-vscode",
      "@codemirror/view",
      "@codemirror/state",
      "@codemirror/language",
    ],
  },
  build: {
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      external: ["react-native-fs", "react-native"],
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: ["dev.yuvrolabs.com", "localhost"],
    hmr: {
      protocol: "ws",
      host: "localhost",
      clientPort: 3000,
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
  },
});
