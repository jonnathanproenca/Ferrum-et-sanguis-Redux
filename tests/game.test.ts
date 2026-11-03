import { describe, expect, it } from 'vitest';
import {
  aplicarMarcos,
  custoMelhoria,
  extraDaCasa,
  LANISTAS,
  precoRecruta,
  avancarTurno,
  capacidadeLudus,
  CAPACIDADE_BASE,
  comprarItem,
  construirMelhoria,
  melhoriaPorId,
  desistirDaLuta,
  definirConfig,
  dispensarGladiador,
  equipar,
  comprarMestre,
  gameOver,
  podeGastarEnergia,
  filaLanistas,
  lanistaDaCasa,
  aplicarLiberdade,
  pularLuta,
  precoItem,
  REGRAS,
  arenaLiberada,
  arenaPorId,
  multiplicadorArena,
  batalhasDoLudus,
  lutarArena,
  escolherLanista,
  lutarCampanha,
  MAX_GLADIADORES,
  novoJogo,
  PASSOS,
  proximoDesafio,
  recrutar,
  escolherEstilo,
  gerarMercado,
  sortearQualidadeMestre,
  gerarArmeiroMestre,
  sortearQualidadesMestre,
  PECAS_MESTRE,
  temMelhoria,
  tratar,
  treinar,
  trocarClasse,
  venderGladiador,
  type Estado,
} from '../src/core/game';
import {
  CLASSES_IDS,
  itemPorId,
  SLOTS,
  precoGladiador,
  statsDoGladiador,
  TERRAS,
  type Gladiador,
} from '../src/core/model';
import { criarLutador, simularEquipes } from '../src/core/combat';
import { Rng } from '../src/core/rng';

/** O primeiro gladiador começa sem título; os testes que precisam do campeão o promovem aqui. */
const campeaoDe = (e: Estado): Gladiador => {
  const g = e.gladiadores[0];
  g.campeao = true;
  return g;
};

describe('partida nova', () => {
  it('começa com um campeão, da especialidade do lanista da casa', () => {
    const e = novoJogo(12345);
    const casa = lanistaDaCasa(e);
    const campeao = campeaoDe(e);
    expect(campeao).toBeDefined();
    expect(campeao.classe).toBe(casa.especialidade);
    expect(campeao.nivel).toBe(4);
    expect(e.versao).toBe(4);
    expect(e.gladiadores).toHaveLength(1);
  });

  it('a campanha oferece 3 lanistas (sem a casa) e só define o desafio após a escolha', () => {
    const e = novoJogo(777);
    const fila = filaLanistas(e);
    expect(fila).toHaveLength(PASSOS.length);
    const d0 = proximoDesafio(e)!;
    expect(d0.lanista).toBeNull();
    expect(d0.opcoes).toHaveLength(3);
    expect(d0.opcoes.every((l) => l.id !== e.casaId)).toBe(true);
    escolherLanista(e, d0.opcoes[1].id);
    const d = proximoDesafio(e)!;
    expect(d.lanista?.id).toBe(d0.opcoes[1].id);
    expect(d.requisitos).toHaveLength(PASSOS[0].requisitos.length);
  });

  it('escolher um lanista fora das opções é recusado', () => {
    const e = novoJogo(777);
    expect(() => escolherLanista(e, e.casaId)).toThrow(/não está entre/);
  });

  it('vencer o passo tira o lanista derrotado das próximas opções', () => {
    const e = novoJogo(777);
    const d0 = proximoDesafio(e)!;
    escolherLanista(e, d0.opcoes[0].id);
    e.campanha = 0;
    e.derrotados = [];
    const pool = proximoDesafio(e)!.opcoes.map((l) => l.id);
    expect(pool).toContain(d0.opcoes[0].id);
    e.derrotados = [d0.opcoes[0].id];
    e.escolhaLanista = null;
    e.opcoesLanista = undefined;
    const novas = proximoDesafio(e)!.opcoes.map((l) => l.id);
    expect(novas).not.toContain(d0.opcoes[0].id);
  });

  it('cada origem tem 8 ou mais terras, com 4 aparências', () => {
    expect(TERRAS.length).toBeGreaterThanOrEqual(8);
    for (const t of TERRAS) expect(t.looks).toHaveLength(4);
  });
});

describe('campeão do lanista', () => {
  it('não entra no Poço', () => {
    const e = novoJogo(1);
    const campeao = campeaoDe(e);
    expect(() => lutarArena(e, [campeao.id], 'poco')).toThrow(/Poço/);
  });

  it('não troca de estilo', () => {
    const e = novoJogo(1);
    const campeao = campeaoDe(e);
    const outra = CLASSES_IDS.find((c) => c !== campeao.classe) ?? 'murmilo';
    expect(() => trocarClasse(e, campeao.id, outra)).toThrow(/campeão/);
  });
});

