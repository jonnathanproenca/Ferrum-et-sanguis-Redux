// Bot que joga a campanha inteira. Rodar: npx vite-node scripts/balance-campanha.ts [seeds] [estilo: lutador|treinador|misto]
import { Rng } from '../src/core/rng';
import {
  novoJogo, avancarTurno, construirMelhoria, custoMelhoria, recrutar, precoRecruta, comprarItem, comprarMestre, precoItem, equipar,
  treinar, trocarClasse, tratar, lutarArena, lutarCampanha, proximoDesafio, escolherEstilo, arenaLiberada, ARENAS, PASSOS, LANISTAS,
  DIFICULDADES_ORDEM, REGRAS, estatisticas, valorRequisito, capacidadeLudus, temMelhoria, batalhasDoLudus,
  type Estado, type Dificuldade, type MelhoriaId,
} from '../src/core/game';
import { CLASSES_IDS, ITENS, SLOTS, ATRIBUTOS, itemPorId, statsDoGladiador, qualidadeDe, type Gladiador, type ClasseId } from '../src/core/model';

const SEEDS = Number(process.argv[2] ?? 20);
const ESTILOS = (process.argv[3] ?? 'misto').split(',');
const MAX_TURNOS = 400;

interface Resultado {
  concluiu: boolean; turnos: number; passo: number; mortesCampanha: number; derrotasCampanha: number; tentativas: number;
  lutas: number; vitorias: number; mortes: number; ouro: number; falido: boolean;
  porArena: Record<string, [number, number]>; passoTurno: number[]; nivelMax: number;
}

const poder = (g: Gladiador): number => { const s = statsDoGladiador(g); return s.forca + s.agilidade + s.vitalidade + s.sorte; };
const vivosComEstilo = (e: Estado) => e.gladiadores.filter((g) => g.vivo && !g.semEstilo);

