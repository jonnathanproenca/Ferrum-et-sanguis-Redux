/**
 * Esqueleto do gladiador: juntas, poses e animações de luta. Sem Phaser: só dados e matemática,
 * para testar. Ângulos em graus. Sentido: o gladiador olha para a direita (A); para o lado B a cena
 * espelha a figura, então "para a frente" é sempre o mesmo ângulo.
 *   - Ângulo positivo gira no sentido horário da tela: braço para cima e para trás (positivo) ou
 *     para a frente (negativo); coxa para a frente é negativa; canela dobrada para trás é positiva.
 * dx/dy: deslocamento do corpo em pixels de tela (dx positivo = para a frente do gladiador).
 */

export type Junta =
  | 'tronco' | 'pescoco'
  | 'quadrilE' | 'quadrilD' | 'joelhoE' | 'joelhoD' | 'tornozeloE' | 'tornozeloD'
  | 'ombroE' | 'ombroD' | 'cotoveloE' | 'cotoveloD' | 'maoE' | 'maoD';

/** Posição de cada junta na figura (viewbox 120x200). */
export const JUNTA_POS: Record<Junta, { x: number; y: number }> = {
  tronco: { x: 60, y: 110 },
  pescoco: { x: 60, y: 56 },
  quadrilE: { x: 51, y: 110 },
  quadrilD: { x: 69, y: 110 },
  joelhoE: { x: 51, y: 146 },
  joelhoD: { x: 69, y: 146 },
  tornozeloE: { x: 51, y: 178 },
  tornozeloD: { x: 69, y: 178 },
  ombroE: { x: 38, y: 64 },
  ombroD: { x: 82, y: 64 },
  cotoveloE: { x: 31.5, y: 88 },
  cotoveloD: { x: 88.5, y: 88 },
  maoE: { x: 25, y: 112 },
  maoD: { x: 95, y: 112 },
};

/** Junta-pai de cada junta. O tronco é ligado à raiz (origem da figura). */
export const PAI: Record<Junta, Junta | null> = {
  tronco: null,
  pescoco: 'tronco',
  quadrilE: 'tronco',
  quadrilD: 'tronco',
  joelhoE: 'quadrilE',
  joelhoD: 'quadrilD',
  tornozeloE: 'joelhoE',
  tornozeloD: 'joelhoD',
  ombroE: 'tronco',
  ombroD: 'tronco',
  cotoveloE: 'ombroE',
  cotoveloD: 'ombroD',
  maoE: 'cotoveloE',
  maoD: 'cotoveloD',
};

export type Pose = Partial<Record<Junta, number>> & { dx?: number; dy?: number };

/** Pose de guarda: escudo à frente (E), arma em diagonal (D). É a pose de repouso em combate. */
export const GUARDA: Pose = {
  tronco: 0, pescoco: 0,
  quadrilE: 0, quadrilD: 0, joelhoE: 0, joelhoD: 0, tornozeloE: 0, tornozeloD: 0,
  ombroE: -50, cotoveloE: -30, ombroD: -20, cotoveloD: -40, maoE: 0, maoD: 105,
  dx: 0, dy: 0,
};

export interface Quadro {
  /** Tempo do quadro, em ms, a partir do início da animação. */
  t: number;
  pose: Pose;
}

export type TipoGolpe = 'corte' | 'estocada' | 'pesado' | 'soco';

const ARMA_CORTE = ['gladio', 'gladio_largo', 'espada_curta', 'sica', 'machadinha'];
const ARMA_ESTOCADA = ['adaga', 'tridente'];
const ARMA_PESADA = ['maca'];

/** Tipo de golpe pela arma: corte, estocada, golpe pesado (de cima) ou soco sem arma. */
export function tipoDoGolpe(arma: string | null): TipoGolpe {
  if (!arma) return 'soco';
  arma = arma.split('@')[0];
  if (arma.startsWith('basico_arma_')) return arma.endsWith('retiario') ? 'estocada' : 'corte';
  if (ARMA_ESTOCADA.includes(arma)) return 'estocada';
  if (ARMA_PESADA.includes(arma)) return 'pesado';
  if (ARMA_CORTE.includes(arma)) return 'corte';
  return 'corte';
}

