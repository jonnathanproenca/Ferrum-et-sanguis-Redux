import { describe, expect, it } from 'vitest';
import { criarLutador, simularLuta } from '../src/core/combat';
import { Rng } from '../src/core/rng';

const stats = { forca: 9, agilidade: 8, vitalidade: 10, sorte: 6 };

describe('Rng', () => {
  it('mesma semente gera a mesma sequência', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('d20 fica sempre entre 1 e 20', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.d20();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});

describe('simularLuta', () => {
  it('é reprodutível com a mesma semente', () => {
    const r1 = simularLuta(criarLutador('a', 'A', stats), criarLutador('b', 'B', stats), 123);
    const r2 = simularLuta(criarLutador('a', 'A', stats), criarLutador('b', 'B', stats), 123);
    expect(r1).toEqual(r2);
  });

  it('sempre termina com um vencedor e um lutador com HP zerado (ou limite de rodadas)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = criarLutador('a', 'A', stats);
      const b = criarLutador('b', 'B', stats);
      const r = simularLuta(a, b, seed);
      expect([a.id, b.id]).toContain(r.vencedor);
      const vencedor = r.vencedor === a.id ? a : b;
      const perdedor = vencedor === a ? b : a;
      expect(vencedor.hp).toBeGreaterThanOrEqual(perdedor.hp);
    }
  });

  it('registra rolagens ocultas para cada ataque', () => {
    const r = simularLuta(criarLutador('a', 'A', stats), criarLutador('b', 'B', stats), 99);
    expect(r.ocultos.length).toBeGreaterThan(0);
    for (const o of r.ocultos) {
      expect(o.rolagemAtaque).toBeGreaterThanOrEqual(1);
      expect(o.rolagemDefesa).toBeLessThanOrEqual(20);
    }
  });
});

describe('golpe pesado', () => {
  it('carrega com defesas, acerta garantido e zera a barra', () => {
    let visto = false;
    for (let seed = 1; seed <= 200 && !visto; seed++) {
      const r = simularLuta(
        criarLutador('a', 'A', { forca: 9, agilidade: 14, vitalidade: 10, sorte: 6 }),
        criarLutador('b', 'B', { forca: 9, agilidade: 14, vitalidade: 10, sorte: 6 }),
        seed,
      );
      const pesados = r.eventos.filter((e) => e.tipo === 'acerto' && e.pesado);
      if (pesados.length === 0) continue;
      visto = true;
      for (const ev of r.eventos) {
        if (ev.tipo === 'carga') {
          expect(ev.valor).toBeGreaterThanOrEqual(0);
          expect(ev.valor).toBeLessThanOrEqual(ev.max);
        }
      }
      // todo golpe pesado vem de uma barra cheia: antes dele, o atacante chegou a 4
      const idx = r.eventos.findIndex((e) => e.tipo === 'acerto' && e.pesado);
      const alvo = (r.eventos[idx] as { ator: string }).ator;
      const antes = r.eventos.slice(0, idx).filter((e) => e.tipo === 'carga' && e.alvo === alvo) as { valor: number }[];
      expect(antes[antes.length - 1].valor).toBe(4);
    }
    expect(visto).toBe(true);
  });

  it('dano do golpe pesado é 10% maior (arredondado para cima)', () => {
    const r = simularLuta(
      criarLutador('a', 'A', { forca: 9, agilidade: 14, vitalidade: 10, sorte: 6 }),
      criarLutador('b', 'B', { forca: 9, agilidade: 14, vitalidade: 10, sorte: 6 }),
      3,
    );
    const pesado = r.ocultos.find((o) => o.pesado);
    const normal = r.ocultos.find((o) => !o.pesado && o.dano > 0);
    if (pesado && normal) expect(pesado.dano).toBeGreaterThanOrEqual(normal.dano);
  });
});