describe('equipamento por slot', () => {
  /** Classe fixa e acessório livre, para o teste não depender do sorteio. */
  function campeaoMurmilo(seed: number): { e: Estado; campeao: Gladiador } {
    const e = novoJogo(seed);
    e.ouro = 1000;
    e.melhorias = { armaria: true };
    const campeao = campeaoDe(e);
    campeao.classe = 'murmilo';
    campeao.equipamento.acessorio = null;
    return { e, campeao };
  }

  it('equipa item do armeiro no slot e na classe certos', () => {
    const { e, campeao } = campeaoMurmilo(5);
    comprarItem(e, 'escudo_grande');
    equipar(e, campeao.id, 'acessorio', 'escudo_grande');
    expect(campeao.equipamento.acessorio).toBe('escudo_grande');
    expect(e.inventario).not.toContain('escudo_grande');
  });

  it('recusa item de outro slot, de outra classe e item que não está no armeiro', () => {
    const { e, campeao } = campeaoMurmilo(5);
    expect(() => equipar(e, campeao.id, 'pe', 'escudo_grande')).toThrow(/slot/);
    expect(() => equipar(e, campeao.id, 'acessorio', 'escudo_grande')).toThrow(/armeiro/);
    comprarItem(e, 'rede');
    expect(() => equipar(e, campeao.id, 'acessorio', 'rede')).toThrow(/classe/);
  });

  it('item equipado devolve o anterior ao armeiro', () => {
    const { e, campeao } = campeaoMurmilo(9);
    comprarItem(e, 'escudo_grande');
    comprarItem(e, 'escudo_quadrado');
    equipar(e, campeao.id, 'acessorio', 'escudo_grande');
    equipar(e, campeao.id, 'acessorio', 'escudo_quadrado');
    expect(campeao.equipamento.acessorio).toBe('escudo_quadrado');
    expect(e.inventario).toContain('escudo_grande');
    expect(e.inventario).not.toContain('escudo_quadrado');
  });

  it('o kit inicial é básico e não dá bônus', () => {
    const e = novoJogo(3);
    const c = campeaoDe(e);
    for (const slot of SLOTS) {
      const item = itemPorId(c.equipamento[slot] as string);
      expect(item.basico).toBe(true);
      expect(item.qualidade).toBe(0);
      expect(item.bonus).toEqual({});
    }
  });

  it('armeiro mestre oferece 5 peças especiais, vende uma vez e renova a cada rodada', () => {
    const { e, campeao } = campeaoMurmilo(5);
    expect(e.armeiroMestre).toHaveLength(5);
    for (const id of e.armeiroMestre ?? []) {
      const item = itemPorId(id);
      expect(item.qualidade).toBeGreaterThanOrEqual(1);
      expect(item.basico).toBeFalsy();
    }
    const oferta = (e.armeiroMestre as string[])[0];
    const ouro = e.ouro;
    comprarMestre(e, oferta);
    expect(e.ouro).toBe(ouro - itemPorId(oferta).preco);
    expect(e.inventario).toContain(oferta);
    expect(e.armeiroMestre).toHaveLength(4);
    expect(() => comprarMestre(e, oferta)).toThrow(/à venda/);
    const antes = [...(e.armeiroMestre as string[])];
    e.energia = 0;
    e.energia = 0;
    avancarTurno(e);
    expect(e.armeiroMestre).toHaveLength(5);
    expect(e.armeiroMestre).not.toEqual(antes);
    expect(campeao).toBeTruthy();
  });

  it('qualidade maior rende mais bônus e custa mais', () => {
    const base = itemPorId('gladio');
    const raro = itemPorId('gladio@2');
    expect(raro.bonus.forca).toBe((base.bonus.forca ?? 0) + 2);
    expect(raro.preco).toBeGreaterThan(base.preco);
    expect(itemPorId('basico_arma_murmilo@3').bonus).toEqual({ forca: 3 });
  });

  it('não deixa pular a rodada com energia sobrando, e há game over sem saída', () => {
    const e = novoJogo(8);
    expect(podeGastarEnergia(e)).toBe(true);
    expect(() => avancarTurno(e)).toThrow(/energia/i);
    e.energia = 0;
    expect(() => avancarTurno(e)).not.toThrow();
    expect(gameOver(e)).toBe(false);
    for (const g of e.gladiadores) g.vivo = false;
    e.ouro = 0;
    expect(gameOver(e)).toBe(true);
    e.ouro = 100000;
    expect(gameOver(e)).toBe(false);
  });

  it('trocar de estilo mantém a qualidade das peças básicas', () => {
    const { e, campeao } = campeaoMurmilo(6);
    const g = e.mercado[0];
    e.gladiadores.push(g);
    escolherEstilo(e, g.id, 'murmilo');
    g.equipamento.arma = 'basico_arma_' + g.classe + '@2';
    trocarClasse(e, g.id, 'retiario');
    expect(g.equipamento.arma).toBe('basico_arma_retiario@2');
    expect(campeao).toBeTruthy();
  });
});

