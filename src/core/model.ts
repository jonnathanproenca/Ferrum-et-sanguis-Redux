import { Rng } from './rng';
import { criarLutador, type Fighter, type Stats, type TipoEfeito } from './combat';
import classesJson from '../data/classes.json';
import itensJson from '../data/itens.json';
import origensJson from '../data/origens.json';

export type ClasseId = 'murmilo' | 'retiario' | 'tracio' | 'samnita';
export type Atributo = keyof Stats;
export type OrigemTipo = 'escravo' | 'livre';
export type Slot = 'arma' | 'acessorio' | 'elmo' | 'peito' | 'pe' | 'calca';
export type Equipamento = Record<Slot, string | null>;

export const CLASSES_IDS: ClasseId[] = ['murmilo', 'retiario', 'tracio', 'samnita'];
export const ATRIBUTOS: Atributo[] = ['forca', 'agilidade', 'vitalidade', 'sorte'];
export const SLOTS: Slot[] = ['arma', 'acessorio', 'elmo', 'peito', 'pe', 'calca'];
export const NOME_SLOT: Record<Slot, string> = {
  arma: 'Arma',
  acessorio: 'Escudo / acessório',
  elmo: 'Elmo',
  peito: 'Peitoral',
  pe: 'Calçado',
  calca: 'Calça',
};
export const NOME_ATRIBUTO: Record<Atributo, string> = {
  forca: 'Força',
  agilidade: 'Agilidade',
  vitalidade: 'Vitalidade',
  sorte: 'Sorte',
};

export interface ClasseDef {
  nome: string;
  papel: string;
  descricao: string;
  passiva: string;
  passivaNome: string;
  passivaDescricao: string;
  stats: Stats;
}
export const CLASSES = classesJson as unknown as Record<ClasseId, ClasseDef>;

export interface Item {
  /** Id completo: "base" (qualidade 0) ou "base@N" (qualidade N). */
  id: string;
  nome: string;
  slot: Slot;
  peso?: string;
  bonus: Partial<Stats>;
  classes: ClasseId[];
  preco: number;
  /** Item básico do kit inicial: não dá bônus, só evolui com a qualidade. */
  basico?: boolean;
  qualidade: number;
}

type ItemBase = Omit<Item, 'qualidade' | 'id'> & { id: string };
export const ITENS = itensJson as unknown as ItemBase[] as Item[];

/** Qualidades: normal, superior, rara, épica, lendária (cinza, verde, azul, roxo, laranja). */
export const QUALIDADES = ['Normal', 'Superior', 'Rara', 'Épica', 'Lendária'];
export const COR_QUALIDADE = ['#9aa0a6', '#4caf50', '#3d8bfd', '#a855f7', '#ff9f1a'];
export const COR_QUALIDADE_NUM = [0x9aa0a6, 0x4caf50, 0x3d8bfd, 0xa855f7, 0xff9f1a];
export const QUALIDADE_MAX = QUALIDADES.length - 1;
/** Bônus somado ao atributo principal do slot em cada qualidade. */
export const BONUS_QUALIDADE = [0, 1, 2, 3, 4];
/** Multiplicador do preço do item em cada qualidade. */
export const PRECO_QUALIDADE = [1, 1.5, 2.5, 4, 7];
/** Atributo que a qualidade reforça em cada slot. */
export const FOCO_SLOT: Record<Slot, Atributo> = {
  arma: 'forca',
  acessorio: 'vitalidade',
  elmo: 'sorte',
  peito: 'vitalidade',
  pe: 'agilidade',
  calca: 'agilidade',
};

export function separarId(id: string): { base: string; qualidade: number } {
  const i = id.indexOf('@');
  if (i < 0) return { base: id, qualidade: 0 };
  return { base: id.slice(0, i), qualidade: Math.min(QUALIDADE_MAX, Math.max(0, Number(id.slice(i + 1)) || 0)) };
}
export const comQualidade = (base: string, q: number): string => (q > 0 ? `${base}@${q}` : base);
export const qualidadeDe = (id: string | null): number => (id ? separarId(id).qualidade : 0);

