import { describe, expect, it } from 'vitest';
import { VARIANTES_COR, recolorir, varianteDe } from '../src/art/variantes';

const px = (r: number, g: number, b: number) => new Uint8ClampedArray([r, g, b, 255]);

describe('variação de cores', () => {
  it('a variante é estável e dentro da tabela', () => {
    expect(varianteDe('g12')).toBe(varianteDe('g12'));
    for (const id of ['g1', 'g2', 'campeao-x', 'rival-9']) expect(varianteDe(id)).toBeLessThan(VARIANTES_COR.length);
  });

  it('a variante 0 não muda nada', () => {
    const p = px(180, 40, 40);
    recolorir(p, VARIANTES_COR[0]);
    expect([...p]).toEqual([180, 40, 40, 255]);
  });

  it('gira o matiz do tecido vermelho', () => {
    const p = px(180, 40, 40);
    recolorir(p, { rot: 120, pele: 1 });
    expect(p[1]).toBeGreaterThan(p[0]);
    expect(p[1]).toBeGreaterThan(p[2]);
  });

  it('metal e ouro ficam como estão', () => {
    const metal = px(170, 175, 180);
    const ouro = px(220, 180, 40);
    recolorir(metal, { rot: 200, pele: 0.7 });
    recolorir(ouro, { rot: 200, pele: 0.7 });
    expect([...metal]).toEqual([170, 175, 180, 255]);
    expect([...ouro]).toEqual([220, 180, 40, 255]);
  });

  it('escurece a pele', () => {
    const p = px(224, 160, 120);
    recolorir(p, { rot: 0, pele: 0.7 });
    expect(p[0]).toBeLessThan(224);
  });

  it('ignora pixels transparentes', () => {
    const p = new Uint8ClampedArray([180, 40, 40, 0]);
    recolorir(p, { rot: 120, pele: 1 });
    expect([...p]).toEqual([180, 40, 40, 0]);
  });
});
