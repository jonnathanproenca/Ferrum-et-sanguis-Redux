import { Rng } from './rng';
import {
  RENDICAO_PADRAO,
  simularEquipes,
  type EfeitoAplicado,
  type Evento,
  type Fighter,
  type Stats,
  type TipoEfeito,
} from './combat';
import {
  aparenciaDe,
  ATRIBUTOS,
  statsDoGladiador,
  atualizarNivel,
  CLASSES,
  CLASSES_IDS,
  custoTratamento,
  gerarGladiador,
  gerarEscravo,
  sortearEquipamento,
  itemPorId,
  separarId,
  comQualidade,
  QUALIDADE_MAX,
  ITENS,
  paraLutador,
  precoGladiador,
  precoTroca,
  SLOTS,
  type Aparencia,
  type Atributo,
  type ClasseId,
  type Gladiador,
  type OrigemTipo,
  type Slot,
} from './model';
import lanistasJson from '../data/lanistas.json';
import arenasJson from '../data/arenas.json';
import campanhaJson from '../data/campanha.json';

// ---------- Dados ----------

export type TipoBonus =
  | 'campeaoNivel' | 'precoEscravo' | 'statsTodos' | 'patrocinio' | 'ouroInicial'
  | 'precoUpgrade' | 'manutencao' | 'ouroArena' | 'ouroPoco';

/** Bônus próprio de cada lanista, aplicado a quem escolhe esta casa. */
export interface BonusLanista {
  nome: string;
  descricao: string;
  tipo: TipoBonus;
  /** Multiplicador (ex.: 0.8 = −20%), quantidade ou nível, conforme o tipo. */
  valor: number;
  atributo?: Atributo;
}

export interface Lanista {
  id: string;
  nome: string;
  especialidade: ClasseId;
  /** Apresentação na tela de escolha. */
  titulo?: string;
  historia?: string;
  /** Texto curto dos tipos de gladiador em que é especialista. */
  especializacao?: string;
  bonus?: BonusLanista;
}
export const LANISTAS = lanistasJson as unknown as Lanista[];

export interface Arena {
  id: string;
  nome: string;
  plateia: string;
  honra: boolean;
  arte: string;
  efeitos?: TipoEfeito[];
  recompensaOuro: [number, number];
  /** Batalhas já disputadas nas arenas para liberar esta (fama do ludus). */
  batalhasMin: number;
  /** Acréscimo de dificuldade sobre a arena anterior (0.2 = +20%); no Poço, sobre a base. */
  dificuldade: number;
}
export const ARENAS = arenasJson as unknown as Arena[];

export type TipoRequisito = 'vitoriasTotais' | 'gladiadorVitorias' | 'gladiadorPoco' | 'gladiadorEquipado';
export interface Requisito {
  tipo: TipoRequisito;
  valor?: number;
  classe?: ClasseId;
  item?: string;
}
export interface RegraPasso {
  nome: string;
  descricao: string;
  bonus: Partial<Stats>;
  efeitosPoco: boolean;
  letal: boolean;
}
export interface Passo {
  titulo: string;
  /** 1 = contra 1; 2 = 2 contra 2. */
  formato?: number;
  requisitos: Requisito[];
  regra: RegraPasso;
}
export const PASSOS = (campanhaJson as unknown as { passos: Passo[] }).passos;

const OURO_INICIAL = 300;
const ENERGIA_TURNO = 3;
export const MAX_GLADIADORES = 12;
const CUSTO_BASE = 10;
const CUSTO_POR_GLADIADOR = 5;
const CUSTO_POR_GLADIADOR_REFEITORIO = 3;
/** Quantos gladiadores o ludus comporta antes de construir os alojamentos. */
export const CAPACIDADE_BASE = 4;

export type MelhoriaId = 'palus' | 'enfermaria' | 'armaria' | 'alojamentos' | 'refeitorio';

export interface MelhoriaLudus {
  id: MelhoriaId;
  nome: string;
  custo: number;
  /** O que a melhoria muda no jogo. */
  efeito: string;
}

/** O ludus começa cru, só com o pátio: cada seção é uma melhoria comprada com ouro. */
export const MELHORIAS_LUDUS: MelhoriaLudus[] = [
  { id: 'palus', nome: 'Palus e bonecos de treino', custo: 200, efeito: 'Permite treinar os atributos dos gladiadores.' },
  { id: 'enfermaria', nome: 'Enfermaria', custo: 300, efeito: 'Permite tratar os efeitos deixados pelo Poço.' },
  { id: 'armaria', nome: 'Armaria', custo: 350, efeito: 'Abre o armeiro: compra e troca de equipamentos.' },
  { id: 'alojamentos', nome: 'Alojamentos', custo: 500, efeito: `Amplia o ludus de ${CAPACIDADE_BASE} para ${MAX_GLADIADORES} gladiadores.` },
  { id: 'refeitorio', nome: 'Refeitório', custo: 250, efeito: `Reduz a manutenção por gladiador de ${CUSTO_POR_GLADIADOR} para ${CUSTO_POR_GLADIADOR_REFEITORIO} de ouro.` },
];
const PRECO_TREINO = 20;
const TREINO_MAXIMO = 10;
const MAX_LOG = 40;

const NOME_EFEITO: Record<TipoEfeito, string> = {
  sangramento: 'Sangramento',
  envenenamento: 'Envenenamento',
  contusao: 'Contusão',
  queimadura: 'Queimadura',
};

// ---------- Estado ----------

export interface Estado {
  versao: 4;
  semente: number;
  casaId: string;
  ouro: number;
  energia: number;
  turno: number;
  proximoId: number;
  vitoriasTotais: number;
  /** Batalhas disputadas nas arenas (vitórias ou derrotas). Ausente em saves antigos. */
  batalhasTotais?: number;
  /** Índice do próximo passo da campanha (0 até PASSOS.length). */
  campanha: number;
  /** Gladiadores libertos: podem voltar como adversários em recriações de luta. */
  libertados: Gladiador[];
  config: Config;
  gladiadores: Gladiador[];
  mercado: Gladiador[];
  /** Itens comprados e não equipados. Cada entrada é o id de um item. */
  inventario: string[];
  /** Ofertas do armeiro mestre nesta rodada (ids com qualidade). Ausente em saves antigos. */
  armeiroMestre?: string[];
  /** Campeão de cada lanista rival, gerado uma vez por partida. */
  campeoesRivais: Record<string, Gladiador>;
  /** Lanistas derrotados na campanha (não voltam a aparecer como opção). */
  derrotados?: string[];
  /** Seções do ludus já construídas. Ausente em saves antigos (a leitura libera tudo). */
  melhorias?: Partial<Record<MelhoriaId, boolean>>;
  /** Os três lanistas oferecidos para o passo atual. */
  opcoesLanista?: string[];
  /** Lanista escolhido pelo jogador para o passo atual. */
  escolhaLanista?: string | null;
  /** Tópicos do tutorial já vistos. Ausente em saves antigos. */
  tutorial?: { vistos: string[] };
  /** Cheat mode (destravado na seleção de lanista): ajuda para testar as funções sem jogar. */
  cheats?: Partial<Cheats>;
  log: string[];
}

