import { VARIANTES_COR, recolorir } from './variantes';

// Pipeline de pixel art 16 bits: reduz a imagem para uma grade de blocos,
// quantiza as cores (5 bits por canal, como nos consoles de 16 bits) e amplia sem suavização.

const cache = new Map<string, string>();

/** Transforma um SVG em data URL, pronto para <img src>. */
export function svgParaUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function novoCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Pixeliza uma fonte de imagem: `bloco` pixels da fonte viram 1 pixel da grade. */
export function pixelizar(fonte: CanvasImageSource, w: number, h: number, bloco: number): HTMLCanvasElement {
  const pw = Math.max(1, Math.round(w / bloco));
  const ph = Math.max(1, Math.round(h / bloco));
  const pequeno = novoCanvas(pw, ph);
  const ctxP = pequeno.getContext('2d');
  if (!ctxP) return novoCanvas(w, h);
  ctxP.imageSmoothingEnabled = true;
  ctxP.drawImage(fonte, 0, 0, pw, ph);

  const dados = ctxP.getImageData(0, 0, pw, ph);
  const px = dados.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) {
      px[i + 3] = 0;
      continue;
    }
    // 5 bits por canal, com os bits altos replicados para manter o brilho.
    for (let c = 0; c < 3; c++) {
      const v = px[i + c] & 0xf8;
      px[i + c] = v | (v >> 5);
    }
    px[i + 3] = 255;
  }
  ctxP.putImageData(dados, 0, 0);

  const saida = novoCanvas(w, h);
  const ctxS = saida.getContext('2d');
  if (!ctxS) return saida;
  ctxS.imageSmoothingEnabled = false;
  ctxS.drawImage(pequeno, 0, 0, w, h);
  return saida;
}

/** Pixeliza todas as <img data-pixel> dentro de `raiz`. Atributos: data-origem, data-w, data-h, data-bloco. */
export function pixelarImagens(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLImageElement>('img[data-pixel]:not([data-pixelado])').forEach((img) => {
    img.dataset.pixelado = '1';
    const origem = img.dataset.origem ?? img.src;
    const w = Number(img.dataset.w) || 120;
    const h = Number(img.dataset.h) || 200;
    const bloco = Number(img.dataset.bloco) || 3;
    const chave = `${w}x${h}x${bloco}:${origem}`;
    const pronto = cache.get(chave);
    if (pronto) {
      img.src = pronto;
      return;
    }
    const fonte = new Image();
    fonte.onload = () => {
      const url = pixelizar(fonte, w, h, bloco).toDataURL('image/png');
      cache.set(chave, url);
      img.src = url;
    };
    fonte.src = origem;
  });
}

const cacheSprites = new Map<string, string>();

/** Aplica a variante de cor do gladiador (mesma da arena) às <img data-sprite data-variante> dentro de `raiz`. */
export function colorirSprites(raiz: ParentNode): void {
  raiz.querySelectorAll<HTMLImageElement>('img[data-sprite]:not([data-colorido])').forEach((img) => {
    img.dataset.colorido = '1';
    const v = Number(img.dataset.variante) || 0;
    const origem = img.dataset.sprite ?? '';
    if (!v || !origem) return;
    const chave = `${origem}#${v}`;
    const pronto = cacheSprites.get(chave);
    if (pronto) {
      img.src = pronto;
      return;
    }
    const fonte = new Image();
    fonte.onload = () => {
      const c = novoCanvas(fonte.naturalWidth, fonte.naturalHeight);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(fonte, 0, 0);
      const dados = ctx.getImageData(0, 0, c.width, c.height);
      recolorir(dados.data, VARIANTES_COR[v]);
      ctx.putImageData(dados, 0, 0);
      const url = c.toDataURL('image/png');
      cacheSprites.set(chave, url);
      img.src = url;
    };
    fonte.src = origem;
  });
}
