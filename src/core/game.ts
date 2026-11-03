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
  atualizarNivel,
  CLASSES,
  CLASSES_IDS,
  custoTratamento,
  gerarGladiador,
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
  log: string[];
}

/** Limiares de vitórias. A lenda vem antes (prestígio); a liberdade é o fim da carreira. */
export interface Config {
  vitoriasLenda: number;
}
export const CONFIG_PADRAO: Config = { vitoriasLenda: 6 };
/** A liberdade vem em 3 vezes o limiar de lenda. */
export const FATOR_LIBERDADE = 3;

export function limiarLiberdade(c: Config): number {
  return c.vitoriasLenda * FATOR_LIBERDADE;
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
  /** Lanista escolhido para o passo; null enquanto o jogador não escolhe. */
  lanista: Lanista | null;
  /** Opções oferecidas neste passo (vazias depois da escolha). */
  opcoes: Lanista[];
  passo: Passo;
  indice: number;
  requisitos: { texto: string; ok: boolean }[];
  pronto: boolean;
}

const OPCOES_LANISTA = 3;

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
  if (e.energia < energia) throw new Error('Energia insuficiente neste turno.');
  if (e.ouro < ouro) throw new Error('Ouro insuficiente.');
  e.energia -= energia;
  e.ouro -= ouro;
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
  const preco = precoGladiador(g);
  return b && g.origem === 'escravo' ? Math.round(preco * b.valor) : preco;
}

/** Custo de uma melhoria do ludus, com o bônus da casa. */
export function custoMelhoria(e: Estado, id: MelhoriaId): number {
  const b = bonusDaCasa(e, 'precoUpgrade');
  const custo = melhoriaPorId(id).custo;
  return b ? Math.round(custo * b.valor) : custo;
}

export function lanistaDaCasa(e: Estado): Lanista {
  const l = LANISTAS.find((x) => x.id === e.casaId);
  if (!l) throw new Error('Lanista inexistente.');
  return l;
}

export function arenaPorId(id: string): Arena {
  const a = ARENAS.find((x) => x.id === id);
  if (!a) throw new Error('Arena inexistente.');
  return a;
}

/** Lanistas rivais, na ordem em que enfrentam o jogador na campanha. */
export function filaLanistas(e: Estado): Lanista[] {
  return LANISTAS.filter((l) => l.id !== e.casaId);
}

// ---------- Partida ----------

export function novoJogo(semente: number = Date.now() % 2147483646, casaId?: string): Estado {
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
  const rng = proximoRng(e);
  const sorteado = LANISTAS[rng.int(0, LANISTAS.length - 1)].id;
  e.casaId = casaId && LANISTAS.some((l) => l.id === casaId) ? casaId : sorteado;
  const casa = lanistaDaCasa(e);
  const bOuro = bonusDaCasa(e, 'ouroInicial');
  if (bOuro) e.ouro += bOuro.valor;
  const nivelCampeao = 4 + (bonusDaCasa(e, 'campeaoNivel')?.valor ?? 0);

  e.gladiadores.push(gerarGladiador(rng, novoId(e), casa.especialidade, nivelCampeao, 'livre', true));
  for (const l of filaLanistas(e)) {
    e.campeoesRivais[l.id] = gerarGladiador(rng, `campeao-${l.id}`, l.especialidade, 4, 'livre', true);
  }
  sortearOpcoes(e, rng);
  gerarMercado(e);
  gerarArmeiroMestre(e);
  registrar(e, `Você comanda ${casa.nome}, casa de ${CLASSES[casa.especialidade].nome}. Seu campeão lidera o ludus.`);
  return e;
}

export function gerarMercado(e: Estado): void {
  const rng = proximoRng(e);
  e.mercado = [];
  for (let i = 0; i < 5; i++) {
    const origem: OrigemTipo = i < 3 ? 'escravo' : 'livre';
    const classe = CLASSES_IDS[rng.int(0, CLASSES_IDS.length - 1)];
    const nivel = origem === 'escravo' ? rng.int(1, 2) : rng.int(2, 4);
    e.mercado.push(gerarGladiador(rng, novoId(e), classe, nivel, origem));
  }
}

