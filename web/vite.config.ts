/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// web's package.json "imports" maps "#src/*" to both ".tsx" and ".ts", so
// tsc can resolve it, but Vite/vitest only try the first array alternative.
// This plugin resolves "#src/*" specifiers from within web/src ourselves,
// handing them back to Vite's own extension resolution (see
// docs/coding-standards.md), and leaves every other package's "#src"
// imports (e.g. shared/'s own self-reference) to Vite's default resolver.
function webSrcSubpathImports(): Plugin {
  return {
    name: 'web-src-subpath-imports',
    resolveId(source, importer) {
      if (!source.startsWith('#src/')) return null;
      if (!importer?.startsWith(srcDir + path.sep)) {
        return null;
      }
      const target = path.join(srcDir, source.slice('#src/'.length));
      return this.resolve(target, importer, { skipSelf: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), webSrcSubpathImports()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
