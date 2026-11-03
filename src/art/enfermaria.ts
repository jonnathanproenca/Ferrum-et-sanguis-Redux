// Cena da enfermaria (aba Enfermaria): fundo estático (porta aberta para o pátio) + médico respirando (WebP animado em loop)
// + brilho da luz do pátio e da tocha. Posições em pixels da imagem de fundo (1376x768).
export const ENFERMARIA = {
  w: 1376,
  h: 768,
  fundo: 'assets/enfermaria/fundo.jpg',
  medico: { arquivo: 'assets/enfermaria/medico.webp', x: 598, y: 316, w: 245, h: 333 },
  /** Luz do sol entrando pela porta (retângulo no chão) e tocha da parede. */
  luzPorta: { x: 930, y: 500, w: 330, h: 120 },
  tocha: { x: 250, y: 322, r: 70 },
};