/** Sorteia as 3 ofertas do armeiro mestre (peças especiais de qualidade superior ou melhor). */
export function gerarArmeiroMestre(e: Estado): void {
  const rng = proximoRng(e);
  const pool = ITENS.filter((i) => !i.basico).map((i) => i.id);
  const oferta: string[] = [];
  while (oferta.length < 3) {
    const base = pool[rng.int(0, pool.length - 1)];
    if (oferta.some((o) => separarId(o).base === base)) continue;
    const r = rng.next();
    oferta.push(comQualidade(base, r < 0.45 ? 1 : r < 0.75 ? 2 : r < 0.92 ? 3 : 4));
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
  if (podeGastarEnergia(e)) {
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
  registrar(e, `${g.nome} (${CLASSES[g.classe].nome}) foi recrutado.`);
}

export function comprarItem(e: Estado, itemId: string): void {
  exigirMelhoria(e, 'armaria');
  const item = itemPorId(itemId);
  pagar(e, 0, item.preco);
  e.inventario.push(itemId);
  registrar(e, `Comprado: ${item.nome}.`);
}

/** Coloca um item do armeiro no slot, ou tira o item que estiver no slot (itemId = null). */
export function equipar(e: Estado, gladId: string, slot: Slot, itemId: string | null): void {
  exigirMelhoria(e, 'armaria');
  const g = achar(e, gladId);
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

export function trocarClasse(e: Estado, gladId: string, classe: ClasseId): void {
  const g = achar(e, gladId);
  exigirVivo(g);
  if (g.campeao) throw new Error('O campeão do ludus não muda de estilo.');
  if (classe === g.classe) throw new Error('O gladiador já luta neste estilo.');

  const energia = g.origem === 'livre' ? 2 : 1;
  pagar(e, energia, precoTroca(g));
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
  const fa = d.ladoA.map((g) => paraLutador(g, casa.especialidade, extraDaCasa(e)));
  const fb = d.ladoB.map((g) => paraLutador(g, d.especialidadeB, d.bonusB));
  const r = simularEquipes(fa, fb, d.rng.int(1, 2147483646), {
    efeitosPoco: d.poco,
    rendicao: d.mortal ? undefined : RENDICAO_PADRAO,
  });
  const vitoria = r.vencedorLado === 'A';

  const efeitosNovos: string[] = [];
  if (d.poco) for (const g of d.ladoA) efeitosNovos.push(...aplicarEfeitos(g, r.efeitosAplicados));

  const caidos = new Set(r.eventos.filter((ev) => ev.tipo === 'morte').map((ev) => ev.alvo));
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
  for (const g of ladoA) {
    exigirVivo(g);
    if (!arena.honra && g.campeao) throw new Error('O campeão do ludus não entra no Poço.');
    if (arena.honra && g.pocoOnly) {
      throw new Error(`${g.nome} já lutou no Poço e não pode lutar nas arenas de honra.`);
    }
  }
  // 2×2 gasta 2 de energia e paga o dobro: a energia e a recompensa crescem com o número de gladiadores.
  pagar(e, gladIds.length, 0);

  const rng = proximoRng(e);
  const origem: OrigemTipo = arena.honra ? 'livre' : 'escravo';
  const ladoB = ladoA.map(() => gerarRival(e, rng, ladoA[0].nivel, origem));
  if (e.libertados.length > 0 && rng.next() < CHANCE_LIBERTO) {
    const base = e.libertados[rng.int(0, e.libertados.length - 1)];
    ladoB[0] = { ...base, id: novoId(e), vivo: true, efeitos: [], campeao: false, lenda: false };
    registrar(e, `${base.nome} retorna à arena numa recriação de luta.`);
  }

  return disputar(e, {
    ladoA,
    ladoB,
    bonusB: {},
    arena,
    titulo: arena.nome,
    trilha: arena.id,
    poco: !arena.honra,
    mortal: false,
    recompensa: [arena.recompensaOuro[0] * gladIds.length, arena.recompensaOuro[1] * gladIds.length],
    rng,
  });
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

/** Sorteia os lanistas oferecidos no passo atual, entre os que ainda não foram derrotados. */
function sortearOpcoes(e: Estado, rng: Rng): void {
  const derrotados = e.derrotados ?? [];
  const pool = filaLanistas(e).filter((l) => !derrotados.includes(l.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  e.opcoesLanista = pool.slice(0, OPCOES_LANISTA).map((l) => l.id);
  e.escolhaLanista = null;
}

function opcoesDoPasso(e: Estado): Lanista[] {
  if (!e.opcoesLanista) sortearOpcoes(e, new Rng(e.semente));
  return (e.opcoesLanista ?? []).flatMap((id) => {
    const l = LANISTAS.find((x) => x.id === id);
    return l ? [l] : [];
  });
}

export function proximoDesafio(e: Estado): Desafio | null {
  if (e.campanha >= PASSOS.length) return null;
  const passo = PASSOS[e.campanha];
  const lanista = e.escolhaLanista ? LANISTAS.find((l) => l.id === e.escolhaLanista) ?? null : null;
  const requisitos = passo.requisitos.map((r) => ({ texto: textoRequisito(r), ok: cumpre(e, r) }));
  return {
    lanista,
    opcoes: opcoesDoPasso(e),
    passo,
    indice: e.campanha,
    requisitos,
    pronto: lanista !== null && requisitos.every((r) => r.ok),
  };
}

/** O jogador escolhe, entre as opções do passo, o lanista que vai enfrentar. */
export function escolherLanista(e: Estado, id: string): void {
  if (e.campanha >= PASSOS.length) throw new Error('A campanha já foi concluída.');
  const escolhido = opcoesDoPasso(e).find((l) => l.id === id);
  if (!escolhido) throw new Error('Este lanista não está entre as opções deste passo.');
  e.escolhaLanista = id;
  registrar(e, `Desafio aceito: ${escolhido.nome} (${CLASSES[escolhido.especialidade].nome}).`);
}

/** Lutas dos lanistas: sempre até a morte. O formato (1 ou 2) vem do passo da campanha. */
export function lutarCampanha(e: Estado, gladIds: string[]): PayloadLuta {
  const desafio = proximoDesafio(e);
  if (!desafio) throw new Error('A campanha já foi concluída.');
  const lanista = desafio.lanista;
  if (!lanista) throw new Error('Escolha o lanista deste passo antes de lutar.');
  if (!desafio.pronto) throw new Error('Os requisitos deste passo ainda não foram cumpridos.');
  const formato = desafio.passo.formato ?? 1;
  if (gladIds.length !== formato) {
    throw new Error(`Este passo é ${formato} contra ${formato}: escolha ${formato} gladiador${formato > 1 ? 'es' : ''}.`);
  }
  if (new Set(gladIds).size !== gladIds.length) throw new Error('Escolha gladiadores diferentes.');
  const ladoA = gladIds.map((id) => achar(e, id));
  for (const g of ladoA) exigirVivo(g);
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
    if (e.campanha < PASSOS.length) sortearOpcoes(e, proximoRng(e));
    else e.escolhaLanista = null;
  }
  return payload;
}

// ---------- Lenda, liberdade, venda e dispensa ----------

/** Aplica os limiares de lenda e liberdade após uma vitória. Devolve os marcos ocorridos. */
export function aplicarMarcos(e: Estado, g: Gladiador): string[] {
  const marcos: string[] = [];
  if (!g.campeao && g.vitorias >= limiarLiberdade(e.config)) {
    const copia: Gladiador = { ...g, efeitos: [], equipamento: { ...g.equipamento }, lenda: false, vivo: true };
    removerGladiador(e, g);
    e.libertados.push(copia);
    const msg = `${g.nome} ganhou a liberdade após ${g.vitorias} vitórias.`;
    registrar(e, msg);
    marcos.push(msg);
    return marcos;
  }
  const jaHaLenda = e.gladiadores.some((x) => x.lenda && x.vivo && x.id !== g.id);
  if (!g.lenda && !jaHaLenda && g.vitorias >= e.config.vitoriasLenda) {
    g.lenda = true;
    const msg = `${g.nome} tornou-se lenda após ${g.vitorias} vitórias.`;
    registrar(e, msg);
    marcos.push(msg);
  }
  return marcos;
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
  const valor = Math.max(20, Math.round(precoGladiador(g) / 2));
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

/** Atualiza o limiar de lenda (valor do menu). A liberdade é derivada dele. */
export function definirConfig(e: Estado, valores: Partial<Config>): void {
  const lenda = Math.round(valores.vitoriasLenda ?? e.config.vitoriasLenda);
  if (!Number.isFinite(lenda) || lenda < 1 || lenda > 30) throw new Error('Lenda: informe de 1 a 30 vitórias.');
  e.config = { vitoriasLenda: lenda };
}
