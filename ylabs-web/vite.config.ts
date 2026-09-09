import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['recharts', 'alasql', 'mingo', 'jspdf', 'xlsx'],
    exclude: [
      '@uiw/react-codemirror',
      '@codemirror/lang-python',
      '@codemirror/lang-java',
      '@codemirror/lang-html',
      '@codemirror/lang-markdown',
      '@codemirror/lang-sql',
      '@codemirror/lang-javascript',
      '@codemirror/lang-css',
      '@codemirror/lang-json',
      '@codemirror/lang-cpp',
      '@uiw/codemirror-theme-vscode',
      '@codemirror/view',
      '@codemirror/state',
      '@codemirror/language',
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      external: [
        'react-native-fs',
        'react-native',
        'react-native-fetch-blob',
      ],
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: ["dev.yuvrolabs.com", "localhost"],
  },
});