export type Dificuldade = 'facil' | 'medio' | 'dificil' | 'extremo';
export const DIFICULDADES_ORDEM: Dificuldade[] = ['facil', 'medio', 'dificil', 'extremo'];

export interface RegrasDificuldade {
  nome: string;
  /** Vitórias para virar campeão (0 = o primeiro gladiador já começa campeão). */
  campeao: number;
  /** Vitórias totais para virar lenda. */
  lenda: number;
  /** Lutas como lenda até a liberdade (null = nunca é libertado). */
  liberdade: number | null;
  /** Multiplicador dos preços de itens, upgrades e gladiadores. */
  precos: number;
  /** Força dos rivais em Pompeia e quanto cada arena acima soma (multiplica o acréscimo do arenas.json). */
  arenaBase: number;
  arenaFator: number;
  resumo: string;
}

export const REGRAS: Record<Dificuldade, RegrasDificuldade> = {
  facil: { nome: 'Fácil', campeao: 0, lenda: 3, liberdade: null, precos: 0.8, arenaBase: 0.9, arenaFator: 0.6,
    resumo: 'Já começa com campeão. Lenda com 3 vitórias. Nunca é libertado. Preços −20%, rivais mais fracos.' },
  medio: { nome: 'Médio', campeao: 3, lenda: 9, liberdade: null, precos: 1, arenaBase: 1, arenaFator: 1,
    resumo: 'Campeão com 3 vitórias, lenda com 9. Nunca é libertado. Preços e rivais padrão.' },
  dificil: { nome: 'Difícil', campeao: 6, lenda: 15, liberdade: 30, precos: 1.25, arenaBase: 1.1, arenaFator: 1.25,
    resumo: 'Campeão com 6 vitórias, lenda com 15. Libertado após 30 lutas como lenda. Preços +25%, rivais mais fortes.' },
  extremo: { nome: 'Extremo', campeao: 15, lenda: 45, liberdade: 5, precos: 1.6, arenaBase: 1.25, arenaFator: 1.6,
    resumo: 'Campeão com 15 vitórias, lenda com 45. Libertado após só 5 lutas como lenda. Preços +60%, rivais brutais.' },
};

export interface Cheats {
  ouro: boolean;
  vida: boolean;
  vencer: boolean;
  pular: boolean;
  lendario: boolean;
  energia: boolean;
  round: boolean;
  campanha: boolean;
}
export const CHEATS_NOMES: Record<keyof Cheats, string> = {
  ouro: 'Dinheiro infinito',
  vida: 'Vida infinita (ninguém morre nem fica ferido)',
  vencer: 'Ganhar toda luta automaticamente',
  pular: 'Pular luta sem perder recompensa',
  lendario: '100% itens lendários no armeiro',
  energia: 'Energia infinita',
  round: 'Pular rodada sem gastar energia',
  campanha: 'Ignorar as condições da campanha (pular todos os passos)',
};

/** A dificuldade é escolhida ao criar o ludus e não muda. Saves antigos jogam no Médio. */
export interface Config {
  dificuldade: Dificuldade;
}
export const CONFIG_PADRAO: Config = { dificuldade: 'medio' };

export function regrasDe(e: Estado): RegrasDificuldade {
  return REGRAS[e.config?.dificuldade ?? 'medio'] ?? REGRAS.medio;
}

export interface LutadorVisual {
  id: string;
  nome: string;
  classe: ClasseId;
  hpMax: number;
  aparencia: Aparencia;
}

export interface PayloadLuta {
  titulo: string;
  arenaNome: string;
  arte: string;
  plateia: string;
  lutadoresA: LutadorVisual[];
  lutadoresB: LutadorVisual[];
  eventos: Evento[];
  vitoriaA: boolean;
  efeitosNovos: string[];
  resumo: string;
  /** Chave da trilha sonora da luta (arena, 'poco' ou 'campanha:<id do lanista>'). */
  trilha: string;
  /** Marcos da luta: lenda e liberdade. */
  marcos: string[];
  /** Ouro ganho na luta (0 em derrota). */
  ouro: number;
  /** Poço: bônus percentual pela lotação sorteada (0 nas demais arenas). */
  bonusPct: number;
  /** Poço: moedas lançadas pela plateia ao fim da luta (0 em derrota ou fora do Poço). */
  moedas: number;
}

export type LotacaoPoco = 'vazia' | 'meia' | 'cheia';

/** Lotação do Poço: bônus (%) e faixa de moedas que a plateia joga. */
export const LOTACOES_POCO: Record<LotacaoPoco, { bonus: number; moedas: [number, number] }> = {
  vazia: { bonus: 10, moedas: [3, 4] },
  meia: { bonus: 20, moedas: [5, 9] },
  cheia: { bonus: 30, moedas: [10, 20] },
};

const LOTACOES_ORDEM: LotacaoPoco[] = ['vazia', 'meia', 'cheia'];

export interface Desafio {
  /** Rival fixo deste passo, conforme a sequência da casa. */
  lanista: Lanista;
  /** Sequência completa da campanha desta casa (para mostrar o progresso). */
  sequencia: Lanista[];
  passo: Passo;
  indice: number;
  requisitos: { texto: string; ok: boolean }[];
  pronto: boolean;
}


// ---------- Utilitários internos ----------

function proximoRng(e: Estado): Rng {
  const mestre = new Rng(e.semente);
  e.semente = mestre.int(1, 2147483646);
  return new Rng(mestre.int(1, 2147483646));
}

function novoId(e: Estado): string {
  return `g${e.proximoId++}`;
}

function registrar(e: Estado, mensagem: string): void {
  e.log.unshift(mensagem);
  if (e.log.length > MAX_LOG) e.log.length = MAX_LOG;
}

function achar(e: Estado, id: string): Gladiador {
  const g = e.gladiadores.find((x) => x.id === id);
  if (!g) throw new Error('Gladiador inexistente.');
  return g;
}

