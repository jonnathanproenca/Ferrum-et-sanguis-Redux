// Variação de cores dos gladiadores: as folhas de sprite têm uma cor só por classe, então cada gladiador
// recebe uma variante (tom de pele e cor do tecido: escudo, crista, tanga) sorteada pelo id, só por código.

export interface VarianteCor {
  /** Rotação de matiz (graus) aplicada ao tecido: escudo, crista e tanga. */
  rot: number;
  /** Fator de brilho aplicado à pele (1 = original). */
  pele: number;
}

export const VARIANTES_COR: VarianteCor[] = [
  { rot: 0, pele: 1 },
  { rot: 120, pele: 0.86 },
  { rot: 200, pele: 0.72 },
  { rot: 270, pele: 1.1 },
  { rot: 335, pele: 0.8 },
  { rot: 60, pele: 0.94 },
];

/** Variante estável para um gladiador (mesmo id, mesma cor, em qualquer luta). */
export function varianteDe(id: string): number {
  if (id === "campeao-batiatus") return 0;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % VARIANTES_COR.length;
}

function rgbParaHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

function hsvParaRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Recolore os pixels (RGBA) no lugar. Metal (pouca saturação) e ouro ficam como estão. */
export function recolorir(pixels: Uint8ClampedArray, variante: VarianteCor): void {
  if (variante.rot === 0 && variante.pele === 1) return;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 8) continue;
    const [h, s, v] = rgbParaHsv(pixels[i], pixels[i + 1], pixels[i + 2]);
    const tecido =
      (s > 0.35 && (h < 14 || h > 340)) || // vermelhos
      (s > 0.3 && h >= 190 && h <= 340) || // azuis e roxos
      (s > 0.35 && h >= 14 && h <= 40 && v < 0.5); // marrons escuros
    const pele = !tecido && s >= 0.2 && s <= 0.7 && h >= 8 && h <= 36 && v >= 0.5;
    let nh = h;
    let nv = v;
    if (tecido) nh = (h + variante.rot) % 360;
    else if (pele) nv = Math.min(1, v * variante.pele);
    else continue;
    const [r, g, b] = hsvParaRgb(nh, s, nv);
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  }
}
