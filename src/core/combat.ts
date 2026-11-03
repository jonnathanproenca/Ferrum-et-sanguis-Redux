import { Rng } from './rng';

export interface Stats {
  forca: number;
  agilidade: number;
  vitalidade: number;
  sorte: number;
}

export type TipoEfeito = 'sangramento' | 'envenenamento' | 'contusao' | 'queimadura';
export const TIPOS_EFEITO: TipoEfeito[] = ['sangramento', 'envenenamento', 'contusao', 'queimadura'];

export interface Fighter {
  id: string;
  nome: string;
  stats: Stats;
  hpMax: number;
  hp: number;
  /** Identificador da passiva da classe (ver classes.json). */
  passiva?: string;
}

export type Evento =
  | { tipo: 'esquiva'; ator: string; alvo: string }
  | { tipo: 'defesa'; ator: string; alvo: string }
  | { tipo: 'acerto'; ator: string; alvo: string; dano: number; critico: boolean; hpRestante: number; pesado?: boolean }
  /** Barra de golpe pesado de um lutador mudou (0..max). */
  | { tipo: 'carga'; alvo: string; valor: number; max: number }
  | { tipo: 'aplicado'; alvo: string; nome: TipoEfeito }
  | { tipo: 'efeito'; alvo: string; nome: TipoEfeito; dano: number; hpRestante: number }
  | { tipo: 'atordoado'; alvo: string }
  | { tipo: 'rendicao'; alvo: string }
  | { tipo: 'morte'; alvo: string };

/** Log completo com rolagens e bônus. Fica fora da tela; serve para depuração e balanceamento. */
export interface RegistroOculto {
  rodada: number;
  atacante: string;
  defensor: string;
  rolagemAtaque: number;
  rolagemDefesa: number;
  bonusAtaque: number;
  bonusDefesa: number;
  dano: number;
  pesado?: boolean;
}

export interface EfeitoAplicado {
  alvo: string;
  tipo: TipoEfeito;
}

export interface ResultadoLuta {
  vencedor: string;
  eventos: Evento[];
  ocultos: RegistroOculto[];
  efeitosAplicados: EfeitoAplicado[];
}

export interface OpcoesLuta {
  /** Golpes podem aplicar efeitos do Poço (sangramento, envenenamento, contusão, queimadura). */
  efeitosPoco?: boolean;
  /** Chance de aplicar um efeito a cada golpe que acerta, em [0, 1]. */
  chanceEfeito?: number;
}

const MAX_RODADAS = 50;
/** Defesas/esquivas necessárias para carregar o golpe pesado. */
export const CARGA_PESADO = 4;
/** Bônus de dano do golpe pesado. */
export const BONUS_PESADO = 1.1;
const CHANCE_SEQUENCIA = 0.15;
const CHANCE_EFEITO_PADRAO = 0.5;

export function criarLutador(id: string, nome: string, stats: Stats, passiva?: string): Fighter {
  const hpMax = 50 + stats.vitalidade * 5;
  return { id, nome, stats: { ...stats }, hpMax, hp: hpMax, passiva };
}

/** Bônus derivado de atributo. Ex.: 10 => +2, 4 => -1. */
function bonus(valor: number): number {
  return Math.floor((valor - 5) / 2);
}

interface ResultadoGolpe {
  evento: Evento;
  oculto: RegistroOculto;
  acertou: boolean;
}

