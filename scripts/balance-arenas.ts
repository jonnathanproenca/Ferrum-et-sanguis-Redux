// Simulação de balanceamento das arenas. Rodar: npx vite-node scripts/balance-arenas.ts [N]
import { ARENAS, DIFICULDADES_ORDEM, REGRAS } from '../src/core/game';
import { TIERS, celula } from './sim-lib';

const N = Number(process.argv[2] ?? 100); // lutas por classe em cada célula
const arenas = ARENAS.map((a) => a.id);
console.log(`Taxa de vitória (%), ${N * 4} lutas por célula (classes misturadas)\n`);
for (const dif of DIFICULDADES_ORDEM) {
  console.log(`== ${REGRAS[dif].nome} ==`);
  console.log(['tier'.padEnd(14), ...arenas.map((a) => a.padStart(8))].join(' '));
  for (const t of TIERS) {
    const linha = arenas.map((a, ai) => (celula(dif, a, t, N, 1000 + ai) * 100).toFixed(0).padStart(8));
    console.log([t.nome.padEnd(14), ...linha].join(' '));
  }
  console.log('');
}
