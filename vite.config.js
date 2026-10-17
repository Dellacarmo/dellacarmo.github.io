import { defineConfig } from 'vite';

// Caminhos relativos: o build funciona em dellacarmo.github.io (raiz)
// e também em qualquer repositório publicado como /nome-do-repo/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
