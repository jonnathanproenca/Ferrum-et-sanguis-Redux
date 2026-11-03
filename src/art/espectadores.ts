// Plateia em pixel art: onde os espectadores sentam em cada arena e como cada um é desenhado.
// Coordenadas em pixels da imagem de fundo (1024x576). Sem Phaser: só dados e sorteio, para testar.

export type Pt = [number, number];

export interface Fileira {
  /** Linha onde ficam os pés dos espectadores (interpolada entre os pontos). */
  pontos: Pt[];
  /** Distância entre espectadores, em px da imagem. */
  passo: number;
  /** Altura de cada espectador, em px da imagem. */
  altura: number;
}

const desloca = (pts: Pt[], dy: number): Pt[] => pts.map(([x, y]) => [x, y + dy] as Pt);
const f = (pontos: Pt[], passo: number, altura: number): Fileira => ({ pontos, passo, altura });

/** Fileiras de cada arena. Pompeia tem 1 fileira de degraus, Cápua 2, Coliseu 3 níveis; o Poço, as sacadas. */
export const FILEIRAS: Record<string, Fileira[]> = {
  pompeia: [
    f([[24, 138], [120, 176], [250, 214], [380, 236], [450, 242]], 34, 26),
    f([[574, 242], [644, 236], [774, 214], [904, 176], [1000, 138]], 34, 26),
  ],
  capua: [
    f([[10, 238], [110, 232], [220, 228], [330, 232], [440, 237]], 27, 20),
    f([[590, 237], [700, 232], [810, 228], [920, 232], [1014, 238]], 27, 20),
    f([[10, 388], [110, 352], [250, 322], [350, 311], [450, 303]], 30, 24),
    f([[580, 303], [680, 311], [790, 322], [900, 352], [1014, 388]], 30, 24),
  ],
  coliseu: [
    ...Array.from({ length: 3 }, (_, k) => f(desloca([[8, 176], [130, 190], [250, 202], [380, 208], [470, 210]], -9 * k), 12, 13)),
    ...Array.from({ length: 3 }, (_, k) => f(desloca([[560, 210], [640, 207], [740, 198], [840, 182], [920, 164]], -9 * k), 12, 13)),
    ...Array.from({ length: 7 }, (_, k) => f(desloca([[10, 376], [100, 362], [200, 348], [300, 338], [420, 330], [470, 328]], -9 * k), 13, 16)),
    ...Array.from({ length: 7 }, (_, k) => f(desloca([[560, 332], [680, 338], [800, 347], [900, 366], [975, 388]], -9 * k), 13, 16)),
  ],
  poco: [
    f([[10, 168], [120, 178], [260, 186], [390, 194]], 36, 38),
    f([[462, 178], [595, 178]], 36, 38),
    f([[640, 194], [720, 182], [800, 168]], 36, 38),
    f([[850, 200], [920, 178], [1010, 158]], 36, 38),
  ],
};

/** Fração dos lugares ocupados por tipo de lotação. */
export const OCUPACAO: Record<string, number> = { vazia: 0.2, meia: 0.55, cheia: 0.97 };

export interface Espectador {
  x: number;
  y: number;
  altura: number;
  /** Semente do visual; a textura é `espectador:<semente>`. */
  semente: number;
  /** Se este espectador se mexe (comemora). */
  anima: boolean;
}

/** Aleatoriedade injetável (Math.random por padrão), para testes determinísticos. */
export type Sorteio = () => number;

function pontoNa(pontos: Pt[], x: number): number {
  for (let i = 1; i < pontos.length; i++) {
    const [x0, y0] = pontos[i - 1];
    const [x1, y1] = pontos[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0);
  }
  return pontos[pontos.length - 1][1];
}

/** Sorteia os espectadores de uma partida: quantos e quem, conforme a lotação. */
export function sortearPlateia(arenaId: string, lotacao: string, rnd: Sorteio = Math.random): Espectador[] {
  const fileiras = FILEIRAS[arenaId] ?? FILEIRAS.coliseu;
  const ocupacao = OCUPACAO[lotacao] ?? 0.5;
  const saida: Espectador[] = [];
  for (const fila of fileiras) {
    const x0 = fila.pontos[0][0];
    const x1 = fila.pontos[fila.pontos.length - 1][0];
    for (let x = x0; x <= x1; x += fila.passo) {
      if (rnd() > ocupacao) continue;
      const px = x + (rnd() - 0.5) * fila.passo * 0.6;
      const py = pontoNa(fila.pontos, px) + (rnd() - 0.5) * 2;
      saida.push({
        x: px,
        y: py,
        altura: fila.altura * (0.92 + rnd() * 0.16),
        semente: Math.floor(rnd() * VARIANTES),
        anima: rnd() < 0.3,
      });
    }
  }
  // De trás para a frente: quem está mais abaixo na tela cobre quem está acima.
  return saida.sort((a, b) => a.y - b.y);
}

export const VARIANTES = 48;

const PELES = ['#f0c9a0', '#d9a577', '#b87a4b', '#8a5634'];
const CABELOS = ['#2a1a10', '#5a3418', '#8a6a3a', '#c9c9c0', '#111111', '#a04a22'];
const TUNICAS = ['#e8dcc0', '#b33a2c', '#3b6ea5', '#4f8a4a', '#d6a92e', '#7a4a8a', '#8a5a34', '#2d2d38', '#d8d0b4', '#c46a2a'];

/** Largura e altura (em "pixels de arte") do sprite do espectador. */
export const SPRITE = { w: 8, h: 14 };

/** Desenha um espectador de 8x14 pixels de arte num canvas pequeno (ampliado depois sem suavização). */
export function desenharEspectador(semente: number, quadro: 0 | 1 = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPRITE.w;
  c.height = SPRITE.h;
  const g = c.getContext('2d');
  if (!g) return c;
  const pele = PELES[semente % PELES.length];
  const cabelo = CABELOS[Math.floor(semente / 4) % CABELOS.length];
  const tunica = TUNICAS[Math.floor(semente / 3) % TUNICAS.length];
  const tunica2 = TUNICAS[(Math.floor(semente / 2) + 3) % TUNICAS.length];
  const px = (x: number, y: number, w: number, h: number, cor: string): void => {
    g.fillStyle = cor;
    g.fillRect(x, y, w, h);
  };
  // pernas e sandálias
  px(2, 11, 2, 3, pele);
  px(4, 11, 2, 3, pele);
  px(2, 13, 2, 1, '#3a2514');
  px(4, 13, 2, 1, '#3a2514');
  // túnica
  px(1, 6, 6, 5, tunica);
  px(1, 9, 6, 1, tunica2);
  // braços: no quadro 1 ficam para cima (comemorando)
  if (quadro === 1) {
    px(0, 2, 1, 5, pele);
    px(7, 2, 1, 5, pele);
  } else {
    px(0, 6, 1, 4, pele);
    px(7, 6, 1, 4, pele);
  }
  // cabeça e cabelo
  px(2, 2, 4, 4, pele);
  px(2, 1, 4, 2, cabelo);
  if (semente % 5 === 0) px(2, 5, 4, 1, cabelo); // barba
  px(3, 4, 1, 1, '#1a1008');
  px(5, 4, 1, 1, '#1a1008');
  return c;
}