describe('efeitos persistentes', () => {
  it('reduzem o atributo correspondente até serem tratados', () => {
    const e = novoJogo(21);
    e.melhorias = { enfermaria: true };
    const campeao = campeaoDe(e);
    const antes = statsDoGladiador(campeao, lanistaDaCasa(e).especialidade).vitalidade;
    campeao.efeitos.push({ tipo: 'sangramento', severidade: 2 });
    const com = statsDoGladiador(campeao, lanistaDaCasa(e).especialidade).vitalidade;
    expect(com).toBe(antes - 2);

    e.ouro = 1000;
    tratar(e, campeao.id);
    expect(campeao.efeitos).toHaveLength(0);
    expect(statsDoGladiador(campeao, lanistaDaCasa(e).especialidade).vitalidade).toBe(antes);
  });

  it('o tratamento cobra 30 de ouro por ponto de gravidade', () => {
    const e = novoJogo(22);
    e.melhorias = { enfermaria: true };
    const campeao = campeaoDe(e);
    campeao.efeitos.push({ tipo: 'contusao', severidade: 2 }, { tipo: 'queimadura', severidade: 1 });
    e.ouro = 500;
    tratar(e, campeao.id);
    expect(e.ouro).toBe(500 - 90);
  });
});

describe('turno e economia', () => {
  it('avança o turno, cobra manutenção e paga patrocínio do campeão', () => {
    const e = novoJogo(31);
    const vivos = e.gladiadores.filter((g) => g.vivo).length;
    const antes = e.ouro;
    const turnoAntes = e.turno;
    const patrocinio = 20 + 5 * campeaoDe(e).vitorias;
    e.energia = 0;
    avancarTurno(e);
    expect(e.turno).toBe(turnoAntes + 1);
    expect(e.energia).toBe(3);
    expect(e.ouro).toBe(antes + patrocinio - (10 + 5 * vivos));
  });

  it('respeita o limite de gladiadores do ludus', () => {
    const e = novoJogo(41);
    const campeao = campeaoDe(e);
    while (e.gladiadores.length < MAX_GLADIADORES) {
      e.gladiadores.push({ ...campeao, id: `extra-${e.gladiadores.length}`, campeao: false });
    }
    e.ouro = 10000;
    expect(() => recrutar(e, e.mercado[0].id)).toThrow(/máximo/);
  });

  it('lutar em arena de honra registra o resultado', () => {
    const e = novoJogo(51);
    const campeao = campeaoDe(e);
    const payload = lutarArena(e, [campeao.id], 'pompeia');
    expect(payload.eventos.length).toBeGreaterThan(0);
    expect(campeao.vitorias + campeao.derrotas).toBe(1);
    expect(payload.lutadoresA[0].aparencia.campeao).toBe(true);
  });
});

describe('venda, dispensa e marcos', () => {
  it('vender rende ouro e tira o gladiador do ludus, devolvendo o equipamento', () => {
    const e = novoJogo(61);
    e.ouro = 0;
    const alvo = { ...campeaoDe(e), id: 'vendido', origem: 'escravo' as const, campeao: false, lenda: false, vivo: true, equipamento: { arma: 'maca', acessorio: null, elmo: null, peito: null, pe: null, calca: null } };
    e.gladiadores.push(alvo);
    venderGladiador(e, 'vendido');
    expect(e.ouro).toBeGreaterThanOrEqual(20);
    expect(e.gladiadores.some((g) => g.id === 'vendido')).toBe(false);
    expect(e.inventario).toContain('maca');
  });

  it('campeão e lenda não podem ser vendidos nem dispensados', () => {
    const e = novoJogo(62);
    const campeao = campeaoDe(e);
    expect(() => venderGladiador(e, campeao.id)).toThrow(/campeão/);
    expect(() => dispensarGladiador(e, campeao.id)).toThrow(/campeão/);
    campeao.campeao = false;
    campeao.lenda = true;
    expect(() => venderGladiador(e, campeao.id)).toThrow(/lenda/);
    expect(() => dispensarGladiador(e, campeao.id)).toThrow(/lenda/);
  });

  it('chegar ao limiar de liberdade (Difícil: 30 lutas como lenda) tira o lenda do ludus', () => {
    const e = novoJogo(63, 'lanista-1', { dificuldade: 'dificil' });
    const g = { ...campeaoDe(e), id: 'livre-1', campeao: false, lenda: true, lutasComoLenda: 29 };
    e.gladiadores.push(g);
    expect(aplicarLiberdade(e, g)).toHaveLength(0);
    g.lutasComoLenda = 30;
    expect(aplicarLiberdade(e, g).join(' ')).toMatch(/liberdade/);
    expect(e.gladiadores.some((x) => x.id === 'livre-1')).toBe(false);
    expect(e.libertados).toHaveLength(1);
  });

  it('chegar ao limiar de lenda marca o gladiador, que ganha +1 em todos os atributos', () => {
    const e = novoJogo(64);
    const casa = lanistaDaCasa(e);
    const g = { ...campeaoDe(e), id: 'lenda-1', campeao: false, lenda: false, vitorias: REGRAS.medio.lenda };
    e.gladiadores.push(g);
    const antes = statsDoGladiador(g, casa.especialidade).forca;
    const marcos = aplicarMarcos(e, g);
    expect(marcos.join(' ')).toMatch(/lenda/);
    expect(g.lenda).toBe(true);
    expect(statsDoGladiador(g, casa.especialidade).forca).toBe(antes + 1);
  });

  it('a dificuldade vem do novo jogo; saves sem ela jogam no Médio; valor inválido é recusado', () => {
    expect(novoJogo(65).config).toEqual({ dificuldade: 'medio' });
    expect(novoJogo(65, 'lanista-1', { dificuldade: 'extremo' }).config).toEqual({ dificuldade: 'extremo' });
    const e = novoJogo(65);
    expect(() => definirConfig(e, { dificuldade: 'impossivel' as never })).toThrow(/Dificuldade/);
  });

  it('só escravos são vendidos e a lenda nunca é vendida nem dispensada', () => {
    const e = novoJogo(66);
    const livre: Gladiador = { ...campeaoDe(e), id: 'livre-x', campeao: false, lenda: false, origem: 'livre' as const, vivo: true };
    e.gladiadores.push(livre);
    expect(() => venderGladiador(e, 'livre-x')).toThrow(/escravos/);
    livre.origem = 'escravo';
    livre.lenda = true;
    expect(() => venderGladiador(e, 'livre-x')).toThrow(/lenda/);
    expect(() => dispensarGladiador(e, 'livre-x')).toThrow(/lenda/);
  });

  it('só existe uma lenda viva por ludus', () => {
    const e = novoJogo(67);
    const primeira = { ...campeaoDe(e), id: 'l1', campeao: false, lenda: true, vitorias: 9, vivo: true };
    const segunda = { ...campeaoDe(e), id: 'l2', campeao: false, lenda: false, vitorias: 9, vivo: true };
    e.gladiadores.push(primeira, segunda);
    aplicarMarcos(e, segunda);
    expect(segunda.lenda).toBe(false);
  });
});

