import { defineConfig } from 'vite';

// base relativo: funciona em GitHub Pages (usuario.github.io/repo/) sem ajuste
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  // Servidor de desenvolvimento em rede local (celular na mesma Wi-Fi). Recarrega sozinho ao salvar.
  server: {
    host: true,
    port: 5173,
  },
  // Pré-visualização do build (npm run build && npm run preview).
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
});