function exigirVivo(g: Gladiador): void {
  if (!g.vivo) throw new Error(`${g.nome} está morto.`);
}

/** Confere energia e ouro antes de gastar qualquer um dos dois. */
function pagar(e: Estado, energia: number, ouro: number): void {
  const c = e.cheats ?? {};
  if (!c.energia && e.energia < energia) throw new Error('Energia insuficiente neste turno.');
  if (!c.ouro && e.ouro < ouro) throw new Error('Ouro insuficiente.');
  if (!c.energia) e.energia -= energia;
  if (!c.ouro) e.ouro -= ouro;
}

/** Bônus da casa do jogador, se for do tipo pedido. */
function bonusDaCasa(e: Estado, tipo: TipoBonus): BonusLanista | undefined {
  const b = LANISTAS.find((x) => x.id === e.casaId)?.bonus;
  return b && b.tipo === tipo ? b : undefined;
}

/** Atributos extras que a casa dá a todos os seus gladiadores. */
export function extraDaCasa(e: Estado): Partial<Stats> {
  const b = bonusDaCasa(e, 'statsTodos');
  return b?.atributo ? { [b.atributo]: b.valor } : {};
}

/** Preço de recrutamento no mercado, com o bônus da casa (escravos mais baratos, por exemplo). */
export function precoRecruta(e: Estado, g: Gladiador): number {
  const b = bonusDaCasa(e, 'precoEscravo');
  const preco = Math.round(precoGladiador(g) * regrasDe(e).precos);
  return b && g.origem === 'escravo' ? Math.round(preco * b.valor) : preco;
}

/** Preço de um item do armeiro na dificuldade da partida. */
export function precoItem(e: Estado, item: { preco: number }): number {
  return Math.round(item.preco * regrasDe(e).precos);
}

/** Preço de trocar o estilo de um gladiador na dificuldade da partida. */
export function precoTrocaEstilo(e: Estado, g: Gladiador): number {
  return Math.round(precoTroca(g) * regrasDe(e).precos);
}

/** Custo de uma melhoria do ludus, com o bônus da casa. */
export function custoMelhoria(e: Estado, id: MelhoriaId): number {
  const b = bonusDaCasa(e, 'precoUpgrade');
  const custo = Math.round(melhoriaPorId(id).custo * regrasDe(e).precos);
  return b ? Math.round(custo * b.valor) : custo;
}

export function lanistaDaCasa(e: Estado): Lanista {
  const l = LANISTAS.find((x) => x.id === e.casaId);
  if (!l) throw new Error('Lanista inexistente.');
  return l;
}

/** Multiplicador de força dos rivais: cada arena de honra soma seu percentual por cima da anterior. */
export function multiplicadorArena(arena: Arena, dif: Dificuldade = 'medio'): number {
  const r = REGRAS[dif];
  if (!arena.honra) return r.arenaBase * (1 + arena.dificuldade * r.arenaFator);
  let m = r.arenaBase;
  for (const a of ARENAS.filter((x) => x.honra)) {
    m *= 1 + a.dificuldade * r.arenaFator;
    if (a.id === arena.id) break;
  }
  return m;
}

export function batalhasDoLudus(e: Estado): number {
  return e.batalhasTotais ?? e.vitoriasTotais;
}

/** Arena liberada pela fama: só se luta numa arena melhor depois de muitas batalhas (vitórias ou não). */
export function arenaLiberada(e: Estado, arena: Arena): { liberada: boolean; faltam: number } {
  const faltam = Math.max(0, arena.batalhasMin - batalhasDoLudus(e));
  return { liberada: faltam === 0, faltam };
}

export function arenaPorId(id: string): Arena {
  const a = ARENAS.find((x) => x.id === id);
  if (!a) throw new Error('Arena inexistente.');
  return a;
}

/** Os dois últimos rivais da campanha, sempre nesta ordem, qualquer que seja o lanista do jogador. */
export const FINAIS: Lanista[] = [
  { id: 'batiatus', nome: 'Lêntulo Batiatus', especialidade: 'murmilo', titulo: 'O lanista de Cápua', historia: 'Dono do ludus mais temido da Campânia, só enfrenta quem já provou valor.' },
  { id: 'espartaco', nome: 'Espártaco', especialidade: 'tracio', titulo: 'O campeão invicto', historia: 'Trácio que a arena não conseguiu quebrar. O último desafio da sua carreira.' },
];