const NOME_BASICO: Record<Slot, Record<ClasseId, string>> = {
  arma: { murmilo: 'Gládio simples', retiario: 'Tridente simples', tracio: 'Sica simples', samnita: 'Gládio simples' },
  acessorio: { murmilo: 'Escudo simples', retiario: 'Rede simples', tracio: 'Escudo pequeno simples', samnita: 'Escudo simples' },
  elmo: { murmilo: 'Elmo simples', retiario: 'Galero simples', tracio: 'Capacete simples', samnita: 'Elmo simples' },
  peito: { murmilo: 'Peitoral simples', retiario: 'Peitoral de couro simples', tracio: 'Peitoral de couro simples', samnita: 'Peitoral simples' },
  pe: { murmilo: 'Botas simples', retiario: 'Sandálias simples', tracio: 'Sandálias simples', samnita: 'Botas simples' },
  calca: { murmilo: 'Perneira simples', retiario: 'Faixa simples', tracio: 'Faixa simples', samnita: 'Perneira simples' },
};

function itemBasico(slot: Slot, classe: ClasseId): ItemBase {
  return {
    id: `basico_${slot}_${classe}`,
    nome: NOME_BASICO[slot][classe],
    slot,
    bonus: {},
    classes: [classe],
    preco: 25,
    basico: true,
  };
}

export function itemPorId(id: string): Item {
  const { base, qualidade } = separarId(id);
  let item: ItemBase | undefined = ITENS.find((i) => i.id === base);
  if (!item) {
    const m = /^basico_(\w+?)_(murmilo|retiario|tracio|samnita)$/.exec(base);
    if (m && SLOTS.includes(m[1] as Slot)) item = itemBasico(m[1] as Slot, m[2] as ClasseId);
  }
  if (!item) throw new Error('Item inexistente.');
  const bonus = { ...item.bonus };
  const foco = FOCO_SLOT[item.slot];
  bonus[foco] = (bonus[foco] ?? 0) + BONUS_QUALIDADE[qualidade];
  if (bonus[foco] === 0) delete bonus[foco];
  return { ...(item as Item), id, bonus, qualidade, preco: Math.round(item.preco * PRECO_QUALIDADE[qualidade]) };
}

export type Estilo = 'curto' | 'longo' | 'raspado' | 'trancas';
export interface Look {
  nome: string;
  pele: string;
  cabelo: string;
  estilo: Estilo;
  barba: 'nenhuma' | 'bigode' | 'barba';
  marca: 'nenhuma' | 'tatuagem' | 'cicatriz';
}
export interface Terra {
  id: string;
  nome: string;
  looks: Look[];
}
export const TERRAS = origensJson as unknown as Terra[];

export function terraPorId(id: string): Terra {
  const t = TERRAS.find((x) => x.id === id);
  if (!t) throw new Error('Origem inexistente.');
  return t;
}

/** Tudo que o desenho do gladiador precisa saber. */
export interface Aparencia {
  terra: string;
  look: number;
  classe: ClasseId;
  campeao: boolean;
  equipamento: Equipamento;
}

/** Efeito que persiste no gladiador até ser tratado. Severidade de 1 a 3. */
export interface EfeitoPersistente {
  tipo: TipoEfeito;
  severidade: number;
}

