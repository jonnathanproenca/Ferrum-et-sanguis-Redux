// Biblioteca da simulação de arenas.
import { Rng } from '../src/core/rng';
import {
  novoJogo, lutarArena, DIFICULDADES_ORDEM, REGRAS, ARENAS,
  type Estado, type Dificuldade,
} from '../src/core/game';
import {
  ITENS, CLASSES_IDS, ATRIBUTOS, SLOTS, comQualidade, gerarGladiador, atualizarNivel,
  type ClasseId, type Gladiador, type Slot,
} from '../src/core/model';


export interface Tier { nome: string; nivel: number; treino: number; qual: number; itens: boolean | 'arma+escudo' }
export const TIERS: Tier[] = [
  { nome: 'cru', nivel: 1, treino: 0, qual: 0, itens: false },
  { nome: 'inicial', nivel: 2, treino: 4, qual: 0, itens: 'arma+escudo' },
  { nome: 'médio', nivel: 5, treino: 14, qual: 1, itens: true },
  { nome: 'forte', nivel: 9, treino: 28, qual: 2, itens: true },
  { nome: 'forte+', nivel: 9, treino: 28, qual: 3, itens: true },
  { nome: 'máximo', nivel: 14, treino: 40, qual: 4, itens: true },
  { nome: 'veterano cru', nivel: 9, treino: 0, qual: 0, itens: false },
  { nome: 'só equip. q4', nivel: 2, treino: 0, qual: 4, itens: true },
];

function itensDe(classe: ClasseId, slot: Slot) {
  return ITENS.filter((i) => i.slot === slot && i.classes.includes(classe) && !i.basico);
}

export function montar(rng: Rng, classe: ClasseId, t: Tier): Gladiador {
  const g = gerarGladiador(rng, 'sim', classe, t.nivel, 'escravo');
  g.treino = { forca: 0, agilidade: 0, vitalidade: 0, sorte: 0 };
  g.semEstilo = false;
  let pts = t.treino;
  while (pts > 0) {
    const a = ATRIBUTOS[rng.int(0, 3)];
    if (g.treino[a] < 10) { g.treino[a] += 1; pts -= 1; }
  }
  for (const slot of SLOTS) {
    const usar = t.itens === true || (t.itens === 'arma+escudo' && (slot === 'arma' || slot === 'acessorio'));
    const cand = usar ? itensDe(classe, slot) : [];
    const base = cand.length ? cand[rng.int(0, cand.length - 1)].id : `basico_${slot}_${classe}`;
    g.equipamento[slot] = comQualidade(base, t.qual);
  }
  g.xp = (t.nivel - 1) * 50;
  atualizarNivel(g);
  return g;
}

export function celula(dif: Dificuldade, arenaId: string, t: Tier, n: number, seed: number): number {
  const e: Estado = novoJogo(seed, undefined, { dificuldade: dif });
  e.cheats = { energia: true, ouro: true };
  e.batalhasTotais = 9999;
  const rng = new Rng(seed * 7 + 13);
  let vit = 0, tot = 0;
  for (let i = 0; i < n; i++) {
    for (const classe of CLASSES_IDS) {
      const g = montar(rng, classe, t);
      g.id = `sim${tot}`;
      e.gladiadores = [g];
      const p = lutarArena(e, [g.id], arenaId);
      if (p.vitoriaA) vit += 1;
      tot += 1;
      e.gladiadores = [];
      e.mercado = [];
    }
  }
  return vit / tot;
}


/** Progressão suave de 10 patamares: P0 (recém-recrutado) até P9 (tudo no máximo). */
export const PATAMARES: Tier[] = Array.from({ length: 10 }, (_, i) => ({
  nome: `P${i}`,
  nivel: Math.round(1 + (i * 14) / 9),
  treino: Math.round((i * 40) / 9),
  qual: Math.floor(i / 2.25),
  itens: i === 0 ? false : i === 1 ? 'arma+escudo' : true,
}));