function hashTexto(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Sequência fixa da campanha de cada lanista: os rivais vêm numa ordem própria da casa e a
 * campanha termina sempre com Batiatus e, por último, Espártaco.
 */
export function sequenciaCampanha(casaId: string): Lanista[] {
  const outros = LANISTAS.filter((l) => l.id !== casaId);
  const rng = new Rng(hashTexto(casaId));
  for (let i = outros.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [outros[i], outros[j]] = [outros[j], outros[i]];
  }
  return [...outros.slice(0, PASSOS.length - FINAIS.length), ...FINAIS];
}

/** Lanistas rivais, na ordem em que enfrentam o jogador na campanha. */
export function filaLanistas(e: Estado): Lanista[] {
  return sequenciaCampanha(e.casaId);
}

// ---------- Partida ----------

export function novoJogo(semente: number = Date.now() % 2147483646, casaId?: string, config?: Partial<Config>): Estado {
  const e: Estado = {
    versao: 4,
    semente: semente || 1,
    casaId: '',
    ouro: OURO_INICIAL,
    energia: ENERGIA_TURNO,
    turno: 1,
    proximoId: 1,
    vitoriasTotais: 0,
    campanha: 0,
    libertados: [],
    config: { ...CONFIG_PADRAO },
    gladiadores: [],
    mercado: [],
    inventario: [],
    campeoesRivais: {},
    melhorias: {},
    log: [],
  };
  if (config) definirConfig(e, config);
  const rng = proximoRng(e);
  const sorteado = LANISTAS[rng.int(0, LANISTAS.length - 1)].id;
  e.casaId = casaId && LANISTAS.some((l) => l.id === casaId) ? casaId : sorteado;
  const casa = lanistaDaCasa(e);
  const bOuro = bonusDaCasa(e, 'ouroInicial');
  if (bOuro) e.ouro += bOuro.valor;
  const nivelCampeao = 4 + (bonusDaCasa(e, 'campeaoNivel')?.valor ?? 0);

  e.gladiadores.push(gerarGladiador(rng, novoId(e), casa.especialidade, nivelCampeao, 'livre', regrasDe(e).campeao === 0));
  for (const l of filaLanistas(e)) {
    const nivel = l.id === 'batiatus' ? 6 : l.id === 'espartaco' ? 8 : 4;
    e.campeoesRivais[l.id] = gerarGladiador(rng, `campeao-${l.id}`, l.especialidade, nivel, 'livre', true);
  }
  gerarMercado(e);
  gerarArmeiroMestre(e);
  registrar(e, `Você comanda ${casa.nome}, casa de ${CLASSES[casa.especialidade].nome}. Dificuldade ${regrasDe(e).nome}: ${regrasDe(e).campeao === 0 ? 'seu primeiro gladiador já é o campeão' : `com ${regrasDe(e).campeao} vitórias, um deles será o campeão`}.`);
  return e;
}

/** O mercado só vende escravos: sem estilo, com tendência de atributo, terra e condição. O estilo se escolhe depois. */
export function gerarMercado(e: Estado): void {
  const rng = proximoRng(e);
  e.mercado = [];
  for (let i = 0; i < 5; i++) e.mercado.push(gerarEscravo(rng, novoId(e)));
}

/** Chance de cada qualidade nas ofertas do armeiro mestre: Superior (verde) comum, Rara (azul), Épica (roxo), Lendária (laranja) rara. */
export const CHANCE_MESTRE: { qualidade: number; chance: number }[] = [
  { qualidade: 1, chance: 0.6 },
  { qualidade: 2, chance: 0.25 },
  { qualidade: 3, chance: 0.11 },
  { qualidade: 4, chance: 0.04 },
];

export function sortearQualidadeMestre(r: number): number {
  let acc = 0;
  for (const { qualidade, chance } of CHANCE_MESTRE) {
    acc += chance;
    if (r < acc) return qualidade;
  }
  return CHANCE_MESTRE[0].qualidade;
}

/** Quantas peças o armeiro mestre oferece por rodada. */
export const PECAS_MESTRE = 5;
/** Máximo de peças de cada qualidade (1 a 4) numa mesma rodada. */
export const LIMITE_QUALIDADE_MESTRE: Record<number, number> = { 1: 3, 2: 2, 3: 2, 4: 1 };
/** Máximo de peças Superiores (verdes) lado a lado. */
export const MAX_VERDES_SEGUIDOS = 2;

/**
 * Sorteia as qualidades de uma rodada do armeiro mestre, na ordem em que aparecem, respeitando os limites:
 * no máximo 3 verdes (e nunca 3 seguidas), 2 azuis, 2 roxas e 1 laranja. Dentro do que sobra permitido, vale a chance de cada qualidade.
 */
export function sortearQualidadesMestre(proximo: () => number, n = PECAS_MESTRE): number[] {
  const res: number[] = [];
  const cont: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let i = 0; i < n; i++) {
    const verdesSeguidos = res.length >= MAX_VERDES_SEGUIDOS && res.slice(-MAX_VERDES_SEGUIDOS).every((q) => q === 1);
    const permitidas = CHANCE_MESTRE.filter(
      ({ qualidade }) => cont[qualidade] < LIMITE_QUALIDADE_MESTRE[qualidade] && !(qualidade === 1 && verdesSeguidos),
    );
    const total = permitidas.reduce((t, x) => t + x.chance, 0);
    let r = proximo() * total;
    let escolhida = permitidas[permitidas.length - 1].qualidade;
    for (const { qualidade, chance } of permitidas) {
      if (r < chance) {
        escolhida = qualidade;
        break;
      }
      r -= chance;
    }
    cont[escolhida]++;
    res.push(escolhida);
  }
  return res;
}

/** Sorteia as ofertas do armeiro mestre (só peças especiais, qualidade superior ou melhor, com chance decrescente e limites por rodada). */
export function gerarArmeiroMestre(e: Estado): void {
  const rng = proximoRng(e);
  const pool = ITENS.filter((i) => !i.basico).map((i) => i.id);
  const qualidades = e.cheats?.lendario ? Array<number>(PECAS_MESTRE).fill(QUALIDADE_MAX) : sortearQualidadesMestre(() => rng.next());
  const oferta: string[] = [];
  for (const q of qualidades) {
    let base = pool[rng.int(0, pool.length - 1)];
    while (oferta.some((o) => separarId(o).base === base)) base = pool[rng.int(0, pool.length - 1)];
    oferta.push(comQualidade(base, q));
  }
  e.armeiroMestre = oferta;
}

/** Compra uma das ofertas do armeiro mestre; a oferta some até a próxima rodada. */
export function comprarMestre(e: Estado, itemId: string): void {
  exigirMelhoria(e, 'armaria');
  const idx = (e.armeiroMestre ?? []).indexOf(itemId);
  if (idx < 0) throw new Error('Esta peça não está mais à venda.');
  comprarItem(e, itemId);
  (e.armeiroMestre as string[]).splice(idx, 1);
}

function podeRecrutar(e: Estado): boolean {
  return e.gladiadores.length < capacidadeLudus(e) && e.mercado.some((m) => e.ouro >= precoRecruta(e, m));
}

/** Ainda há como gastar energia? Sobrando energia e havendo gladiador para lutar (ou como recrutar um), não se pula a rodada. */
export function podeGastarEnergia(e: Estado): boolean {
  if (e.energia <= 0) return false;
  if (e.gladiadores.some((g) => g.vivo && (!g.pocoOnly || !g.campeao))) return true;
  return podeRecrutar(e);
}

/** Fim de jogo: nenhum gladiador vivo e sem ouro (ou vaga) para recrutar outro. */
export function gameOver(e: Estado): boolean {
  return !e.gladiadores.some((g) => g.vivo) && !podeRecrutar(e);
}

export function avancarTurno(e: Estado): void {
  if (!e.cheats?.round && podeGastarEnergia(e)) {
    throw new Error(`Gaste toda a energia antes de encerrar a rodada (restam ${e.energia}): lute nas arenas, treine ou troque de estilo.`);
  }
  e.turno += 1;
  e.energia = ENERGIA_TURNO;
  const ouroAntes = e.ouro;

  let patrocinio = 0;
  const campeao = e.gladiadores.find((g) => g.campeao);
  if (campeao && campeao.vivo) {
    patrocinio = Math.round((20 + 5 * campeao.vitorias) * (bonusDaCasa(e, 'patrocinio')?.valor ?? 1));
    e.ouro += patrocinio;
  }

  const vivos = e.gladiadores.filter((g) => g.vivo).length;
  const porGladiador = temMelhoria(e, 'refeitorio') ? CUSTO_POR_GLADIADOR_REFEITORIO : CUSTO_POR_GLADIADOR;
  const custo = Math.round((CUSTO_BASE + porGladiador * vivos) * (bonusDaCasa(e, 'manutencao')?.valor ?? 1));
  if (e.ouro < custo) registrar(e, 'Ouro insuficiente para a manutenção do ludus: pagou-se tudo o que havia.');
  const pago = Math.min(custo, e.ouro);
  e.ouro -= pago;

  // Um registro só, com as duas partes: patrocínio entra, manutenção sai.
  const saldo = e.ouro - ouroAntes;
  const partes = [
    patrocinio > 0 ? `patrocínio do campeão ${campeao?.nome} +${patrocinio}` : 'sem patrocínio',
    `manutenção −${custo}`,
  ];
  registrar(e, `Turno ${e.turno}: ${partes.join(', ')} (saldo ${saldo >= 0 ? '+' : ''}${saldo} de ouro).`);

  gerarMercado(e);
  gerarArmeiroMestre(e);
}