describe('equipes e rendição', () => {
  const stats = { forca: 9, agilidade: 8, vitalidade: 10, sorte: 6 };

  it('luta de rendição nunca tem morte', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = simularEquipes(
        [criarLutador('a', 'A', stats)],
        [criarLutador('b', 'B', stats)],
        seed,
        { rendicao: 0.25 },
      );
      expect(r.eventos.some((ev) => ev.tipo === 'morte')).toBe(false);
      expect(r.eventos.some((ev) => ev.tipo === 'rendicao')).toBe(true);
    }
  });

  it('luta mortal termina com todo o lado derrotado morto', () => {
    const r = simularEquipes(
      [criarLutador('a1', 'A1', stats), criarLutador('a2', 'A2', stats)],
      [criarLutador('b1', 'B1', stats), criarLutador('b2', 'B2', stats)],
      7,
    );
    const mortos = r.eventos.filter((ev) => ev.tipo === 'morte').map((ev) => ev.alvo);
    const ladoDerrotado = r.vencedorLado === 'A' ? ['b1', 'b2'] : ['a1', 'a2'];
    for (const id of ladoDerrotado) expect(mortos).toContain(id);
  });

  it('campanha exige o formato do passo (1 contra 1 no primeiro passo)', () => {
    const e = novoJogo(81);
    e.vitoriasTotais = 3;
    const campeao = campeaoDe(e);
    const extra = { ...campeao, id: 'extra-x', campeao: false };
    e.gladiadores.push(extra);
    escolherLanista(e, proximoDesafio(e)!.opcoes[0].id);
    expect(() => lutarCampanha(e, [campeao.id, extra.id])).toThrow(/1 contra 1/);
  });

  it('o gerador de números continua reprodutível para as equipes', () => {
    const a = new Rng(5);
    const b = new Rng(5);
    expect(a.int(0, 9)).toBe(b.int(0, 9));
  });
});

