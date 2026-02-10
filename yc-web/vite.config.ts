import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['jspdf'],
    force: true
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /node_modules/]
    }
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    hmr: {
      clientPort: 3000,
      overlay: true
    },
    watch: {
      usePolling: true
    },
  },
})