// ---------- Ludus ----------

export function temMelhoria(e: Estado, id: MelhoriaId): boolean {
  return e.melhorias?.[id] === true;
}

export function melhoriaPorId(id: MelhoriaId): MelhoriaLudus {
  const m = MELHORIAS_LUDUS.find((x) => x.id === id);
  if (!m) throw new Error(`Melhoria desconhecida: ${id}`);
  return m;
}

function exigirMelhoria(e: Estado, id: MelhoriaId): void {
  if (!temMelhoria(e, id)) throw new Error(`É preciso construir: ${melhoriaPorId(id).nome}.`);
}

/** Gladiadores que o ludus comporta agora. */
export function capacidadeLudus(e: Estado): number {
  return temMelhoria(e, 'alojamentos') ? MAX_GLADIADORES : CAPACIDADE_BASE;
}

export function construirMelhoria(e: Estado, id: MelhoriaId): void {
  const m = melhoriaPorId(id);
  if (temMelhoria(e, id)) throw new Error(`${m.nome} já foi construído.`);
  const custo = custoMelhoria(e, id);
  pagar(e, 0, custo);
  e.melhorias = { ...e.melhorias, [id]: true };
  registrar(e, `Construído: ${m.nome} (−${custo} de ouro).`);
}

export function recrutar(e: Estado, id: string): void {
  const idx = e.mercado.findIndex((g) => g.id === id);
  if (idx < 0) throw new Error('Gladiador não está no mercado.');
  const capacidade = capacidadeLudus(e);
  if (e.gladiadores.length >= capacidade) {
    throw new Error(`O ludus comporta no máximo ${capacidade} gladiadores.${capacidade < MAX_GLADIADORES ? ' Construa os alojamentos para ampliar.' : ''}`);
  }
  const g = e.mercado[idx];
  pagar(e, 0, precoRecruta(e, g));
  e.mercado.splice(idx, 1);
  e.gladiadores.push(g);
  registrar(e, g.semEstilo ? `${g.nome} foi comprado. Escolha o estilo em que ele vai lutar.` : `${g.nome} (${CLASSES[g.classe].nome}) foi recrutado.`);
}

export function comprarItem(e: Estado, itemId: string): void {
  exigirMelhoria(e, 'armaria');
  const item = itemPorId(itemId);
  pagar(e, 0, precoItem(e, item));
  e.inventario.push(itemId);
  registrar(e, `Comprado: ${item.nome}.`);
}

/** Coloca um item do armeiro no slot, ou tira o item que estiver no slot (itemId = null). */
export function equipar(e: Estado, gladId: string, slot: Slot, itemId: string | null): void {
  exigirMelhoria(e, 'armaria');
  const g = achar(e, gladId);
  exigirComEstilo(g);
  const antigo = g.equipamento[slot];

  if (itemId === null) {
    if (antigo) e.inventario.push(antigo);
    g.equipamento[slot] = null;
    return;
  }

  const item = itemPorId(itemId);
  if (item.slot !== slot) throw new Error('Este item não serve a este slot.');
  if (!item.classes.includes(g.classe)) throw new Error('Este item não serve a esta classe.');
  const idx = e.inventario.indexOf(itemId);
  if (idx < 0) throw new Error('Item não está no armeiro.');

  e.inventario.splice(idx, 1);
  if (antigo) e.inventario.push(antigo);
  g.equipamento[slot] = itemId;
}

/** Primeira escolha de estilo do escravo: grátis, sem energia; ele recebe o kit básico do estilo. */
export function escolherEstilo(e: Estado, gladId: string, classe: ClasseId): void {
  const g = achar(e, gladId);
  exigirVivo(g);
  if (!g.semEstilo) throw new Error('Este gladiador já tem um estilo. Para mudar, use "Trocar estilo".');
  g.classe = classe;
  g.semEstilo = false;
  g.equipamento = sortearEquipamento(proximoRng(e), classe);
  registrar(e, `${g.nome} vai lutar como ${CLASSES[classe].nome}, com o kit básico.`);
}

function exigirComEstilo(g: Gladiador): void {
  if (g.semEstilo) throw new Error(`${g.nome} ainda não tem estilo: escolha-o no ludus antes de lutar ou trocar de equipamento.`);
}

export function trocarClasse(e: Estado, gladId: string, classe: ClasseId): void {
  const g = achar(e, gladId);
  exigirVivo(g);
  exigirComEstilo(g);
  if (g.campeao) throw new Error('O campeão do ludus não muda de estilo.');
  if (classe === g.classe) throw new Error('O gladiador já luta neste estilo.');

  const energia = g.origem === 'livre' ? 2 : 1;
  pagar(e, energia, precoTrocaEstilo(e, g));
  g.classe = classe;

  // Peças básicas viram as do novo estilo (mantendo a qualidade); as demais que não servem voltam ao armeiro.
  for (const slot of SLOTS) {
    const id = g.equipamento[slot];
    if (!id) continue;
    const item = itemPorId(id);
    if (item.basico) {
      g.equipamento[slot] = comQualidade(`basico_${slot}_${classe}`, item.qualidade);
    } else if (!item.classes.includes(classe)) {
      e.inventario.push(id);
      g.equipamento[slot] = comQualidade(`basico_${slot}_${classe}`, 0);
    }
  }
  registrar(e, `${g.nome} passou a lutar como ${CLASSES[classe].nome}.`);
}

export function treinar(e: Estado, gladId: string, atributo: Atributo): void {
  exigirMelhoria(e, 'palus');
  const g = achar(e, gladId);
  exigirVivo(g);
  if (g.treino[atributo] >= TREINO_MAXIMO) throw new Error('Treino máximo atingido neste atributo.');
  pagar(e, 1, PRECO_TREINO);
  g.treino[atributo] += 1;
  g.xp += 10;
  atualizarNivel(g);
}