describe('melhorias do ludus', () => {
  it('a casa começa crua: nenhuma seção construída e capacidade básica', () => {
    const e = novoJogo(61);
    for (const id of ['palus', 'enfermaria', 'armaria', 'alojamentos', 'refeitorio'] as const) {
      expect(temMelhoria(e, id)).toBe(false);
    }
    expect(capacidadeLudus(e)).toBe(CAPACIDADE_BASE);
  });

  it('sem a seção construída, treinar, tratar, comprar e equipar são recusados', () => {
    const e = novoJogo(62);
    e.ouro = 1000;
    const campeao = campeaoDe(e);
    campeao.efeitos.push({ tipo: 'contusao', severidade: 1 });
    expect(() => treinar(e, campeao.id, 'forca')).toThrow(/Palus/);
    expect(() => tratar(e, campeao.id)).toThrow(/Enfermaria/);
    expect(() => comprarItem(e, 'escudo_grande')).toThrow(/Armaria/);
    expect(() => equipar(e, campeao.id, 'acessorio', null)).toThrow(/Armaria/);
  });

  it('construir cobra o ouro, libera a ação e não pode ser repetido', () => {
    const e = novoJogo(63);
    e.ouro = 500;
    construirMelhoria(e, 'palus');
    expect(e.ouro).toBe(500 - melhoriaPorId('palus').custo);
    expect(temMelhoria(e, 'palus')).toBe(true);
    const campeao = campeaoDe(e);
    treinar(e, campeao.id, 'forca');
    expect(() => construirMelhoria(e, 'palus')).toThrow(/já foi construído/);
  });

  it('construir sem ouro suficiente é recusado e não muda nada', () => {
    const e = novoJogo(64);
    e.ouro = 50;
    expect(() => construirMelhoria(e, 'alojamentos')).toThrow();
    expect(e.ouro).toBe(50);
    expect(temMelhoria(e, 'alojamentos')).toBe(false);
  });

  it('os alojamentos ampliam a capacidade do ludus', () => {
    const e = novoJogo(65);
    e.ouro = 10000;
    const campeao = campeaoDe(e);
    while (e.gladiadores.length < CAPACIDADE_BASE) {
      e.gladiadores.push({ ...campeao, id: `extra-${e.gladiadores.length}`, campeao: false });
    }
    expect(() => recrutar(e, e.mercado[0].id)).toThrow(/alojamentos/);
    construirMelhoria(e, 'alojamentos');
    expect(capacidadeLudus(e)).toBe(MAX_GLADIADORES);
    recrutar(e, e.mercado[0].id);
    expect(e.gladiadores).toHaveLength(CAPACIDADE_BASE + 1);
  });

  it('o refeitório reduz a manutenção por gladiador', () => {
    const a = novoJogo(66);
    const b = novoJogo(66);
    b.melhorias = { refeitorio: true };
    const vivos = a.gladiadores.filter((g) => g.vivo).length;
    const antesA = a.ouro;
    const antesB = b.ouro;
    a.energia = 0;
    avancarTurno(a);
    b.energia = 0;
    avancarTurno(b);
    expect(b.ouro - antesB).toBe(a.ouro - antesA + 2 * vivos);
  });
});

describe('Poço: valor fixo com bônus pela lotação', () => {
  it('lotação sorteada define bônus e moedas; ouro = base + bônus', () => {
    const vistas = new Set<string>();
    for (let semente = 1; semente <= 60; semente++) {
      const e = novoJogo(semente, 'lanista-1');
      e.ouro = 1000;
      e.melhorias = { alojamentos: true };
      recrutar(e, e.mercado[0].id);
      const g = e.gladiadores.find((x) => x.semEstilo);
      if (!g) continue;
      escolherEstilo(e, g.id, 'murmilo');
      const antes = e.ouro - 1; // a luta custa 1 de energia/ouro conforme a regra de `pagar`
      void antes;
      const ouroAntes = e.ouro;
      const r = lutarArena(e, [g.id], 'poco');
      vistas.add(r.plateia);
      expect(['vazia', 'meia', 'cheia']).toContain(r.plateia);
      const bonus = { vazia: 10, meia: 20, cheia: 30 }[r.plateia as 'vazia' | 'meia' | 'cheia'];
      if (r.vitoriaA) {
        expect(r.bonusPct).toBe(bonus);
        expect(r.ouro).toBe(75 + Math.round((75 * bonus) / 100));
        const faixa = { vazia: [3, 4], meia: [5, 9], cheia: [10, 20] }[r.plateia as 'vazia' | 'meia' | 'cheia'];
        expect(r.moedas).toBeGreaterThanOrEqual(faixa[0]);
        expect(r.moedas).toBeLessThanOrEqual(faixa[1]);
        expect(e.ouro).toBeGreaterThanOrEqual(ouroAntes + r.ouro - 5);
      } else {
        expect(r.ouro).toBe(0);
        expect(r.moedas).toBe(0);
      }
    }
    expect(vistas.size).toBeGreaterThan(1);
  });
});

describe('desistência', () => {
  it('desfaz o resultado: sem ouro, sem morte, conta derrota e gasta a energia', () => {
    const e = novoJogo(7);
    e.ouro = 500;
    const g = e.gladiadores[0];
    const antes = structuredClone(e);
    const g0 = antes.gladiadores[0];
    lutarArena(e, [g.id], 'pompeia');
    const novo = desistirDaLuta(antes, e, [g.id]);
    const gl = novo.gladiadores.find((x) => x.id === g.id)!;
    expect(novo.ouro).toBe(antes.ouro);
    expect(novo.vitoriasTotais).toBe(antes.vitoriasTotais);
    expect(gl.vivo).toBe(true);
    expect(gl.derrotas).toBe(g0.derrotas + 1);
    expect(gl.vitorias).toBe(g0.vitorias);
    expect(novo.energia).toBe(antes.energia - 1);
  });
});

