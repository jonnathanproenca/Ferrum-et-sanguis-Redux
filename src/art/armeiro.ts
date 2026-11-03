// Cena da forja (aba Armeiro): fundo estático + fogo + ferreiro martelando (animação com faíscas), em camadas.
// Posições em pixels da imagem de fundo (1376x768). Cada camada animada é uma tira de quadros lado a lado.
// `sequencia` lista os quadros (de 1) na ordem de exibição; `fps` é o tempo de cada passo.

export interface CamadaAnimada {
  arquivo: string;
  x: number;
  y: number;
  w: number;
  h: number;
  quadros: number;
}

export const FORJA = {
  w: 1376,
  h: 768,
  fundo: 'assets/armeiro/fundo.jpg',
  /** Fogo e brasa na boca da fornalha (8 quadros em loop). */
  fogo: { arquivo: 'assets/armeiro/fogo.png', x: 121, y: 322, w: 140, h: 130, quadros: 8, fps: 10, sequencia: [1, 2, 3, 4, 5, 6, 7, 8] },
  /** Ferreiro martelando (WebP animado com transparência, 64 quadros a ~24 fps, loop de 2,7 s; já inclui as faíscas). */
  ferreiro: { arquivo: 'assets/armeiro/ferreiro.webp', x: 557, y: 180, w: 590, h: 458 },
};