export function tratar(e: Estado, gladId: string): void {
  exigirMelhoria(e, 'enfermaria');
  const g = achar(e, gladId);
  exigirVivo(g);
  if (g.efeitos.length === 0) throw new Error('Este gladiador não tem efeitos a tratar.');
  pagar(e, 1, custoTratamento(g));
  g.efeitos = [];
  registrar(e, `${g.nome} foi tratado na enfermaria.`);
}

// ---------- Combate ----------

/** Acumula efeitos do Poço no gladiador. Cada novo golpe igual sobe a gravidade até 3. */
function aplicarEfeitos(g: Gladiador, aplicados: EfeitoAplicado[]): string[] {
  const novos: string[] = [];
  for (const ap of aplicados) {
    if (ap.alvo !== g.id) continue;
    const existente = g.efeitos.find((x) => x.tipo === ap.tipo);
    if (existente) {
      existente.severidade = Math.min(3, existente.severidade + 1);
      novos.push(`${NOME_EFEITO[ap.tipo]} (gravidade ${existente.severidade})`);
    } else {
      g.efeitos.push({ tipo: ap.tipo, severidade: 1 });
      novos.push(`${NOME_EFEITO[ap.tipo]} (gravidade 1)`);
    }
  }
  return novos;
}

function visual(g: Gladiador, f: Fighter): LutadorVisual {
  return { id: g.id, nome: g.nome, classe: g.classe, hpMax: f.hpMax, aparencia: aparenciaDe(g) };
}

/** Chance de um liberto voltar à arena numa recriação de luta (só em lutas de rendição). */
export const CHANCE_LIBERTO = 0.03;

interface Disputa {
  ladoA: Gladiador[];
  ladoB: Gladiador[];
  especialidadeB?: ClasseId;
  bonusB: Partial<Stats>;
  arena: Arena;
  titulo: string;
  trilha: string;
  /** Golpes podem aplicar efeitos do Poço. */
  poco: boolean;
  /** Luta até a morte (lanistas). Falso: rendição. */
  mortal: boolean;
  recompensa: [number, number];
  rng: Rng;
}

const nomes = (lista: Gladiador[]): string => lista.map((g) => g.nome).join(' e ');

function disputar(e: Estado, d: Disputa): PayloadLuta {
  const casa = lanistaDaCasa(e);
  const ch = e.cheats ?? {};
  const forte: Partial<Stats> = ch.vencer ? { forca: 80, agilidade: 80, vitalidade: 300, sorte: 80 } : ch.vida ? { vitalidade: 300 } : {};
  const extraA = { ...extraDaCasa(e) };
  for (const a of ATRIBUTOS) if (forte[a]) extraA[a] = (extraA[a] ?? 0) + (forte[a] as number);
  const fa = d.ladoA.map((g) => paraLutador(g, casa.especialidade, extraA));
  const fb = d.ladoB.map((g) => paraLutador(g, d.especialidadeB, d.bonusB));
  const r = simularEquipes(fa, fb, d.rng.int(1, 2147483646), {
    efeitosPoco: d.poco,
    rendicao: d.mortal ? undefined : RENDICAO_PADRAO,
  });
  const vitoria = ch.vencer ? true : r.vencedorLado === 'A';

  const efeitosNovos: string[] = [];
  if (d.poco && !ch.vida) for (const g of d.ladoA) efeitosNovos.push(...aplicarEfeitos(g, r.efeitosAplicados));

  const caidos = new Set(ch.vida || ch.vencer ? [] : r.eventos.filter((ev) => ev.tipo === 'morte').map((ev) => ev.alvo));
  for (const g of d.ladoA) if (caidos.has(g.id)) g.vivo = false;

  const detalhes: string[] = [];
  for (const g of [...d.ladoA]) {
    if (!g.vivo && g.lenda) {
      removerGladiador(e, g);
      detalhes.push(`${g.nome}, lenda, caiu e deixou o ludus.`);
    } else if (!g.vivo) {
      detalhes.push(`${g.nome} morreu.`);
    }
    if (vitoria) g.vitorias += 1;
    else g.derrotas += 1;
    if (vitoria && d.poco) g.vitoriasPoco += 1;
    if (d.poco) g.pocoOnly = true;
    if (g.lenda) g.lutasComoLenda = (g.lutasComoLenda ?? 0) + 1;
    g.xp += vitoria ? 20 : 8;
    atualizarNivel(g);
  }
  if (efeitosNovos.length) detalhes.push(`Efeitos: ${efeitosNovos.join(', ')}.`);

  const marcos: string[] = [];
  let ouro = 0;
  let bonusPct = 0;
  let moedas = 0;
  let plateia = d.arena.plateia;
  if (d.poco) {
    const lot = LOTACOES_ORDEM[d.rng.int(0, 2)];
    plateia = lot;
    bonusPct = LOTACOES_POCO[lot].bonus;
    if (vitoria) moedas = d.rng.int(LOTACOES_POCO[lot].moedas[0], LOTACOES_POCO[lot].moedas[1]);
  }
  if (vitoria) {
    e.vitoriasTotais += 1;
    const base = d.rng.int(d.recompensa[0], d.recompensa[1]);
    ouro = d.poco ? base + Math.round((base * bonusPct) / 100) : base;
    const mult = d.poco ? bonusDaCasa(e, 'ouroPoco') : d.mortal ? undefined : bonusDaCasa(e, 'ouroArena');
    if (mult) ouro = Math.round(ouro * mult.valor);
    e.ouro += ouro;
    for (const g of [...d.ladoA]) if (g.vivo) marcos.push(...aplicarMarcos(e, g));
  }
  for (const g of [...d.ladoA]) if (g.vivo) marcos.push(...aplicarLiberdade(e, g));

  const resumo = `${vitoria ? 'Vitória' : 'Derrota'} de ${nomes(d.ladoA)} contra ${nomes(d.ladoB)}.`;
  registrar(e, [resumo, ...detalhes, ...marcos].join(' '));

  return {
    titulo: d.titulo,
    arenaNome: d.arena.nome,
    arte: d.arena.arte,
    plateia,
    lutadoresA: d.ladoA.map((g, i) => visual(g, fa[i])),
    lutadoresB: d.ladoB.map((g, i) => visual(g, fb[i])),
    eventos: r.eventos,
    vitoriaA: vitoria,
    efeitosNovos,
    resumo,
    trilha: d.trilha,
    marcos,
    ouro,
    bonusPct: vitoria ? bonusPct : 0,
    moedas,
  };
}

