import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
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
      // ── Inline tiny entry chunk into HTML ────────────────────────────────
      // The bootstrap chunk (index-xxx.js) is only ~2 KiB but still causes
      // a full network roundtrip (HTML → index.js = 481ms on mobile).
      // When it's this small, inlining it into the HTML eliminates the
      // extra request entirely — the browser has the code the instant
      // the HTML arrives, with zero extra latency.
      {
        name: 'inline-tiny-entry',
        apply: 'build',
        enforce: 'post',
        writeBundle(options: { dir?: string }, bundle: Record<string, { type: string; isEntry?: boolean; code?: string; fileName: string }>) {
          if (!options.dir) return;

          const htmlPath = join(options.dir, 'index.html');
          if (!existsSync(htmlPath)) return;

          // Find the lone entry chunk (our tiny bootstrap)
          const entry = Object.values(bundle).find(
            (c) => c.type === 'chunk' && c.isEntry === true
          );
          if (!entry || !entry.code) return;

          const sizeKB = Buffer.byteLength(entry.code, 'utf8') / 1024;
          // Safety valve — only inline if still small (< 10 KB unminified)
          if (sizeKB >= 10) {
            console.log(`[inline-tiny-entry] Skipping — entry chunk is ${sizeKB.toFixed(1)} KB (threshold: 10 KB)`);
            return;
          }

          let html = readFileSync(htmlPath, 'utf8');

          // ── Fix relative imports before inlining ─────────────────────────
          // The entry chunk's static imports use relative paths (e.g. from"./vendor-react-xxx.js")
          // because Rollup assumes the script lives at /assets/index-xxx.js.
          // When inlined into the HTML at /, those relative paths resolve to
          // /vendor-react-xxx.js (NOT /assets/vendor-react-xxx.js) — 404!
          // Firebase returns its SPA index.html with MIME "text/html" for 404s,
          // which the browser rejects as "not a valid module script" → app dies.
          //
          // Fix: rewrite all static `from"./..."` relative imports to
          // absolute `from"/assets/..."` paths so they resolve correctly
          // regardless of which URL the HTML is served from.
          const patchedCode = entry.code
            .trim()
            .replace(/from"\.\/([^"]+)"/g, 'from"/assets/$1"')
            .replace(/from'\.\/([^']+)'/g, "from'/assets/$1'");

          // Replace: <script type="module" crossorigin src="/assets/index-xxx.js"></script>
          // With:    <script type="module">...inlined + path-fixed code...</script>
          const replaced = html.replace(
            /<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>/,
            `<script type="module">${patchedCode}</script>`
          );

          if (replaced === html) {
            console.warn('[inline-tiny-entry] Entry script tag not found in HTML — skipping.');
            return;
          }

          writeFileSync(htmlPath, replaced);
          console.log(`[inline-tiny-entry] ✓ Inlined ${sizeKB.toFixed(2)} KB entry chunk into index.html`);

          // Remove the now-redundant separate JS file (and its .gz/.br siblings)
          for (const ext of ['', '.gz', '.br']) {
            const filePath = join(options.dir, entry.fileName + ext);
            if (existsSync(filePath)) unlinkSync(filePath);
          }

          // ── Inject modulepreload for critical lazy chunks ───────────────────
          // The vendor chunks are already preloaded by Vite (they're static
          // imports). But ExecutivePresentation and Login are lazy (dynamic
          // import) so Vite doesn't add preload hints for them.
          //
          // Without preloads: HTML → bootstrap runs → lazy import fires →
          //   chunk downloads (≈100-400ms) → Suspense shows loader →
          //   content replaces loader → 0.738 CLS on <body>!
          //
          // With preloads: HTML arrives → browser IMMEDIATELY fetches the
          //   chunks in parallel with bootstrap execution → by the time
          //   React runs the lazy import, the chunk is already ready →
          //   Suspense never shows its fallback → 0 CLS.
          const criticalChunkNames = ['ExecutivePresentation', 'Login'];
          const criticalChunks = Object.values(bundle).filter(
            (c): c is typeof bundle[string] & { type: 'chunk'; name: string; fileName: string } =>
              c.type === 'chunk' &&
              !('isEntry' in c && c.isEntry) &&
              'name' in c &&
              typeof c.name === 'string' &&
              criticalChunkNames.some(n => c.name === n)
          );

          if (criticalChunks.length > 0) {
            let finalHtml = readFileSync(htmlPath, 'utf8');
            const preloadLinks = criticalChunks
              .map(c => `  <link rel="modulepreload" crossorigin href="/${c.fileName}">`)
              .join('\n');
            finalHtml = finalHtml.replace('</head>', `${preloadLinks}\n</head>`);
            writeFileSync(htmlPath, finalHtml);
            console.log(`[inline-tiny-entry] ✓ Added modulepreload for: ${criticalChunks.map(c => c.name).join(', ')}`);
          }
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
