import { TERRAS } from '../src/core/model';
import { describe, expect, it } from 'vitest';
import { partesGladiador, PARTES_GLADIADOR, svgGladiador } from '../src/art/gladiador';
import { GUARDA, JUNTA_POS, PAI, duracao, interpolar, quadrosDefesa, quadrosEsquiva, quadrosGolpe, quadrosReacao, tipoDoGolpe } from '../src/art/rig';
import type { Aparencia } from '../src/core/model';

const ap: Aparencia = {
  terra: TERRAS[0].id,
  look: 0,
  classe: 'murmilo',
  campeao: false,
  equipamento: { arma: 'gladio', acessorio: 'escudo_grande', elmo: 'elmo_murmilo', peito: 'peito_couro', pe: 'bota_legionaria', calca: 'perneira_couro' },
};

describe('esqueleto do gladiador', () => {
  it('toda junta tem pai válido e posição', () => {
    for (const j of Object.keys(PAI) as (keyof typeof PAI)[]) {
      const pai = PAI[j];
      expect(JUNTA_POS[j]).toBeDefined();
      if (pai) expect(JUNTA_POS[pai]).toBeDefined();
    }
  });

  it('tipo do golpe segue a arma', () => {
    expect(tipoDoGolpe('gladio')).toBe('corte');
    expect(tipoDoGolpe('tridente')).toBe('estocada');
    expect(tipoDoGolpe('maca')).toBe('pesado');
    expect(tipoDoGolpe(null)).toBe('soco');
  });

  it('todo golpe termina na guarda e o impacto cai dentro da animação', () => {
    for (const tipo of ['corte', 'estocada', 'pesado', 'soco'] as const) {
      const { quadros, impacto } = quadrosGolpe(tipo);
      expect(impacto).toBeGreaterThan(0);
      expect(impacto).toBeLessThan(duracao(quadros));
      expect(interpolar(GUARDA, quadros, duracao(quadros) + 10)).toMatchObject({ ombroD: GUARDA.ombroD, dx: 0 });
    }
  });

  it('esquiva é um pulo para trás: no ar, dx negativo e dy para cima', () => {
    const meio = interpolar(GUARDA, quadrosEsquiva(), 200);
    expect(meio.dx).toBeLessThan(0);
    expect(meio.dy).toBeLessThan(0);
  });

  it('defesa com empurrão recua mais que sem', () => {
    const sem = interpolar(GUARDA, quadrosDefesa(true, false), 240);
    const com = interpolar(GUARDA, quadrosDefesa(true, true), 280);
    expect(com.dx ?? 0).toBeLessThan(sem.dx ?? 0);
  });

  it('acerto crítico recua mais que o normal', () => {
    const normal = interpolar(GUARDA, quadrosReacao(false), 110);
    const critico = interpolar(GUARDA, quadrosReacao(true), 110);
    expect(critico.dx ?? 0).toBeLessThan(normal.dx ?? 0);
  });
});

describe('peças do gladiador', () => {
  it('cada peça do corpo existe como parte separada, e a capa só no campeão', () => {
    const p = partesGladiador(ap);
    for (const id of PARTES_GLADIADOR) expect(p[id]).toBeDefined();
    expect(p.capa).toBe('');
    expect(partesGladiador({ ...ap, campeao: true }).capa).not.toBe('');
  });

  it('a figura estática junta todas as peças num svg', () => {
    const svg = svgGladiador(ap);
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('viewBox="0 0 120 200"');
  });
});
