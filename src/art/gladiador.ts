import { terraPorId, type Aparencia, type Equipamento, type Look } from '../core/model';

/**
 * Desenho do gladiador em partes. Cada parte é um pedaço do corpo (ou um item) desenhado
 * no mesmo sistema de coordenadas do viewbox 120x200. A cena monta cada parte como uma imagem
 * ligada a uma junta (ombro, cotovelo, quadril, joelho...), então o corpo articula de verdade.
 * svgGladiador junta as partes na pose de guarda: é a mesma figura usada nos cards.
 */

export type ParteId =
  | 'capa' | 'tronco' | 'coxaE' | 'canelaE' | 'peE' | 'coxaD' | 'canelaD' | 'peD'
  | 'bracoE' | 'antebracoE' | 'escudo' | 'bracoD' | 'antebracoD' | 'arma' | 'cabeca';

/** Ordem de desenho quando a figura é estática (cards e miniaturas). */
const ORDEM_ESTATICA: ParteId[] = [
  'capa', 'coxaE', 'canelaE', 'peE', 'coxaD', 'canelaD', 'peD', 'tronco',
  'bracoE', 'antebracoE', 'escudo', 'bracoD', 'antebracoD', 'arma', 'cabeca',
];

export const PARTES_GLADIADOR: ParteId[] = ORDEM_ESTATICA;

const C = {
  couro: '#7a4a24',
  couroEsc: '#3e2412',
  bronze: '#b08a4a',
  bronzeEsc: '#5a3e16',
  ferro: '#a9b0b8',
  ferroEsc: '#4a4f56',
  vermelho: '#8a1c1c',
  vermelhoEsc: '#4a0e0e',
  ouro: '#e2b04a',
  la: '#c9b48a',
  olho: '#2a1a10',
};

