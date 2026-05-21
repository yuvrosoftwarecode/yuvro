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
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /node_modules/]
    },
    // Split vendor chunks for better caching and faster initial load
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          editor: ['@monaco-editor/react'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
        },
      },
    },
    // Increase chunk size warning limit (monaco is large)
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0",
    hmr: {
      protocol: "ws",
      host: "localhost",
      clientPort: 3000,
      overlay: true
    },
    watch: {
      usePolling: true
    },
  },
})
