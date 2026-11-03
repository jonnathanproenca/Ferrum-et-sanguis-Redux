import { describe, expect, it } from 'vitest';
import { FILEIRAS, sortearPlateia, VARIANTES } from '../src/art/espectadores';

const fixo = (v: number) => () => v;

describe('plateia', () => {
  it('todas as arenas têm fileiras', () => {
    for (const id of ['pompeia', 'capua', 'coliseu', 'poco']) expect(FILEIRAS[id].length).toBeGreaterThan(0);
  });

  it('lotação maior gera mais espectadores', () => {
    const conta = (arena: string, lot: string) => {
      let n = 0;
      for (let i = 0; i < 20; i++) n += sortearPlateia(arena, lot).length;
      return n / 20;
    };
    expect(conta('coliseu', 'vazia')).toBeLessThan(conta('coliseu', 'meia'));
    expect(conta('coliseu', 'meia')).toBeLessThan(conta('coliseu', 'cheia'));
  });

  it('o coliseu cheio é muito mais lotado que Pompeia com pouca gente', () => {
    expect(sortearPlateia('coliseu', 'cheia').length).toBeGreaterThan(sortearPlateia('pompeia', 'vazia').length * 5);
  });

  it('sementes ficam dentro das variantes e a ordem é de trás para a frente', () => {
    const lista = sortearPlateia('capua', 'cheia', fixo(0.3));
    for (const e of lista) expect(e.semente).toBeLessThan(VARIANTES);
    for (let i = 1; i < lista.length; i++) expect(lista[i].y).toBeGreaterThanOrEqual(lista[i - 1].y);
  });
});