/** Rivais mais fortes chegam com peças melhoradas. */
function qualidadeRival(nivel: number): number {
  return Math.min(QUALIDADE_MAX, Math.floor(nivel / 3));
}

function gerarRival(e: Estado, rng: Rng, nivel: number, origem: OrigemTipo): Gladiador {
  const classe = CLASSES_IDS[rng.int(0, CLASSES_IDS.length - 1)];
  return gerarGladiador(rng, novoId(e), classe, nivel, origem, false, qualidadeRival(nivel));
}

/** Arena de honra ou Poço: rendição. A equipe é de 1 ou 2 gladiadores. */
export function lutarArena(e: Estado, gladIds: string[], arenaId: string): PayloadLuta {
  const arena = arenaPorId(arenaId);
  if (gladIds.length < 1 || gladIds.length > 2) throw new Error('Escolha 1 ou 2 gladiadores.');
  if (new Set(gladIds).size !== gladIds.length) throw new Error('Escolha gladiadores diferentes.');
  const ladoA = gladIds.map((id) => achar(e, id));
  const fama = arenaLiberada(e, arena);
  if (!fama.liberada) throw new Error(`${arena.nome} só abre depois de ${arena.batalhasMin} batalhas (faltam ${fama.faltam}).`);
  for (const g of ladoA) {
    exigirVivo(g);
    exigirComEstilo(g);
    if (!arena.honra && g.campeao) throw new Error('O campeão do ludus não entra no Poço.');
    if (arena.honra && g.pocoOnly) {
      throw new Error(`${g.nome} já lutou no Poço e não pode lutar nas arenas de honra.`);
    }
  }
  // 2×2 gasta 2 de energia e paga o dobro: a energia e a recompensa crescem com o número de gladiadores.
  pagar(e, gladIds.length, 0);
  e.batalhasTotais = batalhasDoLudus(e) + 1;

  const rng = proximoRng(e);
  const origem: OrigemTipo = arena.honra ? 'livre' : 'escravo';
  const ladoB = ladoA.map(() => gerarRival(e, rng, ladoA[0].nivel, origem));
  if (e.libertados.length > 0 && rng.next() < CHANCE_LIBERTO) {
    const base = e.libertados[rng.int(0, e.libertados.length - 1)];
    ladoB[0] = { ...base, id: novoId(e), vivo: true, efeitos: [], campeao: false, lenda: false };
    registrar(e, `${base.nome} retorna à arena numa recriação de luta.`);
  }

  // Dificuldade da arena: os rivais ganham o percentual em cada atributo.
  const mult = multiplicadorArena(arena, e.config?.dificuldade);
  const bonusB: Partial<Stats> = {};
  const media = statsDoGladiador(ladoB[0]);
  for (const a of ATRIBUTOS) bonusB[a] = Math.round(media[a] * (mult - 1));

  return disputar(e, {
    ladoA,
    ladoB,
    bonusB,
    arena,
    titulo: arena.nome,
    trilha: arena.id,
    poco: !arena.honra,
    mortal: false,
    recompensa: [arena.recompensaOuro[0] * gladIds.length, arena.recompensaOuro[1] * gladIds.length],
    rng,
  });
}

/** Pular a luta: o resultado vale, mas a recompensa em ouro cai 10%. Devolve o ouro descontado. */
export const PENALIDADE_PULO = 0.1;
export function pularLuta(e: Estado, payload: PayloadLuta): number {
  const perda = payload.vitoriaA && !e.cheats?.pular ? Math.round(payload.ouro * PENALIDADE_PULO) : 0;
  e.ouro = Math.max(0, e.ouro - perda);
  registrar(e, perda > 0 ? `Luta pulada: −${perda} de ouro na recompensa (10%).` : 'Luta pulada.');
  return perda;
}

/**
 * Desistência no meio da luta: desfaz o resultado simulado (sem ouro, vitória, morte nem efeitos)
 * e conta como derrota para a equipe. A energia gasta não volta. `antes` é o estado anterior à luta
 * e `depois` o estado já com o resultado, de onde sai só a semente (para não repetir o mesmo sorteio).
 */
export function desistirDaLuta(antes: Estado, depois: Estado, gladIds: string[]): Estado {
  const novo: Estado = structuredClone(antes);
  novo.energia = Math.min(antes.energia, depois.energia);
  novo.semente = depois.semente;
  const nomesDesistentes: string[] = [];
  for (const id of gladIds) {
    const g = novo.gladiadores.find((x) => x.id === id);
    if (!g) continue;
    g.derrotas += 1;
    g.xp += 8;
    atualizarNivel(g);
    nomesDesistentes.push(g.nome);
  }
  registrar(novo, `${nomesDesistentes.join(' e ')} desistiu da luta e não ganhou nada.`);
  return novo;
}

export function textoRequisito(r: Requisito): string {
  switch (r.tipo) {
    case 'vitoriasTotais':
      return `${r.valor} vitórias na arena`;
    case 'gladiadorVitorias':
      return `Um gladiador${r.classe ? ` ${CLASSES[r.classe].nome}` : ''} com ${r.valor} vitórias`;
    case 'gladiadorPoco':
      return `Um gladiador com ${r.valor} vitórias no Poço`;
    case 'gladiadorEquipado':
      return `Um gladiador equipado com ${itemPorId(r.item ?? '').nome}`;
  }
}

function cumpre(e: Estado, r: Requisito): boolean {
  const vivos = e.gladiadores.filter((g) => g.vivo);
  switch (r.tipo) {
    case 'vitoriasTotais':
      return e.vitoriasTotais >= (r.valor ?? 0);
    case 'gladiadorVitorias':
      return vivos.some((g) => g.vitorias >= (r.valor ?? 0) && (!r.classe || g.classe === r.classe));
    case 'gladiadorPoco':
      return vivos.some((g) => g.vitoriasPoco >= (r.valor ?? 0));
    case 'gladiadorEquipado':
      return vivos.some((g) => Object.values(g.equipamento).includes(r.item ?? ''));
  }
}