function jogar(dif: Dificuldade, seed: number, estilo: string): Resultado {
  const rng = new Rng(seed * 31 + 7);
  const casas = LANISTAS.filter((l) => l.id !== 'batiatus');
  const e = novoJogo(seed, casas[seed % casas.length].id, { dificuldade: dif });
  const r: Resultado = { concluiu: false, turnos: 0, passo: 0, mortesCampanha: 0, derrotasCampanha: 0, tentativas: 0, lutas: 0, vitorias: 0, mortes: 0, ouro: 0, falido: false, porArena: {}, passoTurno: [], nivelMax: 1 };
  const treinoPorTres = estilo === 'treinador' ? 2 : estilo === 'lutador' ? 0 : 1;
  const recentes: Record<string, boolean[]> = {};
  const pocoAlvo = (): number => {
    const d = proximoDesafio(e);
    const q = d?.passo.requisitos.find((x) => x.tipo === 'gladiadorPoco');
    return q && !d!.requisitos.find((x) => x.texto.includes('Poço'))?.ok ? valorRequisito(e, q) : 0;
  };

  const tentar = (fn: () => void): boolean => { try { fn(); return true; } catch { return false; } };
  /** Jogador cuidadoso: simula a luta em cópias do estado e estima a chance de vitória. */
  const chance = (fn: (c: Estado) => boolean, n = 20): number => {
    let w = 0;
    for (let i = 0; i < n; i++) {
      const c = structuredClone(e);
      c.semente = ((e.semente + i * 7919) % 2147483645) + 1;
      c.energia = 99;
      try { if (fn(c)) w += 1; } catch { /* inválido */ }
    }
    return w / n;
  };
  const cache = new Map<string, number>();
  const memo = (k: string, f: () => number): number => { const kk = `${e.turno}|${k}`; if (!cache.has(kk)) cache.set(kk, f()); return cache.get(kk)!; };
  let esperaCampanha = 0;
  let pocoFraco = '';

  const melhorar = (): void => {
    const ordem: MelhoriaId[] = ['palus', 'armaria', 'alojamentos', 'enfermaria', 'refeitorio'];
    for (const id of ordem) if (!temMelhoria(e, id) && e.ouro >= custoMelhoria(e, id) + 60) { tentar(() => construirMelhoria(e, id)); break; }
  };
  const classeNecessaria = (): ClasseId | undefined => {
    const d = proximoDesafio(e);
    const q = d?.passo.requisitos.find((x) => x.tipo === 'gladiadorVitorias' && x.classe);
    if (!q || !q.classe) return undefined;
    return e.gladiadores.some((g) => g.vivo && g.classe === q.classe) ? undefined : (q.classe as ClasseId);
  };
  const recrutarSeDaPara = (): void => {
    const alvo = Math.min(capacidadeLudus(e), temMelhoria(e, 'alojamentos') ? 5 : 3);
    while (e.gladiadores.length < alvo) {
      const bar = [...e.mercado].sort((a, b) => precoRecruta(e, a) - precoRecruta(e, b))[0];
      if (!bar || e.ouro < precoRecruta(e, bar) + 80) break;
      const id = bar.id;
      if (!tentar(() => recrutar(e, id))) break;
      tentar(() => escolherEstilo(e, id, classeNecessaria() ?? CLASSES_IDS[rng.int(0, 3)]));
    }
    for (const g of e.gladiadores) if (g.semEstilo) tentar(() => escolherEstilo(e, g.id, classeNecessaria() ?? CLASSES_IDS[rng.int(0, 3)]));
  };
  const equipar_ = (): void => {
    if (!temMelhoria(e, 'armaria')) return;
    // ofertas do mestre primeiro (qualidade), depois itens comuns.
    for (const id of [...(e.armeiroMestre ?? [])]) {
      const it = itemPorId(id);
      if (e.ouro < precoItem(e, it) + 120) continue;
      const alvo = vivosComEstilo(e).filter((g) => it.classes.includes(g.classe) && qualidadeDe(g.equipamento[it.slot]) < it.qualidade).sort((a, b) => poder(b) - poder(a))[0];
      if (alvo && tentar(() => comprarMestre(e, id))) tentar(() => equipar(e, alvo.id, it.slot, id));
    }
    const dq = proximoDesafio(e);
    const rq = dq?.passo.requisitos.find((x) => x.tipo === 'gladiadorEquipado');
    if (rq?.item) {
      const it = itemPorId(rq.item);
      const g = vivosComEstilo(e).find((x) => it.classes.includes(x.classe));
      if (g && e.ouro >= precoItem(e, it)) { if (tentar(() => comprarItem(e, rq.item!))) tentar(() => equipar(e, g.id, it.slot, rq.item!)); }
    }
    for (const g of vivosComEstilo(e).sort((a, b) => poder(b) - poder(a)).slice(0, 3)) {
      for (const slot of SLOTS) {
        const atual = g.equipamento[slot];
        if (atual && !itemPorId(atual).basico) continue;
        const cand = ITENS.filter((i) => i.slot === slot && i.classes.includes(g.classe) && !i.basico).sort((a, b) => b.preco - a.preco);
        const pick = cand.find((i) => e.ouro >= precoItem(e, i) + 120);
        if (pick) { const q = qualidadeDe(atual); const id = q > 0 ? `${pick.id}@${q}` : pick.id; void id; if (tentar(() => comprarItem(e, pick.id))) tentar(() => equipar(e, g.id, slot, pick.id)); }
      }
    }
  };
  const melhorArena = (g: Gladiador): string => {
    const honra = ARENAS.filter((a) => a.honra && arenaLiberada(e, a).liberada);
    for (let i = honra.length - 1; i >= 1; i--) {
      if (memo(`ar${g.id}${honra[i].id}`, () => chance((c) => lutarArena(c, [g.id], honra[i].id).vitoriaA, 12)) >= 0.6) return honra[i].id;
    }
    void recentes; return 'pompeia';
  };
  const treinarUm = (): boolean => {
    if (!temMelhoria(e, 'palus')) return false;
    const top = vivosComEstilo(e).sort((a, b) => poder(b) - poder(a)).slice(0, 2);
    const soma = (x: Gladiador) => ATRIBUTOS.reduce((t, k) => t + x.treino[k], 0);
    const g = (pocoFraco && vivosComEstilo(e).find((x) => x.id === pocoFraco)) || foco() || top.sort((a, b) => soma(a) - soma(b))[0];
    if (!g) return false;
    const livres = ATRIBUTOS.filter((k) => g.treino[k] < 10);
    if (!livres.length) { const outro = top.find((x) => x.id !== g.id); if (!outro) return false; return tentar(() => treinar(e, outro.id, ATRIBUTOS.filter((k) => outro.treino[k] < 10).sort((x, y) => outro.treino[x] - outro.treino[y])[0] ?? 'forca')); }
    const a = livres.sort((x, y) => g.treino[x] - g.treino[y])[0];
    return tentar(() => treinar(e, g.id, a));
  };
  /** Gladiador da classe exigida pelo passo, enquanto ainda não tem as vitórias pedidas. */
  const foco = (): Gladiador | undefined => {
    const d = proximoDesafio(e);
    const q = d?.passo.requisitos.find((x) => x.tipo === 'gladiadorVitorias' && x.classe);
    if (!q || !q.classe) return undefined;
    const need = valorRequisito(e, q);
    return vivosComEstilo(e).filter((x) => x.classe === q.classe && x.vitorias < need).sort((a, b) => poder(b) - poder(a))[0];
  };
  const lutarHonra = (): boolean => {
    const g = foco() ?? vivosComEstilo(e).filter((x) => !x.pocoOnly).sort((a, b) => poder(b) - poder(a))[0];
    if (!g) return false;
    const arenaId = g.pocoOnly ? 'poco' : melhorArena(g);
    if (g.pocoOnly && memo(`pocofoco${g.id}`, () => chance((c) => lutarArena(c, [g.id], 'poco').vitoriaA, 12)) < 0.5) return false;
    let ok = false;
    tentar(() => {
      const p = lutarArena(e, [g.id], arenaId);
      ok = true; r.lutas += 1; if (p.vitoriaA) r.vitorias += 1;
      (r.porArena[arenaId] ??= [0, 0])[p.vitoriaA ? 0 : 1] += 1;
      (recentes[arenaId] ??= []).push(p.vitoriaA); if (recentes[arenaId].length > 8) recentes[arenaId].shift();
    });
    return ok;
  };
  const lutarPoco = (): boolean => {
    const alvo = pocoAlvo();
    if (!alvo) return false;
    const fc = foco();
    const cand = vivosComEstilo(e).filter((x) => !x.campeao && !x.lenda && x.id !== fc?.id).sort((a, b) => b.vitoriasPoco - a.vitoriasPoco || poder(b) - poder(a))[0];
    if (!cand) return false;
    if (e.gladiadores.some((x) => x.vivo && x.vitoriasPoco >= alvo)) return false;
    if (memo(`poco${cand.id}`, () => chance((c) => lutarArena(c, [cand.id], 'poco').vitoriaA, 12)) < 0.55) { pocoFraco = cand.id; return false; }
    pocoFraco = '';
    let ok = false;
    tentar(() => {
      const p = lutarArena(e, [cand.id], 'poco'); ok = true; r.lutas += 1; if (p.vitoriaA) r.vitorias += 1;
      (r.porArena.poco ??= [0, 0])[p.vitoriaA ? 0 : 1] += 1;
    });
    if (ok) for (const g of e.gladiadores) if (g.efeitos.length && temMelhoria(e, 'enfermaria') && e.energia > 0 && e.ouro > 80) tentar(() => tratar(e, g.id));
    return ok;
  };
  const tentarCampanha = (): boolean => {
    const d = proximoDesafio(e);
    if (!d || !d.pronto) return false;
    const formato = d.passo.formato ?? 1;
    if (e.energia < formato) return false;
    const time = vivosComEstilo(e).sort((a, b) => poder(b) - poder(a)).slice(0, formato);
    if (time.length < formato) return false;
    const ids = time.map((g) => g.id);
    if (!cache.has(`${e.turno}|camp-contou`)) { esperaCampanha += 1; cache.set(`${e.turno}|camp-contou`, 1); }
    const minimo = esperaCampanha > 80 ? 0.45 : esperaCampanha > 40 ? 0.6 : 0.75;
    if (memo(`camp${ids.join()}`, () => chance((c) => lutarCampanha(c, ids).vitoriaA, 16)) < minimo) return false;
    esperaCampanha = 0;
    const antes = e.campanha;
    let ok = false;
    tentar(() => {
      const mortesAntes = estatisticas(e).mortes;
      const p = lutarCampanha(e, time.map((g) => g.id));
      ok = true; r.tentativas += 1;
      if (!p.vitoriaA) { r.derrotasCampanha += 1; r.mortesCampanha += estatisticas(e).mortes - mortesAntes; }
      else r.mortesCampanha += estatisticas(e).mortes - mortesAntes;
    });
    if (e.campanha > antes) r.passoTurno[antes] = e.turno;
    return ok;
  };

  while (e.turno <= MAX_TURNOS && proximoDesafio(e)) {
    melhorar(); recrutarSeDaPara();
    const falta = classeNecessaria();
    if (falta) {
      const scrub = vivosComEstilo(e).filter((x) => !x.campeao && !x.lenda).sort((a, b) => poder(a) - poder(b))[0];
      if (scrub) tentar(() => trocarClasse(e, scrub.id, falta));
    }
    equipar_();
    let k = 0;
    while (e.energia > 0) {
      if (tentarCampanha()) { k += 1; continue; }
      if (vivosComEstilo(e).length === 0) break;
      const treinar_ = treinoPorTres > 0 && k % 3 >= 3 - treinoPorTres;
      if (treinar_ && treinarUm()) { k += 1; continue; }
      if (lutarPoco()) { k += 1; continue; }
      if (lutarHonra()) { k += 1; continue; }
      if (treinarUm()) { k += 1; continue; }
      break;
    }
    if (e.gladiadores.every((g) => !g.vivo) && e.ouro < 80) { r.falido = true; break; }
    if (!tentar(() => avancarTurno(e))) { e.energia = 0; tentar(() => avancarTurno(e)); }
    for (const g of e.gladiadores) r.nivelMax = Math.max(r.nivelMax, g.nivel);
  }
  if (process.env.DBG && proximoDesafio(e)) {
    const d = proximoDesafio(e)!;
    console.log(`[seed ${seed}] travado no passo ${e.campanha + 1} turno ${e.turno} ouro ${e.ouro} req:`, d.requisitos.map((x) => `${x.ok ? 'OK' : 'FALTA'} ${x.texto}`).join(' ; '));
    for (const g of e.gladiadores) console.log(`   ${g.nome} ${g.classe} nv${g.nivel} v${g.vitorias} p${g.vitoriasPoco} poder ${poder(g)} camp=${g.campeao} lenda=${g.lenda} pocoOnly=${g.pocoOnly} semEstilo=${g.semEstilo} treino=${JSON.stringify(g.treino)}`);
  }
  r.concluiu = !proximoDesafio(e);
  r.turnos = e.turno; r.passo = e.campanha; r.mortes = estatisticas(e).mortes; r.ouro = estatisticas(e).ouroGanho;
  return r;
}