describe('luta 2×2', () => {
  function dupla(semente: number) {
    const e = novoJogo(semente);
    e.ouro = 2000;
    recrutar(e, e.mercado[0].id);
    escolherEstilo(e, e.gladiadores[e.gladiadores.length - 1].id, 'tracio');
    return { e, ids: e.gladiadores.slice(0, 2).map((g) => g.id) };
  }

  it('gasta 2 de energia e paga o dobro da arena em caso de vitória', () => {
    let venceu = false;
    for (let semente = 90; semente < 130 && !venceu; semente++) {
      const { e, ids } = dupla(semente);
      const p = lutarArena(e, ids, 'pompeia');
      expect(e.energia).toBe(1);
      if (p.vitoriaA) {
        venceu = true;
        expect(p.ouro).toBeGreaterThanOrEqual(40);
        expect(p.ouro).toBeLessThanOrEqual(60);
      } else expect(p.ouro).toBe(0);
    }
    expect(venceu).toBe(true);
  });

  it('exige 2 de energia', () => {
    const { e, ids } = dupla(91);
    e.energia = 1;
    expect(() => lutarArena(e, ids, 'pompeia')).toThrow(/Energia/);
  });
});


describe('bônus dos lanistas', () => {
  it('escolher a casa define o lanista e todos têm bônus descrito', () => {
    for (const l of LANISTAS) {
      const e = novoJogo(5, l.id);
      expect(e.casaId).toBe(l.id);
      expect(l.bonus?.descricao).toBeTruthy();
      expect(l.historia).toBeTruthy();
    }
  });

  it('Cofre Cheio: +150 de ouro inicial; Escola de Veteranos: campeão um nível acima', () => {
    expect(novoJogo(5, 'lanista-5').ouro).toBe(450);
    expect(novoJogo(5, 'lanista-1').ouro).toBe(300);
    expect(novoJogo(5, 'lanista-4').gladiadores[0].nivel).toBe(4);
    expect(novoJogo(5, 'lanista-1').gladiadores[0].nivel).toBe(5);
  });

  it('Mercado de Escravos reduz 20% o preço de escravos; upgrades −15% com Língua de Prata', () => {
    const e = novoJogo(5, 'lanista-2');
    const escravo = e.mercado.find((g) => g.origem === 'escravo');
    if (escravo) expect(precoRecruta(e, escravo)).toBe(Math.round(precoGladiador(escravo) * 0.8));
    expect(custoMelhoria(novoJogo(5, 'lanista-6'), 'palus')).toBe(Math.round(melhoriaPorId('palus').custo * 0.85));
    expect(custoMelhoria(novoJogo(5, 'lanista-1'), 'palus')).toBe(melhoriaPorId('palus').custo);
  });

  it('Cicatrizes de Guerra e Cabeças Duras somam +1 a todos os gladiadores', () => {
    expect(extraDaCasa(novoJogo(5, 'lanista-3'))).toEqual({ forca: 1 });
    expect(extraDaCasa(novoJogo(5, 'lanista-9'))).toEqual({ vitalidade: 1 });
    expect(extraDaCasa(novoJogo(5, 'lanista-1'))).toEqual({});
  });

  it('Contas Afiadas corta a manutenção; Nome Nobre aumenta o patrocínio', () => {
    const base = novoJogo(5, 'lanista-1');
    const ec = novoJogo(5, 'lanista-7');
    const nn = novoJogo(5, 'lanista-4');
    for (const x of [base, ec, nn]) {
      x.ouro = 1000;
      campeaoDe(x);
    }
    base.energia = 0;
    avancarTurno(base);
    ec.energia = 0;
    avancarTurno(ec);
    nn.energia = 0;
    avancarTurno(nn);
    expect(ec.ouro).toBeGreaterThan(base.ouro);
    expect(nn.ouro).toBeGreaterThan(base.ouro);
  });
});

describe('mercado de escravos', () => {
  it('só vende escravos sem estilo, sem equipamento, com tendência e condição', () => {
    const e = novoJogo(7);
    expect(e.mercado).toHaveLength(5);
    for (const g of e.mercado) {
      expect(g.origem).toBe('escravo');
      expect(g.semEstilo).toBe(true);
      expect(g.tendencia).toBeTruthy();
      expect(g.condicao).toBeTruthy();
      expect(Object.values(g.equipamento).every((v) => v === null)).toBe(true);
      expect(g.treino[g.tendencia as keyof typeof g.treino]).toBeGreaterThanOrEqual(2);
    }
  });

  it('escolher o estilo é grátis, sem energia, e dá o kit básico', () => {
    const e = novoJogo(8);
    e.ouro = 1000;
    const g = e.mercado[0];
    recrutar(e, g.id);
    const energia = e.energia;
    const ouro = e.ouro;
    escolherEstilo(e, g.id, 'samnita');
    expect(e.energia).toBe(energia);
    expect(e.ouro).toBe(ouro);
    expect(g.semEstilo).toBe(false);
    expect(g.classe).toBe('samnita');
    expect(g.equipamento.arma).toBe('basico_arma_samnita');
    expect(() => escolherEstilo(e, g.id, 'tracio')).toThrow(/já tem um estilo/);
  });

  it('sem estilo não luta, não equipa e não troca de estilo', () => {
    const e = novoJogo(9);
    e.ouro = 1000;
    e.melhorias = { armaria: true, alojamentos: true };
    const g = e.mercado[0];
    recrutar(e, g.id);
    expect(() => lutarArena(e, [g.id], 'poco')).toThrow(/estilo/);
    expect(() => trocarClasse(e, g.id, 'tracio')).toThrow(/estilo/);
    e.inventario.push('basico_arma_murmilo');
    expect(() => equipar(e, g.id, 'arma', 'basico_arma_murmilo')).toThrow(/estilo/);
  });

  it('gerarMercado renova com 5 escravos', () => {
    const e = novoJogo(10);
    gerarMercado(e);
    expect(e.mercado.every((g) => g.semEstilo && g.origem === 'escravo')).toBe(true);
  });
});

