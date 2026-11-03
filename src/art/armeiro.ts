// Cena da forja (aba Armeiro): fundo estático + brilho + brasa + ferreiro martelando, em camadas (WebP animados).
// Posições e tamanhos em pixels da imagem de fundo (1376x768).

export const FORJA = {
  w: 1376,
  h: 768,
  fundo: 'assets/armeiro/fundo.jpg',
  /** Brasa de carvão na boca da fornalha (WebP animado com transparência, 72 quadros a ~24 fps, loop contínuo). */
  fogo: { arquivo: 'assets/armeiro/brasa.webp', x: 116, y: 381, w: 150, h: 74 },
  /** Ferreiro martelando (WebP animado com transparência, 64 quadros a ~24 fps, loop de 2,7 s; já inclui as faíscas). */
  ferreiro: { arquivo: 'assets/armeiro/ferreiro.webp', x: 557, y: 180, w: 590, h: 458 },
};
