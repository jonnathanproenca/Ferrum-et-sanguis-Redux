// Taxa de vitória por passo da campanha para cada patamar de gladiador. Rodar: npx vite-node scripts/balance-boss.ts [N]
import { Rng } from '../src/core/rng';
import { novoJogo, lutarCampanha, DIFICULDADES_ORDEM, REGRAS, PASSOS, LANISTAS, type Estado, type Dificuldade } from '../src/core/game';
import { CLASSES_IDS } from '../src/core/model';
import { TIERS, montar } from './sim-lib';

const N = Number(process.argv[2] ?? 60);
const nomes = ['inicial', 'médio', 'forte', 'forte+', 'máximo'];
function taxa(dif: Dificuldade, passo: number, tier: string): number {
  const t = TIERS.find((x) => x.nome === tier)!;
  const formato = PASSOS[passo].formato ?? 1;
  let w = 0, tot = 0;
  for (let i = 0; i < N; i++) {
    for (const classe of CLASSES_IDS) {
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
  }
  return w / tot;
}
for (const dif of DIFICULDADES_ORDEM) {
  console.log(`== ${REGRAS[dif].nome}  (rival ×${REGRAS[dif].campForca} +${REGRAS[dif].campCresce}/passo) ==`);
  console.log('passo'.padEnd(26) + nomes.map((n) => n.padStart(8)).join(''));
  PASSOS.forEach((p, i) => console.log(`${String(i + 1).padStart(2)} ${p.titulo.slice(0, 22).padEnd(23)}` + nomes.map((n) => (taxa(dif, i, n) * 100).toFixed(0).padStart(8)).join('')));
}
