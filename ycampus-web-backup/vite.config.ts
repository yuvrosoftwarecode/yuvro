import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"


export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8050,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/code-executor-api': {
        target: 'http://localhost:8009',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/code-executor-api/, '')
      }
    }
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));