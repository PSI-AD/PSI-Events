import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { constants as zlibConstants } from 'zlib';
import { defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Pre-compress assets with gzip (serves .js.gz, .css.gz)
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,        // only compress files > 1KB
        deleteOriginFile: false, // keep originals as fallback
        compressionOptions: { level: 9 }, // maximum compression
      }),
      // Pre-compress assets with Brotli (modern browsers prefer br over gzip)
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        deleteOriginFile: false,
        compressionOptions: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } },
      }),
      // ── Non-blocking CSS loading ──────────────────────────────────────────
      // Converts Vite's render-blocking <link rel="stylesheet"> into a
      // preload + media="print" pattern so it no longer blocks the first paint.
      // The onload handler swaps media to "all" once the stylesheet is fetched.
      {
        name: 'non-blocking-css',
        apply: 'build',
        transformIndexHtml(html: string) {
          // Match Vite's emitted CSS link tags
          return html.replace(
            /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
            (_, href) =>
              `<link rel="preload" as="style" href="${href}">` +
              `<link rel="stylesheet" media="print" onload="this.media='all';this.onload=null" href="${href}">` +
              `<noscript><link rel="stylesheet" href="${href}"></noscript>`
          );
        },
      },
      // Bundle visualizer — remove after analysis
      // visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // Raise the warning threshold — our single-chunk bundle is intentional for now
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Function form of manualChunks catches ALL transitive sub-modules
          // by matching on the actual resolved file path. This is more reliable
          // than the object form which only matches the top-level package entry.
          manualChunks(id: string) {
            // ── Recharts (huge, only Analytics page needs it) ──────────────
            if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-vendor')) {
              return 'vendor-recharts';
            }
            // ── Framer Motion (all sub-modules) ───────────────────────────
            if (id.includes('node_modules/motion') ||
              id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/@motionone')) {
              return 'vendor-motion';
            }
            // ── React ecosystem (react-dom is the 552KB culprit) ──────────
            if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')) {
              return 'vendor-react';
            }
            // ── React core ────────────────────────────────────────────────
            if (id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
            // ── Lucide icons ──────────────────────────────────────────────
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            // ── Firebase SDK ─────────────────────────────────────────────
            if (id.includes('node_modules/firebase') ||
              id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            // ── Utility libraries ─────────────────────────────────────────
            if (id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/date-fns')) {
              return 'vendor-utils';
            }
          },
        },
      },
    },
  };
});