function cabeca(L: Look): string {
  let s = '';
  if (L.estilo === 'longo' || L.estilo === 'trancas') {
    s += `<path d="M46 32 Q43 62 50 72 L70 72 Q77 62 74 32 Z" fill="${L.cabelo}"/>`;
  }
  s += `<rect x="55" y="44" width="10" height="13" fill="${L.pele}"/>`;
  s += `<ellipse cx="60" cy="34" rx="13" ry="15" fill="${L.pele}"/>`;
  s += `<circle cx="55" cy="33" r="1.7" fill="${C.olho}"/><circle cx="65" cy="33" r="1.7" fill="${C.olho}"/>`;
  s += `<path d="M55 29 L58 28.5 M62 28.5 L65 29" stroke="${C.olho}" stroke-width="1.2"/>`;
  s += `<path d="M60 35 L58.5 40 L61.5 40" fill="none" stroke="#7a4a2a" stroke-width="1"/>`;
  s += `<path d="M56 45 Q60 46.5 64 45" stroke="#7a2a2a" stroke-width="1.2" fill="none"/>`;

  if (L.estilo === 'curto' || L.estilo === 'longo') {
    s += `<path d="M46 30 Q47 16 60 16 Q73 16 74 30 Q68 23 60 23 Q52 23 46 30 Z" fill="${L.cabelo}"/>`;
  } else if (L.estilo === 'raspado') {
    s += `<path d="M47 28 Q60 18 73 28 Q60 24 47 28 Z" fill="${L.cabelo}"/>`;
  } else {
    s += `<path d="M46 30 Q47 16 60 16 Q73 16 74 30 Q68 23 60 23 Q52 23 46 30 Z" fill="${L.cabelo}"/>`;
    s += `<path d="M47 33 Q41 46 45 58 M73 33 Q79 46 75 58" stroke="${L.cabelo}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }

  if (L.barba === 'bigode') {
    s += `<path d="M54 42 Q60 38 66 42 Q60 45 54 42 Z" fill="${L.cabelo}"/>`;
  } else if (L.barba === 'barba') {
    s += `<path d="M47 36 Q48 54 60 56 Q72 54 73 36 Q70 46 60 47 Q50 46 47 36 Z" fill="${L.cabelo}"/>`;
  }

  if (L.marca === 'cicatriz') s += `<path d="M66 27 L70 37" stroke="#b05a4a" stroke-width="1.4"/>`;
  return s;
}

function marcasCorpo(L: Look): string {
  if (L.marca !== 'tatuagem') return '';
  return `<path d="M48 70 L52 90 M70 72 L66 96 M44 94 L50 102 M76 92 L72 104" stroke="#2a1a10" stroke-width="1.2" opacity="0.6" fill="none"/>`;
}

function peitoral(id: string | null): string {
  switch (id) {
    case 'peito_leve':
      return `<path d="M40 62 L72 110 M80 62 L48 110" stroke="${C.couro}" stroke-width="3.5" fill="none"/>
        <path d="M42 104 L78 104" stroke="${C.couroEsc}" stroke-width="4"/>`;
    case 'peito_couro':
      return `<path d="M41 62 Q60 56 79 62 L76 108 Q60 112 44 108 Z" fill="${C.couro}" stroke="${C.couroEsc}" stroke-width="1.5"/>
        <path d="M46 74 L74 74 M45 88 L75 88" stroke="${C.couroEsc}" stroke-width="1"/>`;
    case 'peito_medio':
      return `<path d="M40 60 Q60 54 80 60 L78 110 Q60 114 42 110 Z" fill="${C.bronze}" stroke="${C.bronzeEsc}" stroke-width="1.5"/>
        <path d="M60 66 L60 106" stroke="${C.bronzeEsc}" stroke-width="1.2"/>
        <circle cx="50" cy="72" r="1.5" fill="${C.bronzeEsc}"/><circle cx="70" cy="72" r="1.5" fill="${C.bronzeEsc}"/>`;
    case 'peito_pesado':
      return `<path d="M38 62 Q60 54 82 62 L80 112 Q60 116 40 112 Z" fill="${C.ferro}" stroke="${C.ferroEsc}" stroke-width="1.5"/>
        <path d="M60 64 L60 110 M44 84 L76 84" stroke="${C.ferroEsc}" stroke-width="1"/>`;
    default:
      return '';
  }
}

function acessorio(id: string | null): string {
  switch (id) {
    case 'escudo_grande':
      return `<rect x="6" y="74" width="30" height="68" rx="5" fill="${C.vermelho}" stroke="${C.ouro}" stroke-width="2"/>
        <rect x="11" y="80" width="20" height="56" rx="3" fill="none" stroke="${C.vermelhoEsc}" stroke-width="1.5"/>
        <circle cx="21" cy="108" r="6" fill="${C.ferro}" stroke="${C.ferroEsc}"/>`;
    case 'escudo_quadrado':
      return `<rect x="8" y="84" width="26" height="48" fill="#5a2a1a" stroke="${C.bronze}" stroke-width="2"/>
        <path d="M21 84 L21 132 M8 108 L34 108" stroke="${C.bronze}" stroke-width="2"/>`;
    case 'escudo_oval':
      return `<ellipse cx="20" cy="106" rx="14" ry="26" fill="#6a3a1a" stroke="${C.bronze}" stroke-width="2"/>
        <ellipse cx="20" cy="106" rx="5" ry="8" fill="${C.bronze}"/>`;
    case 'escudo_redondo_pequeno':
      return `<circle cx="18" cy="104" r="13" fill="#5a4a2a" stroke="${C.ouro}" stroke-width="2"/>
        <circle cx="18" cy="104" r="4.5" fill="${C.ferro}"/>`;
    case 'rede':
      return `<path d="M8 94 L36 94 L22 144 Z" fill="none" stroke="${C.ferro}" stroke-width="1.2"/>
        <path d="M14 104 L30 104 M11 112 L33 112 M16 122 L28 122 M22 94 L22 144 M16 96 L26 128 M28 96 L18 128" stroke="${C.ferro}" stroke-width="0.8" opacity="0.8"/>
        <circle cx="22" cy="146" r="4" fill="${C.ferroEsc}"/>`;
    default:
      return '';
  }
}

function arma(id: string | null): string {
  switch (id) {
    case 'gladio_largo':
      return `<line x1="95" y1="112" x2="109" y2="30" stroke="${C.ferro}" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="89" y1="110" x2="101" y2="108" stroke="${C.bronze}" stroke-width="4" stroke-linecap="round"/>`;
    case 'gladio':
      return `<line x1="95" y1="112" x2="106" y2="58" stroke="${C.ferro}" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="90" y1="110" x2="100" y2="108" stroke="${C.bronze}" stroke-width="4" stroke-linecap="round"/>`;
    case 'espada_curta':
      return `<line x1="95" y1="112" x2="104" y2="74" stroke="${C.ferro}" stroke-width="5.5" stroke-linecap="round"/>
        <line x1="90" y1="110" x2="100" y2="108" stroke="${C.bronze}" stroke-width="4" stroke-linecap="round"/>`;
    case 'maca':
      return `<line x1="95" y1="112" x2="101" y2="72" stroke="${C.couro}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="101" cy="64" r="8" fill="${C.ferroEsc}" stroke="${C.ferro}" stroke-width="1.5"/>`;
    case 'tridente':
      return `<line x1="95" y1="112" x2="102" y2="34" stroke="${C.couro}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M97 34 L97 16 M102 34 L102 12 M107 34 L107 16 M97 30 L107 30" stroke="${C.ferro}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    case 'adaga':
      return `<line x1="95" y1="112" x2="101" y2="94" stroke="${C.ferro}" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'sica':
      return `<path d="M95 112 Q114 96 104 62" stroke="${C.ferro}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'machadinha':
      return `<line x1="95" y1="112" x2="100" y2="72" stroke="${C.couro}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M99 72 L110 64 L108 80 Z" fill="${C.ferro}" stroke="${C.ferroEsc}" stroke-width="1"/>`;
    default:
      return '';
  }
}

function elmo(id: string | null): string {
  switch (id) {
    case 'elmo_murmilo':
      return `<path d="M45 38 Q44 13 60 12 Q76 13 75 38 L75 44 L45 44 Z" fill="${C.ferro}" stroke="${C.ferroEsc}" stroke-width="1.5"/>
        <path d="M47 36 L73 36 L71 41 L49 41 Z" fill="${C.ferroEsc}"/>
        <path d="M49 16 Q60 0 71 16 L60 14 Z" fill="${C.vermelho}"/>`;
    case 'elmo_viseira':
      return `<path d="M44 38 Q44 12 60 11 Q76 12 76 38 L76 52 L44 52 Z" fill="${C.bronze}" stroke="${C.bronzeEsc}" stroke-width="1.5"/>
        <path d="M48 33 L72 33 L70 37 L50 37 Z" fill="${C.olho}"/>
        <path d="M44 42 L50 42 L50 52 L44 52 Z M70 42 L76 42 L76 52 L70 52 Z" fill="${C.bronzeEsc}"/>
        <path d="M60 11 L60 3" stroke="${C.vermelho}" stroke-width="3"/>`;
    case 'capacete_frigio':
      return `<path d="M46 30 Q50 4 76 12 Q66 20 66 30 Z" fill="${C.vermelho}" stroke="${C.vermelhoEsc}" stroke-width="1.2"/>
        <path d="M44 30 Q60 24 76 30" stroke="${C.couro}" stroke-width="3" fill="none"/>`;
    case 'galero':
      return `<path d="M44 27 Q60 20 76 27" stroke="${C.couro}" stroke-width="4" fill="none"/>
        <path d="M28 62 Q40 54 46 62 L46 76 L30 76 Z" fill="${C.couro}" stroke="${C.couroEsc}" stroke-width="1.2"/>`;
    default:
      return '';
  }
}

/** Uma perna (lado 'E' = esquerda da tela, 'D' = direita): coxa, canela e pé, cada um com a sua peça. */
function perna(lado: 'E' | 'D', eq: Equipamento, pele: string): { coxa: string; canela: string; pe: string } {
  const x0 = lado === 'E' ? 46 : 64;
  const x1 = x0 + 10;
  let coxa = `<rect x="${x0}" y="110" width="10" height="38" fill="${pele}"/>`;
  let canela = `<rect x="${x0}" y="146" width="10" height="32" fill="${pele}"/>`;
  let pe = '';
  if (eq.calca === 'perneira_couro') {
    coxa += `<path d="M${x0 - 1} 114 L${x1 + 1} 114 L${x1 + 1} 150 L${x0 - 1} 150 Z" fill="${C.couro}" stroke="${C.couroEsc}" stroke-width="1"/>`;
  } else if (eq.calca === 'faixa_coxa') {
    coxa += `<path d="M${x0 - 1} 132 L${x1 + 1} 132" stroke="${C.couro}" stroke-width="4"/>
      <path d="M${x0 - 1} 142 L${x1 + 1} 142" stroke="${C.couroEsc}" stroke-width="2"/>`;
  }
  if (eq.pe === 'bota_legionaria') {
    canela += `<path d="M${x0 - 2} 148 L${x1 + 2} 148 L${x1 + 2} 180 L${x0 - 2} 180 Z" fill="${C.couro}" stroke="${C.couroEsc}" stroke-width="1"/>
      <path d="M${x0 - 4} 178 L${x1 + 2} 178" stroke="${C.couroEsc}" stroke-width="3"/>`;
  } else if (eq.pe === 'greva_bronze') {
    canela += `<path d="M${x0 - 1} 138 L${x1 + 1} 138 L${x1 + 1} 176 L${x0 - 1} 176 Z" fill="${C.bronze}" stroke="${C.bronzeEsc}" stroke-width="1.2"/>
      <path d="M${x0 - 1} 150 L${x1 + 1} 150" stroke="${C.bronzeEsc}" stroke-width="1"/>`;
  } else if (eq.pe === 'sandalia') {
    pe += `<path d="M${x0 - 5} 178 L${x1 + 2} 178 L${x1 + 2} 182 L${x0 - 5} 182 Z" fill="${C.couroEsc}"/>
      <path d="M${x0 - 2} 170 L${x0 + 6} 176" stroke="${C.couro}" stroke-width="2"/>`;
  }
  return { coxa, canela, pe };
}

/** Um braço: parte de cima (ombro até cotovelo, com pauldron) e antebraço (cotovelo até a mão). */
function braco(lado: 'E' | 'D', peito: string | null, pele: string): { alto: string; baixo: string } {
  const ombro = lado === 'E' ? 38 : 82;
  const cotovelo = lado === 'E' ? 31.5 : 88.5;
  const mao = lado === 'E' ? 25 : 95;
  let alto = `<line x1="${ombro}" y1="64" x2="${cotovelo}" y2="88" stroke="${pele}" stroke-width="9" stroke-linecap="round"/>`;
  if (peito === 'peito_pesado') {
    const cx = lado === 'E' ? 36 : 84;
    alto += `<circle cx="${cx}" cy="64" r="7" fill="${C.ferro}" stroke="${C.ferroEsc}"/>`;
  }
  const baixo = `<line x1="${cotovelo}" y1="88" x2="${mao}" y2="112" stroke="${pele}" stroke-width="9" stroke-linecap="round"/>
    <circle cx="${mao}" cy="114" r="5" fill="${pele}"/>`;
  return { alto, baixo };
}

function tronco(L: Look, eq: Equipamento, pele: string): string {
  let s = `<path d="M38 60 Q60 52 82 60 L78 112 Q60 116 42 112 Z" fill="${pele}"/>`;
  s += marcasCorpo(L);
  s += peitoral(eq.peito);
  if (eq.calca === 'calcao') {
    s += `<path d="M42 108 L78 108 L80 130 L40 130 Z" fill="${C.la}"/>
      <path d="M41 124 L79 124" stroke="${C.vermelho}" stroke-width="3"/>`;
  } else {
    s += `<path d="M44 108 L76 108" stroke="${pele}" stroke-width="1"/>`;
  }
  return s;
}

/** Peças do gladiador, cada uma com o seu conteúdo SVG (sem <svg>). Vazio = a peça não existe. */
export function partesGladiador(ap: Aparencia): Record<ParteId, string> {
  const L = terraPorId(ap.terra).looks[ap.look];
  const eq = ap.equipamento;
  const pele = L.pele;
  const pe = perna('E', eq, pele);
  const pd = perna('D', eq, pele);
  const bE = braco('E', eq.peito, pele);
  const bD = braco('D', eq.peito, pele);
  const capa = ap.campeao
    ? `<path d="M38 58 Q60 48 82 58 L98 182 Q60 194 22 182 Z" fill="${C.ouro}" stroke="#6a4a10" stroke-width="2"/>
      <path d="M46 62 L40 176 M74 62 L80 176" stroke="#9a7020" stroke-width="1.5" opacity="0.7"/>`
    : '';
  return {
    capa,
    tronco: tronco(L, eq, pele),
    coxaE: pe.coxa,
    canelaE: pe.canela,
    peE: pe.pe,
    coxaD: pd.coxa,
    canelaD: pd.canela,
    peD: pd.pe,
    bracoE: bE.alto,
    antebracoE: bE.baixo,
    escudo: acessorio(eq.acessorio),
    bracoD: bD.alto,
    antebracoD: bD.baixo,
    arma: arma(eq.arma),
    cabeca: cabeca(L) + elmo(eq.elmo),
  };
}

/** Envolve um conteúdo SVG no viewbox do gladiador. */
export function svgParte(conteudo: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" width="120" height="200">${conteudo}</svg>`;
}

/** Figura inteira estática (cards, miniaturas, escalação). */
export function svgGladiador(ap: Aparencia): string {
  const p = partesGladiador(ap);
  return svgParte(ORDEM_ESTATICA.map((id) => p[id]).join(''));
}

/** Nome de exibição do personagem: tribo/tipo + origem. */
export function nomeAparencia(ap: Aparencia): string {
  const t = terraPorId(ap.terra);
  return `${t.looks[ap.look].nome} (${t.nome})`;
}
