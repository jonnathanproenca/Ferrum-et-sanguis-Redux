// Cena do ludus: imagem base (casa crua, só o pátio) e uma camada recortada por melhoria.
// As posições vêm de public/assets/ludus/camadas.json (gerado junto com as imagens), em pixels da imagem.
import type { MelhoriaId } from '../core/game';

export const LUDUS_IMG = { w: 1024, h: 572, base: 'assets/ludus/base.png' };

export interface Camada {
  x: number;
  y: number;
  w: number;
  h: number;
  arquivo: string;
}

export const CAMADAS_LUDUS: Record<MelhoriaId, Camada> = {
  armaria: { x: 139, y: 299, w: 204, h: 154, arquivo: 'assets/ludus/armaria.png' },
  refeitorio: { x: 639, y: 307, w: 64, h: 72, arquivo: 'assets/ludus/refeitorio.png' },
  alojamentos: { x: 741, y: 291, w: 52, h: 72, arquivo: 'assets/ludus/alojamentos.png' },
  enfermaria: { x: 431, y: 289, w: 76, h: 80, arquivo: 'assets/ludus/enfermaria.png' },
  palus: { x: 722, y: 346, w: 284, h: 224, arquivo: 'assets/ludus/palus.png' },
};

/** Portão de ferro do canto esquerdo: área clicável para ir ao mercado ou às arenas. */
export const PORTAO_LUDUS = { x: 0, y: 335, w: 92, h: 182 };

/** Sprite: imagem e tamanho de exibição, em pixels da imagem do ludus. A âncora é o centro dos pés. */
export interface Sprite {
  arquivo: string;
  w: number;
  h: number;
}

/** Gladiadores do pátio (folha de sprites do ludus); cada gladiador do jogador usa um deles. */
export const SPRITES_GLADIADOR: Sprite[] = [
  { arquivo: 'assets/ludus/s10.png', w: 44, h: 83 },
  { arquivo: 'assets/ludus/s11.png', w: 46, h: 82 },
  { arquivo: 'assets/ludus/s12.png', w: 62, h: 67 },
  { arquivo: 'assets/ludus/s13.png', w: 45, h: 72 },
  { arquivo: 'assets/ludus/s14.png', w: 62, h: 68 },
  { arquivo: 'assets/ludus/s15.png', w: 41, h: 79 },
  { arquivo: 'assets/ludus/s04.png', w: 32, h: 75 },
  { arquivo: 'assets/ludus/s05.png', w: 39, h: 71 },
  { arquivo: 'assets/ludus/s06.png', w: 63, h: 71 },
  { arquivo: 'assets/ludus/s07.png', w: 49, h: 68 },
  { arquivo: 'assets/ludus/s08.png', w: 42, h: 77 },
  { arquivo: 'assets/ludus/s09.png', w: 51, h: 68 },
];

/** Doutor do ludus: anda pelo pátio e estala o chicote. Olha para a direita. */
export const SPRITE_DOCTORE: Sprite = { arquivo: 'assets/ludus/s02.png', w: 42, h: 68 };

/** Guardas da varanda (sempre presentes): sprite, centro x e pé y na imagem. */
export const GUARDAS_VARANDA: { sprite: Sprite; x: number; y: number }[] = [
  { sprite: { arquivo: 'assets/ludus/s00.png', w: 40, h: 81 }, x: 352, y: 237 },
  { sprite: { arquivo: 'assets/ludus/s01.png', w: 38, h: 77 }, x: 580, y: 237 },
  { sprite: { arquivo: 'assets/ludus/s00.png', w: 40, h: 81 }, x: 704, y: 237 },
];

/** Lugar do lanista da casa no balcão (atrás do guarda-corpo): centro x, pé y e altura. */
export const LANISTA_VARANDA = { x: 510, y: 237, altura: 80 };

/** Guarda-corpo da varanda: três trechos (entre os pilares) desenhados por cima de quem está no balcão. */
export const GUARDACORPO: { arquivo: string; x: number; y: number; w: number }[] = [
  { arquivo: 'assets/ludus/guardacorpo-1.png', x: 197, y: 194, w: 216 },
  { arquivo: 'assets/ludus/guardacorpo-2.png', x: 428, y: 194, w: 193 },
  { arquivo: 'assets/ludus/guardacorpo-3.png', x: 637, y: 194, w: 231 },
];

/** Palus e bonecos de treino (aparecem com a melhoria): sprite, centro x e pé y na imagem. */
export const TREINO_PATIO: { sprite: Sprite; x: number; y: number }[] = [
  { sprite: { arquivo: 'assets/ludus/s17.png', w: 63, h: 78 }, x: 772, y: 440 },
  { sprite: { arquivo: 'assets/ludus/s16.png', w: 72, h: 105 }, x: 846, y: 478 },
  { sprite: { arquivo: 'assets/ludus/s17.png', w: 63, h: 78 }, x: 952, y: 548 },
];

/** Pontos do pátio onde os gladiadores treinam: centro x e pé y, em pixels da imagem. */
export const PONTOS_PATIO: [number, number][] = [
  [330, 505], [455, 478], [585, 508], [650, 462], [262, 470], [395, 450], [520, 545], [200, 540],
];