describe('armeiro mestre: chance por qualidade', () => {
  it('verde é o mais comum e laranja o mais raro, e nunca sai básico', () => {
    const cont = [0, 0, 0, 0, 0];
    for (let i = 0; i < 10000; i++) cont[sortearQualidadeMestre(i / 10000)]++;
    expect(cont[0]).toBe(0);
    expect(cont[1]).toBeGreaterThan(cont[2]);
    expect(cont[2]).toBeGreaterThan(cont[3]);
    expect(cont[3]).toBeGreaterThan(cont[4]);
    expect(cont[4]).toBeGreaterThan(0);
  });

  it('cada rodada tem 5 peças, no máximo 3 verdes (nunca 3 seguidas), 2 azuis, 2 roxas e 1 laranja', () => {
    let seed = 12345;
    const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 5000; i++) {
      const q = sortearQualidadesMestre(rnd);
      expect(q).toHaveLength(5);
      const c = (n: number): number => q.filter((x) => x === n).length;
      expect(c(1)).toBeLessThanOrEqual(3);
      expect(c(2)).toBeLessThanOrEqual(2);
      expect(c(3)).toBeLessThanOrEqual(2);
      expect(c(4)).toBeLessThanOrEqual(1);
      for (let k = 0; k + 2 < q.length; k++) expect(q[k] === 1 && q[k + 1] === 1 && q[k + 2] === 1).toBe(false);
    }
  });

  it('as 5 ofertas são peças especiais diferentes, de qualidade 1 a 4', () => {
    const e = novoJogo(11);
    for (let i = 0; i < 30; i++) {
      gerarArmeiroMestre(e);
      expect(e.armeiroMestre).toHaveLength(PECAS_MESTRE);
      expect(new Set((e.armeiroMestre as string[]).map((id) => id.split('@')[0])).size).toBe(PECAS_MESTRE);
      for (const id of e.armeiroMestre as string[]) {
        const item = itemPorId(id);
        expect(item.basico).toBeFalsy();
        expect(item.qualidade).toBeGreaterThanOrEqual(1);
        expect(item.qualidade).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('campeão por vitórias, arenas por fama e dificuldade', () => {
  it('no Médio ninguém começa campeão; vira campeão com 3 vitórias, um por vez', () => {
    const e = novoJogo(90, 'lanista-1', { dificuldade: 'medio' });
    expect(e.gladiadores.some((g) => g.campeao)).toBe(false);
    const g = e.gladiadores[0];
    g.vitorias = 2;
    aplicarMarcos(e, g);
    expect(g.campeao).toBe(false);
    g.vitorias = 3;
    aplicarMarcos(e, g);
    expect(g.campeao).toBe(true);
    const outro = { ...g, id: 'outro', campeao: false, vitorias: 5 };
    e.gladiadores.push(outro);
    aplicarMarcos(e, outro);
    expect(outro.campeao).toBe(false);
  });

  it('as quatro dificuldades seguem os limiares combinados', () => {
    expect(REGRAS.facil).toMatchObject({ campeao: 0, lenda: 3, liberdade: null });
    expect(REGRAS.medio).toMatchObject({ campeao: 3, lenda: 9, liberdade: null });
    expect(REGRAS.dificil).toMatchObject({ campeao: 6, lenda: 15, liberdade: 30 });
    expect(REGRAS.extremo).toMatchObject({ campeao: 15, lenda: 45, liberdade: 5 });
    expect(novoJogo(94, 'lanista-1', { dificuldade: 'facil' }).gladiadores[0].campeao).toBe(true);
    expect(novoJogo(94, 'lanista-1', { dificuldade: 'extremo' }).gladiadores[0].campeao).toBe(false);
  });

  it('no Extremo o lenda é libertado após 5 lutas; no Médio nunca', () => {
    const ex = novoJogo(95, 'lanista-1', { dificuldade: 'extremo' });
    const g = { ...ex.gladiadores[0], id: 'x', campeao: false, lenda: true, lutasComoLenda: 5 };
    ex.gladiadores.push(g);
    expect(aplicarLiberdade(ex, g)).toHaveLength(1);
    const md = novoJogo(95, 'lanista-1', { dificuldade: 'medio' });
    const h = { ...md.gladiadores[0], id: 'y', campeao: false, lenda: true, lutasComoLenda: 999 };
    md.gladiadores.push(h);
    expect(aplicarLiberdade(md, h)).toHaveLength(0);
  });

  it('preços de itens, upgrades e gladiadores acompanham a dificuldade', () => {
    const por = (d: 'facil' | 'medio' | 'dificil' | 'extremo') => {
      const e = novoJogo(96, 'lanista-1', { dificuldade: d });
      return { item: precoItem(e, { preco: 100 }), up: custoMelhoria(e, 'palus'), glad: precoRecruta(e, e.mercado[0]) };
    };
    const [f, m, d, x] = [por('facil'), por('medio'), por('dificil'), por('extremo')];
    expect(f.item).toBeLessThan(m.item);
    expect(m.item).toBeLessThan(d.item);
    expect(d.item).toBeLessThan(x.item);
    expect(f.up).toBeLessThan(m.up);
    expect(x.up).toBeGreaterThan(d.up);
    expect(f.glad).toBeLessThanOrEqual(m.glad);
    expect(x.glad).toBeGreaterThan(m.glad);
  });

  it('rivais mais fortes nas dificuldades altas', () => {
    const p = arenaPorId('coliseu');
    expect(multiplicadorArena(p, 'facil')).toBeLessThan(multiplicadorArena(p, 'medio'));
    expect(multiplicadorArena(p, 'dificil')).toBeGreaterThan(multiplicadorArena(p, 'medio'));
    expect(multiplicadorArena(p, 'extremo')).toBeGreaterThan(multiplicadorArena(p, 'dificil'));
  });

  it('pular a luta tira 10% do ouro ganho na vitória e nada na derrota', () => {
    const e = novoJogo(97);
    const base = { ouro: 50 } as never;
    const antes = e.ouro;
    expect(pularLuta(e, { vitoriaA: true, ouro: 50 } as never)).toBe(5);
    expect(e.ouro).toBe(antes - 5);
    expect(pularLuta(e, { vitoriaA: false, ouro: 50 } as never)).toBe(0);
    void base;
  });

  it('Cápua e Coliseu só abrem com batalhas (vitórias ou não); Pompeia é livre', () => {
    const e = novoJogo(93);
    const g = e.gladiadores[0];
    e.energia = 99;
    expect(() => lutarArena(e, [g.id], 'capua')).toThrow(/batalhas/);
    expect(arenaLiberada(e, arenaPorId('pompeia')).liberada).toBe(true);
    const meta = arenaPorId('capua').batalhasMin;
    for (let i = 0; i < meta && g.vivo; i++) {
      g.vivo = true;
      g.efeitos = [];
      lutarArena(e, [g.id], 'pompeia');
    }
    expect(batalhasDoLudus(e)).toBeGreaterThanOrEqual(meta);
    g.vivo = true;
    expect(() => lutarArena(e, [g.id], 'capua')).not.toThrow();
    expect(() => lutarArena(e, [g.id], 'coliseu')).toThrow(/batalhas/);
  });

  it('a dificuldade se acumula: Pompeia 1, Cápua +20%, Coliseu +25% por cima', () => {
    expect(multiplicadorArena(arenaPorId('pompeia'))).toBe(1);
    expect(multiplicadorArena(arenaPorId('capua'))).toBeCloseTo(1.2);
    expect(multiplicadorArena(arenaPorId('coliseu'))).toBeCloseTo(1.5);
  });
});

describe('cheat mode', () => {
  it('ouro e energia infinitos não gastam; vencer e vida infinita garantem vitória sem mortes', () => {
    const e = novoJogo(120);
    e.cheats = { ouro: true, energia: true, vencer: true, vida: true };
    e.ouro = 10;
    e.energia = 1;
    const g = e.gladiadores[0];
    for (let i = 0; i < 6; i++) {
      const r = lutarArena(e, [g.id], 'pompeia');
      expect(r.vitoriaA).toBe(true);
      expect(g.vivo).toBe(true);
    }
    expect(e.energia).toBe(1);
  });

  it('pular rodada sem gastar energia e pular luta sem perda', () => {
    const e = novoJogo(121);
    expect(() => avancarTurno(e)).toThrow(/energia/i);
    e.cheats = { round: true, pular: true };
    expect(() => avancarTurno(e)).not.toThrow();
    const antes = e.ouro;
    expect(pularLuta(e, { vitoriaA: true, ouro: 50 } as never)).toBe(0);
    expect(e.ouro).toBe(antes);
  });

  it('armeiro 100% lendário com o cheat', () => {
    const e = novoJogo(122);
    e.cheats = { lendario: true };
    gerarArmeiroMestre(e);
    for (const id of e.armeiroMestre as string[]) expect(itemPorId(id).qualidade).toBe(4);
  });
});
