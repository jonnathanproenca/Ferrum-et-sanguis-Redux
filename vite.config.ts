import { defineConfig, type Plugin } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Lista os arquivos de public/assets/audio num audio-manifest.json (dev e build): basta soltar o arquivo na pasta. */
function manifestoAudio(): Plugin {
  const raiz = join(process.cwd(), 'public', 'assets', 'audio');
  const listar = (dir: string): string[] =>
    !existsSync(dir)
      ? []
      : readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
          d.isDirectory() ? listar(join(dir, d.name)) : /\.(mp3|ogg|wav|m4a|webm)$/i.test(d.name) ? [relative(raiz, join(dir, d.name)).split('\\').join('/')] : [],
        );
  const json = (): string => JSON.stringify(listar(raiz).sort());
  return {
    name: 'manifesto-audio',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].endsWith('/audio-manifest.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(json());
        } else next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'audio-manifest.json', source: json() });
    },
  };
}

// base relativo: funciona em GitHub Pages (usuario.github.io/repo/) sem ajuste
export default defineConfig({
  base: './',
  plugins: [manifestoAudio()],
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  // Servidor de desenvolvimento em rede local e pelo túnel do ngrok (celular). Recarrega sozinho ao salvar.
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app', '.ngrok.io', 'localhost'],
  },
  // Pré-visualização do build (npm run build && npm run preview), mesmos hosts liberados.
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app', '.ngrok.io', 'localhost'],
  },
});