export interface Gladiador {
  id: string;
  nome: string;
  classe: ClasseId;
  origem: OrigemTipo;
  terra: string;
  look: number;
  campeao: boolean;
  /** Vitórias suficientes para virar lenda: +1 em todos os atributos e não pode ser vendido. */
  lenda: boolean;
  nivel: number;
  xp: number;
  /** Pontos de treino acumulados, por atributo. */
  treino: Stats;
  equipamento: Equipamento;
  vivo: boolean;
  /** Já lutou no Poço: fica proibido de lutar nas arenas de honra. */
  pocoOnly: boolean;
  vitorias: number;
  vitoriasPoco: number;
  derrotas: number;
  efeitos: EfeitoPersistente[];
  /** Escravo recém-recrutado: ainda sem estilo, sem equipamento e fora das arenas até escolher um estilo. */
  semEstilo?: boolean;
  /** Atributo em que o escravo é naturalmente forte (já somado ao treino inicial). */
  tendencia?: Atributo;
  /** Condição física do escravo no mercado. */
  condicao?: Condicao;
}

export type Condicao = 'jovem' | 'maduro' | 'cicatrizado';

export const NOME_CONDICAO: Record<Condicao, string> = { jovem: 'Jovem', maduro: 'Maduro', cicatrizado: 'Cicatrizado' };
export const DESC_CONDICAO: Record<Condicao, string> = {
  jovem: '+1 treino em atributo aleatório, mais caro',
  maduro: 'equilibrado',
  cicatrizado: '+1 vitalidade, mais barato',
};
/** Ajuste de preço de cada condição, em ouro. */
const PRECO_CONDICAO: Record<Condicao, number> = { jovem: 20, maduro: 0, cicatrizado: -20 };
export const TENDENCIA_PONTOS = 2;

const NOMES = [
  'Ático', 'Brenno', 'Cássio', 'Dárdano', 'Espúrio', 'Flávio', 'Gracco', 'Hélvio', 'Ícaro', 'Juba',
  'Lúcio', 'Márcio', 'Nério', 'Otávio', 'Pacato', 'Rúfio', 'Sabino', 'Túlio', 'Vário', 'Xantipo',
];

function equipamentoVazio(): Equipamento {
  return { arma: null, acessorio: null, elmo: null, peito: null, pe: null, calca: null };
}

/**
 * Kit inicial: um item básico por slot (sem bônus), para o gladiador nunca aparecer na arena com peça que não tinha.
 * `qualMax` > 0 (rivais fortes) sorteia qualidade de 0 até qualMax em cada peça.
 */
export function sortearEquipamento(rng: Rng, classe: ClasseId, qualMax = 0): Equipamento {
  const eq = equipamentoVazio();
  for (const slot of SLOTS) {
    const q = qualMax > 0 ? rng.int(0, qualMax) : 0;
    eq[slot] = comQualidade(`basico_${slot}_${classe}`, q);
  }
  return eq;
}

/** Escravos têm poucos pontos de treino (qualidade variável); livres já vêm progredidos. */
export function gerarGladiador(
  rng: Rng,
  id: string,
  classe: ClasseId,
  nivel: number,
  origem: OrigemTipo,
  campeao = false,
  qualMax = 0,
): Gladiador {
  const treino: Stats = { forca: 0, agilidade: 0, vitalidade: 0, sorte: 0 };
  const pontos = origem === 'livre' ? (nivel - 1) * 2 + rng.int(0, 2) : rng.int(0, 2);
  for (let i = 0; i < pontos; i++) {
    treino[ATRIBUTOS[rng.int(0, ATRIBUTOS.length - 1)]] += 1;
  }
  const terra = TERRAS[rng.int(0, TERRAS.length - 1)];
  return {
    id,
    nome: NOMES[rng.int(0, NOMES.length - 1)],
    classe,
    origem,
    terra: terra.id,
    look: rng.int(0, 3),
    campeao,
    lenda: false,
    nivel,
    xp: 0,
    treino,
    equipamento: sortearEquipamento(rng, classe, qualMax),
    vivo: true,
    pocoOnly: false,
    vitorias: 0,
    vitoriasPoco: 0,
    derrotas: 0,
    efeitos: [],
  };
}