/** Golpe do atacante. `impacto` é o instante do contato com o alvo. */
export function quadrosGolpe(tipo: TipoGolpe): { quadros: Quadro[]; impacto: number } {
  const volta = { ...GUARDA };
  // A arma é desenhada "para cima" a partir da mão; maoD (o pulso) a gira.
  // Ângulo final da arma = ombroD + cotoveloD + maoD, medido do alto para a frente (horário).
  switch (tipo) {
    case 'corte':
      return {
        impacto: 340,
        quadros: [
          // arma erguida atrás da cabeça, corpo recuado
          { t: 190, pose: { ombroD: -150, cotoveloD: -20, maoD: 140, tronco: -8, dx: -6 } },
          // arco para a frente: a lâmina varre de cima até a altura do alvo
          { t: 340, pose: { ombroD: -80, cotoveloD: -10, maoD: 190, tronco: 10, dx: 64 } },
          { t: 560, pose: volta },
        ],
      };
    case 'estocada':
      return {
        impacto: 250,
        quadros: [
          // mão recolhida junto ao peito, ponta da arma já apontando para o alvo
          { t: 170, pose: { ombroD: -35, cotoveloD: -95, maoD: 210, tronco: -5, dx: -8 } },
          // braço estendido, arma em linha com ele
          { t: 250, pose: { ombroD: -88, cotoveloD: -4, maoD: 180, tronco: 10, dx: 76 } },
          { t: 460, pose: volta },
        ],
      };
    case 'pesado':
      return {
        impacto: 420,
        quadros: [
          // clava no alto, bem atrás
          { t: 240, pose: { ombroD: -170, cotoveloD: -30, maoD: 180, tronco: -10, dx: -8 } },
          // pancada de cima para baixo na frente do alvo
          { t: 420, pose: { ombroD: -60, cotoveloD: -10, maoD: 180, tronco: 14, dx: 58 } },
          { t: 640, pose: volta },
        ],
      };
    case 'soco':
      return {
        impacto: 210,
        quadros: [
          { t: 120, pose: { ombroD: -60, cotoveloD: -80 } },
          { t: 210, pose: { ombroD: -88, cotoveloD: -2, tronco: 6, dx: 52 } },
          { t: 400, pose: volta },
        ],
      };
  }
}

/** Esquiva: pulo para trás, com as pernas recolhidas no ar e a aterrissagem atrás da posição. */
export function quadrosEsquiva(): Quadro[] {
  return [
    { t: 120, pose: { quadrilE: -40, quadrilD: -30, joelhoE: 55, joelhoD: 50, tronco: -8, ombroD: -30, dx: -18, dy: -26 } },
    { t: 280, pose: { quadrilE: -10, quadrilD: -5, joelhoE: 20, joelhoD: 20, dx: -52, dy: -4 } },
    { t: 440, pose: { quadrilE: 0, quadrilD: 0, joelhoE: 0, joelhoD: 0, tronco: 0, dx: -40, dy: 0 } },
    { t: 580, pose: { ...GUARDA } },
  ];
}

/**
 * Defesa: o escudo (ou a arma, sem escudo) sobe à frente. Com `empurrao`, o golpe empurra
 * o gladiador para trás, em alguns casos.
 */
export function quadrosDefesa(comEscudo: boolean, empurrao: boolean): Quadro[] {
  const bloqueio: Pose = comEscudo
    ? { ombroE: -85, cotoveloE: -15, tronco: -3 }
    : { ombroD: -70, cotoveloD: -60, tronco: -3 };
  const quadros: Quadro[] = [{ t: 140, pose: bloqueio }];
  if (empurrao) quadros.push({ t: 280, pose: { ...bloqueio, dx: -16 } });
  quadros.push({ t: empurrao ? 470 : 340, pose: { ...GUARDA } });
  return quadros;
}

/** Reação ao acerto: o corpo recua e a cabeça vai para trás. Crítico recua mais. */
export function quadrosReacao(critico: boolean): Quadro[] {
  const recuo = critico ? -30 : -14;
  return [
    { t: 110, pose: { tronco: -10, pescoco: -8, cotoveloE: -20, ombroD: 20, maoD: 60, dx: recuo } },
    { t: 300, pose: { tronco: -2, pescoco: -2, dx: recuo / 4 } },
    { t: 480, pose: { ...GUARDA } },
  ];
}

const suave = (k: number): number => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

function mesclar(a: Pose, b: Pose, k: number): Pose {
  const r: Record<string, number> = { ...(a as Record<string, number>) };
  for (const chave of Object.keys(b)) {
    const vb = (b as Record<string, number | undefined>)[chave];
    if (vb === undefined) continue;
    const va = r[chave] ?? 0;
    r[chave] = va + (vb - va) * k;
  }
  return r as Pose;
}

/** Pose no instante `t`, interpolando entre a pose de origem e os quadros (com suavização). */
export function interpolar(origem: Pose, quadros: Quadro[], t: number): Pose {
  let a: Pose = { ...origem };
  let ta = 0;
  for (const q of quadros) {
    if (t <= q.t) {
      return mesclar(a, q.pose, suave((t - ta) / Math.max(1, q.t - ta)));
    }
    a = mesclar(a, q.pose, 1);
    ta = q.t;
  }
  return a;
}

/** Duração total de uma sequência de quadros. */
export function duracao(quadros: Quadro[]): number {
  return quadros.length ? quadros[quadros.length - 1].t : 0;
}
