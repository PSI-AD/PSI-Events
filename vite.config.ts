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
          // Split heavy vendor libraries into separate, long-cacheable chunks.
          // Users only re-download a chunk when THAT library changes.
          manualChunks: {
            // React core + router — changes rarely
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Framer Motion — large animation library
            'vendor-motion': ['motion'],
            // Lucide icons — large icon set
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  };
});
