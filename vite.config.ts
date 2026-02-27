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
    },
  };
});
