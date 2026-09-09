// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Enable SSR for TanStack Start
// The app uses Nitro for server-side rendering, served via Bun runtime.
export default defineConfig({
  vite: {
    resolve: {
      alias: {
        'react-native': './src/lib/emptyStub.ts',
        'react-native-fs': './src/lib/emptyStub.ts',
        'react-native-fetch-blob': './src/lib/emptyStub.ts',
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
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        external: [
          'react-native-fs',
          'react-native',
          'react-native-fetch-blob',
        ],
        output: {},
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 3000,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: ["dev.yuvrolabs.com", "localhost"],
    },
  },
});