export function proximoDesafio(e: Estado): Desafio | null {
  if (e.campanha >= PASSOS.length) return null;
  const passo = PASSOS[e.campanha];
  const sequencia = sequenciaCampanha(e.casaId);
  const lanista = sequencia[e.campanha];
  if (!e.campeoesRivais[lanista.id]) {
    // Saves antigos não têm os campeões de Batiatus e Espártaco.
    const nivel = lanista.id === 'batiatus' ? 6 : lanista.id === 'espartaco' ? 8 : 4;
    e.campeoesRivais[lanista.id] = gerarGladiador(proximoRng(e), `campeao-${lanista.id}`, lanista.especialidade, nivel, 'livre', true);
  }
  const ignora = !!e.cheats?.campanha;
  const requisitos = passo.requisitos.map((r) => ({ texto: textoRequisito(r), ok: ignora || cumpre(e, r) }));
  return {
    lanista,
    sequencia,
    passo,
    indice: e.campanha,
    requisitos,
    pronto: requisitos.every((r) => r.ok),
  };
}

/** Lutas dos lanistas: sempre até a morte. O formato (1 ou 2) vem do passo da campanha. */
export function lutarCampanha(e: Estado, gladIds: string[]): PayloadLuta {
  const desafio = proximoDesafio(e);
  if (!desafio) throw new Error('A campanha já foi concluída.');
  const lanista = desafio.lanista;
  if (!desafio.pronto) throw new Error('Os requisitos deste passo ainda não foram cumpridos.');
  const formato = desafio.passo.formato ?? 1;
  if (gladIds.length !== formato) {
    throw new Error(`Este passo é ${formato} contra ${formato}: escolha ${formato} gladiador${formato > 1 ? 'es' : ''}.`);
  }
  if (new Set(gladIds).size !== gladIds.length) throw new Error('Escolha gladiadores diferentes.');
  const ladoA = gladIds.map((id) => achar(e, id));
  for (const g of ladoA) {
    exigirVivo(g);
    exigirComEstilo(g);
  }
  pagar(e, formato, 0);

  const rng = proximoRng(e);
  const regra = desafio.passo.regra;
  const ladoB: Gladiador[] = [e.campeoesRivais[lanista.id]];
  for (let i = 1; i < formato; i++) {
    ladoB.push(gerarGladiador(rng, novoId(e), lanista.especialidade, 3, 'livre'));
  }

  const payload = disputar(e, {
    ladoA,
    ladoB,
    especialidadeB: lanista.especialidade,
    bonusB: regra.bonus,
    arena: arenaPorId(regra.efeitosPoco ? 'poco' : 'coliseu'),
    titulo: `${desafio.passo.titulo}: ${regra.nome}`,
    trilha: regra.efeitosPoco ? 'poco' : `campanha:${lanista.id}`,
    poco: regra.efeitosPoco,
    mortal: true,
    recompensa: [100 * formato, 140 * formato],
    rng,
  });
  if (payload.vitoriaA) {
    e.campanha += 1;
    e.derrotados = [...(e.derrotados ?? []), lanista.id];
  }
  return payload;
}

// ---------- Lenda, liberdade, venda e dispensa ----------

/** Aplica os limiares de campeão e lenda após uma vitória. Devolve os marcos ocorridos. */
export function aplicarMarcos(e: Estado, g: Gladiador): string[] {
  const marcos: string[] = [];
  const r = regrasDe(e);
  const jaHaCampeao = e.gladiadores.some((x) => x.campeao && x.vivo);
  if (!g.campeao && !jaHaCampeao && !g.pocoOnly && g.vitorias >= r.campeao) {
    g.campeao = true;
    const msg = `${g.nome} tornou-se o campeão do ludus após ${g.vitorias} vitórias.`;
    registrar(e, msg);
    marcos.push(msg);
  }
  const jaHaLenda = e.gladiadores.some((x) => x.lenda && x.vivo && x.id !== g.id);
  if (!g.lenda && !jaHaLenda && g.vitorias >= r.lenda) {
    g.lenda = true;
    const msg = `${g.nome} tornou-se lenda após ${g.vitorias} vitórias.`;
    registrar(e, msg);
    marcos.push(msg);
  }
  return marcos;
}

/** Liberdade: depois de N lutas como lenda (conforme a dificuldade; no Fácil e no Médio nunca acontece). */
export function aplicarLiberdade(e: Estado, g: Gladiador): string[] {
  const lim = regrasDe(e).liberdade;
  if (lim === null || !g.lenda || !g.vivo || (g.lutasComoLenda ?? 0) < lim) return [];
  const copia: Gladiador = { ...g, efeitos: [], equipamento: { ...g.equipamento }, lenda: false, campeao: false, vivo: true };
  removerGladiador(e, g);
  e.libertados.push(copia);
  const msg = `${g.nome} ganhou a liberdade após ${g.lutasComoLenda} lutas como lenda.`;
  registrar(e, msg);
  return [msg];
}

/** Tira o gladiador do ludus e devolve o equipamento ao armeiro. */
function removerGladiador(e: Estado, g: Gladiador): void {
  e.gladiadores = e.gladiadores.filter((x) => x.id !== g.id);
  for (const slot of SLOTS) {
    const id = g.equipamento[slot];
    // Peça básica sem melhoria não vale guardar.
    if (id && !(itemPorId(id).basico && separarId(id).qualidade === 0)) e.inventario.push(id);
    g.equipamento[slot] = null;
  }
}

export function venderGladiador(e: Estado, id: string): void {
  const g = achar(e, id);
  if (g.campeao) throw new Error('O campeão do ludus não pode ser vendido.');
  if (g.lenda) throw new Error('A lenda não é vendida: só deixa o ludus pela liberdade.');
  if (g.origem !== 'escravo') throw new Error('Só escravos são vendidos.');
  if (!g.vivo) throw new Error('Gladiador morto não pode ser vendido. Dispense-o.');
  const valor = Math.max(20, Math.round((precoGladiador(g) * regrasDe(e).precos) / 2));
  removerGladiador(e, g);
  e.ouro += valor;
  registrar(e, `${g.nome} foi vendido por ${valor} de ouro.`);
}

export function dispensarGladiador(e: Estado, id: string): void {
  const g = achar(e, id);
  if (g.campeao) throw new Error('O campeão do ludus não pode ser dispensado.');
  if (g.lenda) throw new Error('A lenda não é dispensada: só deixa o ludus pela liberdade.');
  removerGladiador(e, g);
  registrar(e, `${g.nome} foi dispensado.`);
}

/** Define a dificuldade. Só vale na criação do ludus: a tela do jogo não oferece mais a edição. */
export function definirConfig(e: Estado, valores: Partial<Config>): void {
  const d = valores.dificuldade ?? e.config?.dificuldade ?? 'medio';
  if (!REGRAS[d]) throw new Error('Dificuldade inválida.');
  e.config = { dificuldade: d };
}