/** Um golpe: esquiva ou defesa, ou acerto com dano. Passivas de classe entram aqui. */
export function resolverAtaque(
  atacante: Fighter,
  defensor: Fighter,
  rng: Rng,
  rodada: number,
  presos: Set<string> = new Set(),
  cargas: Map<string, number> = new Map(),
): ResultadoGolpe {
  const rolagemAtaque = rng.d20();
  const rolagemDefesa = rng.d20();
  const bonusAtaque = bonus(atacante.stats.agilidade) + bonus(atacante.stats.sorte);
  let bonusDefesa = bonus(defensor.stats.agilidade);
  if (defensor.passiva === 'guarda') bonusDefesa += 2;
  if (presos.has(defensor.id)) {
    bonusDefesa -= 2;
    presos.delete(defensor.id);
  }
  const pesado = (cargas.get(atacante.id) ?? 0) >= CARGA_PESADO;
  if (pesado) cargas.set(atacante.id, 0);
  const critico = rolagemAtaque === 20;

  const base = {
    rodada,
    atacante: atacante.id,
    defensor: defensor.id,
    rolagemAtaque,
    rolagemDefesa,
    bonusAtaque,
    bonusDefesa,
  };

  if (!critico && !pesado && rolagemAtaque + bonusAtaque <= rolagemDefesa + bonusDefesa) {
    const evento: Evento = rolagemDefesa >= 15
      ? { tipo: 'esquiva', ator: atacante.id, alvo: defensor.id }
      : { tipo: 'defesa', ator: atacante.id, alvo: defensor.id };
    cargas.set(defensor.id, Math.min(CARGA_PESADO, (cargas.get(defensor.id) ?? 0) + 1));
    return { evento, oculto: { ...base, dano: 0 }, acertou: false };
  }

  let dano = Math.max(1, bonus(atacante.stats.forca) + 6 + (critico ? 6 : 0) - bonus(defensor.stats.vitalidade));
  if (defensor.passiva === 'resistencia') dano = Math.max(1, dano - 2);
  if (pesado) dano = Math.ceil(dano * BONUS_PESADO);
  defensor.hp = Math.max(0, defensor.hp - dano);
  if (atacante.passiva === 'rede') presos.add(defensor.id);

  return {
    evento: { tipo: 'acerto', ator: atacante.id, alvo: defensor.id, dano, critico, hpRestante: defensor.hp, pesado },
    oculto: { ...base, dano, pesado },
    acertou: true,
  };
}

interface Status {
  tipo: TipoEfeito;
  rodadas: number;
  dano: number;
}

/** Fração do HP máximo abaixo da qual o lutador se rende nas lutas de honra e no Poço. */
export const RENDICAO_PADRAO = 0.25;

export type Lado = 'A' | 'B';

export interface OpcoesEquipe extends OpcoesLuta {
  /** Fração do HP máximo abaixo da qual o lutador se rende. Sem valor: luta até a morte. */
  rendicao?: number;
}

export interface ResultadoEquipe {
  vencedorLado: Lado;
  eventos: Evento[];
  ocultos: RegistroOculto[];
  efeitosAplicados: EfeitoAplicado[];
}

/**
 * Luta entre equipes de 1 ou 2 lutadores por lado. A cada rodada, cada lutador vivo
 * ataca um inimigo vivo, por ordem de agilidade. Em rendição, ninguém morre: quem cai
 * abaixo do limite se rende. Sem rendição, o lutador com HP zerado morre.
 */