/** Escravo do mercado: sem estilo e sem equipamento, com uma tendência de atributo, terra e condição física. */
export function gerarEscravo(rng: Rng, id: string): Gladiador {
  const g = gerarGladiador(rng, id, 'murmilo', 1, 'escravo');
  g.semEstilo = true;
  g.equipamento = equipamentoVazio();
  const tendencia = ATRIBUTOS[rng.int(0, ATRIBUTOS.length - 1)];
  g.tendencia = tendencia;
  g.treino[tendencia] += TENDENCIA_PONTOS;
  const condicoes: Condicao[] = ['jovem', 'maduro', 'cicatrizado'];
  const condicao = condicoes[rng.int(0, condicoes.length - 1)];
  g.condicao = condicao;
  if (condicao === 'jovem') g.treino[ATRIBUTOS[rng.int(0, ATRIBUTOS.length - 1)]] += 1;
  if (condicao === 'cicatrizado') g.treino.vitalidade += 1;
  return g;
}

export function atualizarNivel(g: Gladiador): void {
  g.nivel = Math.max(g.nivel, 1 + Math.floor(g.xp / 50));
}

export function somaTreino(g: Gladiador): number {
  return ATRIBUTOS.reduce((total, a) => total + g.treino[a], 0);
}

export function aparenciaDe(g: Gladiador): Aparencia {
  return {
    terra: g.terra,
    look: g.look,
    classe: g.classe,
    campeao: g.campeao,
    equipamento: g.equipamento,
  };
}

/** Penalidade de cada efeito persistente sobre os atributos. */
const PENALIDADE_EFEITO: Record<TipoEfeito, Atributo> = {
  sangramento: 'vitalidade',
  envenenamento: 'agilidade',
  contusao: 'forca',
  queimadura: 'sorte',
};

/**
 * Atributos finais: classe + nível + treino + itens equipados + especialidade do lanista (+2)
 * + favor do campeão (+2) + bônus de campanha − efeitos persistentes do Poço.
 */
export function statsDoGladiador(g: Gladiador, especialidade?: ClasseId, extra: Partial<Stats> = {}): Stats {
  const base = CLASSES[g.classe].stats;
  const s: Stats = {
    forca: base.forca + g.nivel - 1,
    agilidade: base.agilidade,
    vitalidade: base.vitalidade + g.nivel - 1,
    sorte: base.sorte,
  };
  for (const a of ATRIBUTOS) {
    s[a] += g.treino[a] + (especialidade === g.classe ? 2 : 0) + (g.campeao ? 2 : 0) + (g.lenda ? 1 : 0) + (extra[a] ?? 0);
  }
  for (const slot of SLOTS) {
    const id = g.equipamento[slot];
    if (!id) continue;
    const item = itemPorId(id);
    for (const a of ATRIBUTOS) s[a] += item.bonus[a] ?? 0;
  }
  for (const ef of g.efeitos) {
    s[PENALIDADE_EFEITO[ef.tipo]] -= ef.severidade;
  }
  for (const a of ATRIBUTOS) s[a] = Math.max(1, s[a]);
  return s;
}

export function paraLutador(g: Gladiador, especialidade?: ClasseId, extra: Partial<Stats> = {}): Fighter {
  return criarLutador(
    g.id,
    g.nome,
    statsDoGladiador(g, especialidade, extra),
    CLASSES[g.classe].passiva,
  );
}

export function precoGladiador(g: Gladiador): number {
  return g.origem === 'livre'
    ? 220 + g.nivel * 40 + somaTreino(g) * 15
    : Math.max(30, 60 + somaTreino(g) * 15 + (g.condicao ? PRECO_CONDICAO[g.condicao] : 0));
}

export function precoTroca(g: Gladiador): number {
  return (g.origem === 'livre' ? 300 : 100) + g.nivel * 20;
}

export function custoTratamento(g: Gladiador): number {
  return g.efeitos.reduce((total, ef) => total + ef.severidade * 30, 0);
}