const med = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
void PASSOS; void REGRAS; void batalhasDoLudus;
for (const estilo of ESTILOS) {
  console.log(`\n##### estilo do bot: ${estilo}`);
  for (const dif of DIFICULDADES_ORDEM) {
    const rs: Resultado[] = [];
    for (let s = 1; s <= SEEDS; s++) rs.push(jogar(dif, s, estilo));
    const fim = rs.filter((x) => x.concluiu);
    const arenas = ['pompeia', 'capua', 'coliseu', 'poco'].map((a) => {
      const w = rs.reduce((t, x) => t + (x.porArena[a]?.[0] ?? 0), 0), l = rs.reduce((t, x) => t + (x.porArena[a]?.[1] ?? 0), 0);
      return `${a} ${w + l ? Math.round((100 * w) / (w + l)) : '-'}% (${w + l})`;
    }).join(' | ');
    const passos = PASSOS.map((_, i) => Math.round(med(rs.filter((x) => x.passoTurno[i]).map((x) => x.passoTurno[i])))).join(',');
    console.log(`${REGRAS[dif].nome.padEnd(8)} concluiu ${fim.length}/${rs.length} | turnos(med) ${Math.round(med(rs.map((x) => x.turnos)))} | passo méd ${med(rs.map((x) => x.passo)).toFixed(1)}/10 | tentativas/seed ${med(rs.map((x) => x.tentativas)).toFixed(1)} derrotas camp ${med(rs.map((x) => x.derrotasCampanha)).toFixed(1)} | mortes ${med(rs.map((x) => x.mortes)).toFixed(1)} | ouro ${Math.round(med(rs.map((x) => x.ouro)))} | falidos ${rs.filter((x) => x.falido).length} | nível máx ${med(rs.map((x) => x.nivelMax)).toFixed(1)}`);
    console.log(`         passos finais por seed: ${rs.map((x) => x.passo).join(',')}`);
    console.log(`         turno em que cada passo cai (med): ${passos}`);
    console.log(`         ${arenas}`);
  }
}
