import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['recharts', 'lodash.merge'],
  },
  build: {
    commonjsOptions: {
      include: [/lodash\.merge/, /node_modules/],
      transformMixedEsModules: true,
    },
    // Disable modulePreload polyfill inlining — prevents data:application/octet-stream MIME errors
    modulePreload: {
      polyfill: false,
    },
    // Split vendor chunks for better caching and faster initial load
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          query: ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      '/media': {
        target: 'http://ycampus-backend:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://ycampus-backend:8000',
        changeOrigin: true,
      }
    },
    hmr: {
      clientPort: 3001,
      overlay: true
    },
    watch: {
      usePolling: true
    },
  },
})

