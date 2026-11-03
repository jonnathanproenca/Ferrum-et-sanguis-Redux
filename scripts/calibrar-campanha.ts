// Calibra REGRAS[dif].campMult por passo: bisseção para que o patamar "esperado" vença com a taxa-alvo.
import { Rng } from '../src/core/rng';
import { novoJogo, lutarCampanha, REGRAS, PASSOS, LANISTAS, type Estado, type Dificuldade } from '../src/core/game';
import { CLASSES_IDS } from '../src/core/model';
import { PATAMARES, montar } from './sim-lib';

const N = Number(process.argv[2] ?? 30);
function taxa(dif: Dificuldade, passo: number, p: number): number {
  const t = PATAMARES[Math.max(0, Math.min(9, p))];
  const formato = PASSOS[passo].formato ?? 1;
  let w = 0, tot = 0;
  for (let i = 0; i < N; i++) for (const classe of CLASSES_IDS) {
    const casas = LANISTAS.filter((l) => l.id !== 'batiatus');
    const e: Estado = novoJogo(10 + i, casas[i % casas.length].id, { dificuldade: dif });
    e.cheats = { energia: true, campanha: true };
    e.campanha = passo;
    const rng = new Rng(i * 13 + passo * 7 + classe.length);
    e.gladiadores = [];
    const ids: string[] = [];
    for (let k = 0; k < formato; k++) { const g = montar(rng, classe, t); g.id = `a${k}`; e.gladiadores.push(g); ids.push(g.id); }
    try { if (lutarCampanha(e, ids).vitoriaA) w += 1; } catch { /* */ }
    tot += 1;
  }
  return (w / tot) * 100;
}
const OFFSET: Record<Dificuldade, number> = { facil: -1, medio: 0, dificil: 0, extremo: 1 };
const ALVO: Record<Dificuldade, number> = { facil: 85, medio: 70, dificil: 60, extremo: 62 };
const FINAL: Record<Dificuldade, number> = { facil: 90, medio: 75, dificil: 60, extremo: 50 };
const saida: Record<string, number[]> = {};
for (const dif of ['facil', 'medio', 'dificil', 'extremo'] as Dificuldade[]) {
  const mults: number[] = [];
  for (let i = 0; i < PASSOS.length; i++) {
    const alvo = i === 9 ? FINAL[dif] : ALVO[dif];
    let lo = 0.2, hi = 4;
    for (let k = 0; k < 9; k++) {
      const m = (lo + hi) / 2;
      REGRAS[dif].campMult[i] = m;
      if (taxa(dif, i, i + OFFSET[dif]) > alvo) lo = m; else hi = m;
    }
    mults.push(Math.round(((lo + hi) / 2) * 100) / 100);
    REGRAS[dif].campMult[i] = mults[i];
  }
  saida[dif] = mults;
  console.log(`${dif}: [${mults.join(', ')}]`);
}