export function simularEquipes(
  ladoA: Fighter[],
  ladoB: Fighter[],
  seed: number,
  opcoes: OpcoesEquipe = {},
): ResultadoEquipe {
  const rng = new Rng(seed);
  const eventos: Evento[] = [];
  const ocultos: RegistroOculto[] = [];
  const efeitosAplicados: EfeitoAplicado[] = [];
  const statuses = new Map<string, Status[]>();
  const atordoados = new Set<string>();
  const presos = new Set<string>();
  const cargas = new Map<string, number>();
  const fora = new Set<string>();
  const chance = opcoes.chanceEfeito ?? CHANCE_EFEITO_PADRAO;
  const lados = new Map<string, Lado>();
  for (const f of ladoA) lados.set(f.id, 'A');
  for (const f of ladoB) lados.set(f.id, 'B');
  const todos = [...ladoA, ...ladoB];
  const vivos = (lado: Lado): Fighter[] => (lado === 'A' ? ladoA : ladoB).filter((f) => !fora.has(f.id));

  const aplicarEfeito = (alvo: Fighter, tipo: TipoEfeito): void => {
    eventos.push({ tipo: 'aplicado', alvo: alvo.id, nome: tipo });
    efeitosAplicados.push({ alvo: alvo.id, tipo });
    const lista = statuses.get(alvo.id) ?? [];
    if (tipo === 'sangramento') lista.push({ tipo, rodadas: 2, dano: 2 });
    if (tipo === 'envenenamento') lista.push({ tipo, rodadas: 4, dano: 1 });
    if (tipo === 'queimadura') lista.push({ tipo, rodadas: 1, dano: 3 });
    if (tipo === 'contusao') atordoados.add(alvo.id);
    statuses.set(alvo.id, lista);
  };

  /** Mortal: HP zerado é morte. Rendição: ninguém morre; cair abaixo do limite é render-se. */
  const apurar = (f: Fighter): void => {
    if (fora.has(f.id)) return;
    if (opcoes.rendicao === undefined) {
      if (f.hp <= 0) {
        eventos.push({ tipo: 'morte', alvo: f.id });
        fora.add(f.id);
      }
      return;
    }
    if (f.hp <= 0) f.hp = 1;
    if (f.hp <= f.hpMax * opcoes.rendicao) {
      eventos.push({ tipo: 'rendicao', alvo: f.id });
      fora.add(f.id);
    }
  };

  const ultima = new Map<string, number>();
  /** Emite eventos de carga só quando a barra de alguém muda. */
  const anunciarCarga = (...fs: Fighter[]): void => {
    for (const f of fs) {
      const v = cargas.get(f.id) ?? 0;
      if (ultima.get(f.id) === v || (ultima.get(f.id) === undefined && v === 0)) continue;
      ultima.set(f.id, v);
      eventos.push({ tipo: 'carga', alvo: f.id, valor: v, max: CARGA_PESADO });
    }
  };

  const golpear = (rodada: number, atq: Fighter, def: Fighter): void => {
    const { evento, oculto, acertou } = resolverAtaque(atq, def, rng, rodada, presos, cargas);
    eventos.push(evento);
    ocultos.push(oculto);
    anunciarCarga(atq, def);
    if (acertou && def.hp > 0 && opcoes.efeitosPoco && rng.next() < chance) {
      aplicarEfeito(def, TIPOS_EFEITO[rng.int(0, TIPOS_EFEITO.length - 1)]);
    }
    apurar(def);
    if (acertou && atq.passiva === 'sequencia' && !fora.has(def.id) && rng.next() < CHANCE_SEQUENCIA) {
      const extra = resolverAtaque(atq, def, rng, rodada, presos, cargas);
      eventos.push(extra.evento);
      ocultos.push(extra.oculto);
      anunciarCarga(atq, def);
      apurar(def);
    }
  };

  for (let rodada = 1; rodada <= MAX_RODADAS && vivos('A').length > 0 && vivos('B').length > 0; rodada++) {
    const ordem = todos
      .filter((f) => !fora.has(f.id))
      .sort((x, y) => y.stats.agilidade - x.stats.agilidade);
    for (const atq of ordem) {
      if (fora.has(atq.id)) continue;
      const inimigos = vivos(lados.get(atq.id) === 'A' ? 'B' : 'A');
      if (inimigos.length === 0) break;
      if (atordoados.has(atq.id)) {
        atordoados.delete(atq.id);
        eventos.push({ tipo: 'atordoado', alvo: atq.id });
        continue;
      }
      golpear(rodada, atq, inimigos[rng.int(0, inimigos.length - 1)]);
    }

    // Efeitos do Poço ativos: causam dano no fim da rodada.
    for (const f of todos) {
      if (fora.has(f.id)) continue;
      const lista = statuses.get(f.id) ?? [];
      for (const s of lista) {
        if (s.rodadas <= 0 || fora.has(f.id)) continue;
        f.hp = Math.max(0, f.hp - s.dano);
        s.rodadas -= 1;
        eventos.push({ tipo: 'efeito', alvo: f.id, nome: s.tipo, dano: s.dano, hpRestante: f.hp });
        apurar(f);
      }
      statuses.set(f.id, lista.filter((s) => s.rodadas > 0));
    }
  }

  const aVivo = vivos('A').length > 0;
  const bVivo = vivos('B').length > 0;
  let vencedorLado: Lado;
  if (aVivo !== bVivo) {
    vencedorLado = aVivo ? 'A' : 'B';
  } else {
    const somaA = ladoA.reduce((t, f) => t + f.hp, 0);
    const somaB = ladoB.reduce((t, f) => t + f.hp, 0);
    if (somaA !== somaB) {
      vencedorLado = somaA > somaB ? 'A' : 'B';
    } else {
      const vitA = ladoA.reduce((t, f) => t + f.stats.vitalidade, 0);
      const vitB = ladoB.reduce((t, f) => t + f.stats.vitalidade, 0);
      vencedorLado = vitA >= vitB ? 'A' : 'B';
    }
  }

  return { vencedorLado, eventos, ocultos, efeitosAplicados };
}

/** Luta 1 contra 1 até a morte (compatibilidade com os testes e com o motor antigo). */
export function simularLuta(a: Fighter, b: Fighter, seed: number, opcoes: OpcoesLuta = {}): ResultadoLuta {
  const r = simularEquipes([a], [b], seed, opcoes);
  return {
    vencedor: r.vencedorLado === 'A' ? a.id : b.id,
    eventos: r.eventos,
    ocultos: r.ocultos,
    efeitosAplicados: r.efeitosAplicados,
  };
}
