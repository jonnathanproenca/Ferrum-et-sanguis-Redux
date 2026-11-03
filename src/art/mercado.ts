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
  galia: ['assets/gladiadores/escravo/galia.png'],
  germania: ['assets/gladiadores/escravo/germania.png'],
  tracia: ['assets/gladiadores/escravo/tracia.png'],
  dacia: ['assets/gladiadores/escravo/dacia.png'],
  numidia: ['assets/gladiadores/escravo/numidia.png'],
  hispania: ['assets/gladiadores/escravo/hispania.png'],
  siria: ['assets/gladiadores/escravo/siria.png'],
  britania: ['assets/gladiadores/escravo/britania.png'],
};

export function spriteEscravo(terra: string, look: number): string {
  const lista = SPRITES_ESCRAVO[terra] ?? SPRITES_ESCRAVO.galia;
  return lista[look % lista.length];
}
