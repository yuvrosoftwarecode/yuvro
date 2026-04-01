import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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

