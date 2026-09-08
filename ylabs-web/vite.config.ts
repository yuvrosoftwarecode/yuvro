// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        'react-native': './src/lib/emptyStub.ts',
        'react-native-fs': './src/lib/emptyStub.ts',
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
    ssr: {
      noExternal: [],
    },
    build: {
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        external: ['react-native-fs', 'react-native'],
        output: {},
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
        clientPort: 3002,
        overlay: true,
      },
      watch: {
        usePolling: true,
      },
    },
  },
});
