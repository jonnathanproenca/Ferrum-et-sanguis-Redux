// Cena do mercado de escravos (aba Mercado): fundo estático + mercador respirando (WebP animado em loop).
// Posições em pixels da imagem de fundo (1376x768).
export const MERCADO = {
  w: 1376,
  h: 768,
  fundo: 'assets/mercado/fundo.jpg',
  mercador: { arquivo: 'assets/mercado/mercador.webp', x: 428, y: 287, w: 264, h: 305 },
};
/**
 * Sprites dos escravos sem estilo, por terra de origem. Cada terra pode ter várias aparências
 * (o `look` do gladiador escolhe uma); basta acrescentar arquivos à lista.
 */
export const SPRITES_ESCRAVO: Record<string, string[]> = {
  galia: ['assets/gladiadores/escravo/galia.png', 'assets/gladiadores/escravo/galia-v2.png', 'assets/gladiadores/escravo/galia-v3.png'],
  germania: ['assets/gladiadores/escravo/germania.png', 'assets/gladiadores/escravo/germania-v2.png', 'assets/gladiadores/escravo/germania-v3.png'],
  tracia: ['assets/gladiadores/escravo/tracia.png', 'assets/gladiadores/escravo/tracia-v2.png', 'assets/gladiadores/escravo/tracia-v3.png'],
  dacia: ['assets/gladiadores/escravo/dacia.png', 'assets/gladiadores/escravo/dacia-v2.png', 'assets/gladiadores/escravo/dacia-v3.png'],
  numidia: ['assets/gladiadores/escravo/numidia.png', 'assets/gladiadores/escravo/numidia-v2.png', 'assets/gladiadores/escravo/numidia-v3.png'],
  hispania: ['assets/gladiadores/escravo/hispania.png', 'assets/gladiadores/escravo/hispania-v2.png', 'assets/gladiadores/escravo/hispania-v3.png'],
  siria: ['assets/gladiadores/escravo/siria.png', 'assets/gladiadores/escravo/siria-v2.png', 'assets/gladiadores/escravo/siria-v3.png'],
  britania: ['assets/gladiadores/escravo/britania.png', 'assets/gladiadores/escravo/britania-v2.png', 'assets/gladiadores/escravo/britania-v3.png'],
};

/** A condição física escolhe a aparência: Jovem usa o rosto jovem, Cicatrizado o envelhecido e Maduro o adulto. */
const APARENCIA_POR_CONDICAO: Record<string, number> = { maduro: 0, cicatrizado: 1, jovem: 2 };

export function spriteEscravo(terra: string, look: number, condicao?: string): string {
  const lista = SPRITES_ESCRAVO[terra] ?? SPRITES_ESCRAVO.galia;
  const idx = condicao !== undefined && condicao in APARENCIA_POR_CONDICAO ? APARENCIA_POR_CONDICAO[condicao] : look;
  return lista[idx % lista.length];
}
