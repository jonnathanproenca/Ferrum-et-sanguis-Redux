// Sprites dos gladiadores da arena (um conjunto de poses por classe), gerados a partir das folhas de arte.
// Âncora (ax, ay): ponto do chão sob o gladiador, em pixels do próprio quadro.

export interface QuadroSprite {
  arquivo: string;
  w: number;
  h: number;
  ax: number;
  ay: number;
}

export type Pose =
  | 'guarda' | 'respira' | 'prepara' | 'impacto' | 'recupera' | 'alt' | 'defende'
  | 'empurrao' | 'esquiva' | 'dano' | 'critico' | 'cai' | 'morto';

export interface ConjuntoSprites {
  /** Altura do gladiador em guarda, em pixels do quadro; serve de referência de escala. */
  alturaGuarda: number;
  /** Poses disponíveis. As que faltam usam um substituto (ver CorpoSprite). */
  quadros: Partial<Record<Pose, QuadroSprite>>;
}

export const SPRITES_CLASSE: Partial<Record<string, ConjuntoSprites>> = {
  murmilo: {
    alturaGuarda: 243,
    quadros: {
      guarda: { arquivo: 'assets/gladiadores/murmilo/guarda.png', w: 144, h: 242, ax: 65.0, ay: 242.0 },
      respira: { arquivo: 'assets/gladiadores/murmilo/respira.png', w: 144, h: 243, ax: 65.4, ay: 243.0 },
      prepara: { arquivo: 'assets/gladiadores/murmilo/prepara.png', w: 145, h: 239, ax: 65.3, ay: 239.0 },
      impacto: { arquivo: 'assets/gladiadores/murmilo/impacto.png', w: 224, h: 237, ax: 72.7, ay: 237.0 },
      recupera: { arquivo: 'assets/gladiadores/murmilo/recupera.png', w: 144, h: 242, ax: 66.5, ay: 242.0 },
      defende: { arquivo: 'assets/gladiadores/murmilo/defende.png', w: 156, h: 231, ax: 66.3, ay: 231.0 },
      empurrao: { arquivo: 'assets/gladiadores/murmilo/empurrao.png', w: 186, h: 234, ax: 71.3, ay: 234.0 },
      esquiva: { arquivo: 'assets/gladiadores/murmilo/esquiva.png', w: 146, h: 231, ax: 61.9, ay: 231.0 },
      dano: { arquivo: 'assets/gladiadores/murmilo/dano.png', w: 205, h: 244, ax: 96.6, ay: 241.0 },
      critico: { arquivo: 'assets/gladiadores/murmilo/critico.png', w: 178, h: 179, ax: 89.8, ay: 177.0 },
      cai: { arquivo: 'assets/gladiadores/murmilo/cai.png', w: 219, h: 208, ax: 109.5, ay: 205.0 },
      morto: { arquivo: 'assets/gladiadores/murmilo/morto.png', w: 243, h: 92, ax: 121.5, ay: 93.0 },
    },
  },
  tracio: {
    alturaGuarda: 274,
    quadros: {
      guarda: { arquivo: 'assets/gladiadores/tracio/guarda.png', w: 160, h: 274, ax: 78.9, ay: 274.0 },
      respira: { arquivo: 'assets/gladiadores/tracio/respira.png', w: 129, h: 274, ax: 75.1, ay: 274.0 },
      prepara: { arquivo: 'assets/gladiadores/tracio/prepara.png', w: 165, h: 279, ax: 83.2, ay: 279.0 },
      impacto: { arquivo: 'assets/gladiadores/tracio/impacto.png', w: 189, h: 277, ax: 77.3, ay: 277.0 },
      recupera: { arquivo: 'assets/gladiadores/tracio/recupera.png', w: 162, h: 273, ax: 83.0, ay: 272.0 },
      defende: { arquivo: 'assets/gladiadores/tracio/defende.png', w: 150, h: 273, ax: 68.4, ay: 272.0 },
      empurrao: { arquivo: 'assets/gladiadores/tracio/empurrao.png', w: 199, h: 263, ax: 73.8, ay: 262.0 },
      esquiva: { arquivo: 'assets/gladiadores/tracio/esquiva.png', w: 177, h: 260, ax: 76.6, ay: 259.0 },
      dano: { arquivo: 'assets/gladiadores/tracio/dano.png', w: 193, h: 275, ax: 121.8, ay: 272.0 },
      critico: { arquivo: 'assets/gladiadores/tracio/critico.png', w: 195, h: 211, ax: 80.8, ay: 211.0 },
      cai: { arquivo: 'assets/gladiadores/tracio/cai.png', w: 268, h: 261, ax: 134.0, ay: 260.0 },
      morto: { arquivo: 'assets/gladiadores/tracio/morto.png', w: 284, h: 109, ax: 142.0, ay: 106.0 },
    },
  },
  samnita: {
    alturaGuarda: 281,
    quadros: {
      respira: { arquivo: 'assets/gladiadores/samnita/respira.png', w: 140, h: 281, ax: 70.1, ay: 281.0 },
      guarda: { arquivo: 'assets/gladiadores/samnita/guarda.png', w: 155, h: 275, ax: 75.7, ay: 275.0 },
      prepara: { arquivo: 'assets/gladiadores/samnita/prepara.png', w: 175, h: 268, ax: 84.5, ay: 268.0 },
      impacto: { arquivo: 'assets/gladiadores/samnita/impacto.png', w: 261, h: 265, ax: 96.9, ay: 265.0 },
      recupera: { arquivo: 'assets/gladiadores/samnita/recupera.png', w: 154, h: 270, ax: 75.2, ay: 269.0 },
      defende: { arquivo: 'assets/gladiadores/samnita/defende.png', w: 159, h: 263, ax: 77.5, ay: 262.0 },
      empurrao: { arquivo: 'assets/gladiadores/samnita/empurrao.png', w: 194, h: 263, ax: 81.7, ay: 262.0 },
      esquiva: { arquivo: 'assets/gladiadores/samnita/esquiva.png', w: 172, h: 259, ax: 104.2, ay: 258.0 },
      dano: { arquivo: 'assets/gladiadores/samnita/dano.png', w: 175, h: 261, ax: 99.8, ay: 259.0 },
      critico: { arquivo: 'assets/gladiadores/samnita/critico.png', w: 145, h: 246, ax: 62.6, ay: 244.0 },
      cai: { arquivo: 'assets/gladiadores/samnita/cai.png', w: 173, h: 228, ax: 86.5, ay: 226.0 },
      morto: { arquivo: 'assets/gladiadores/samnita/morto.png', w: 280, h: 84, ax: 140.0, ay: 82.0 },
    },
  },
  retiario: {
    alturaGuarda: 231,
    quadros: {
      respira: { arquivo: 'assets/gladiadores/retiario/respira.png', w: 251, h: 231, ax: 84.6, ay: 231.0 },
      guarda: { arquivo: 'assets/gladiadores/retiario/guarda.png', w: 240, h: 208, ax: 98.8, ay: 209.0 },
      prepara: { arquivo: 'assets/gladiadores/retiario/prepara.png', w: 250, h: 231, ax: 86.5, ay: 231.0 },
      impacto: { arquivo: 'assets/gladiadores/retiario/impacto.png', w: 280, h: 222, ax: 78.1, ay: 222.0 },
      recupera: { arquivo: 'assets/gladiadores/retiario/recupera.png', w: 242, h: 234, ax: 77.4, ay: 232.0 },
      empurrao: { arquivo: 'assets/gladiadores/retiario/empurrao.png', w: 257, h: 233, ax: 78.8, ay: 232.0 },
      esquiva: { arquivo: 'assets/gladiadores/retiario/esquiva.png', w: 228, h: 221, ax: 104.3, ay: 219.0 },
      dano: { arquivo: 'assets/gladiadores/retiario/dano.png', w: 217, h: 234, ax: 71.9, ay: 243.0 },
      critico: { arquivo: 'assets/gladiadores/retiario/critico.png', w: 201, h: 202, ax: 82.9, ay: 211.0 },
      cai: { arquivo: 'assets/gladiadores/retiario/cai.png', w: 214, h: 188, ax: 107.0, ay: 198.0 },
      morto: { arquivo: 'assets/gladiadores/retiario/morto.png', w: 262, h: 96, ax: 131.0, ay: 88.0 },
      defende: { arquivo: 'assets/gladiadores/retiario/defende.png', w: 234, h: 231, ax: 81.2, ay: 231.0 },
    },
  },
};

export const chaveSprite = (classe: string, pose: Pose, variante = 0): string => (variante ? `spr:${classe}:${pose}:v${variante}` : `spr:${classe}:${pose}`);
