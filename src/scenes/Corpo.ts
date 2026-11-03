import Phaser from 'phaser';
import type { ParteId } from '../art/gladiador';
import { GUARDA, JUNTA_POS, PAI, duracao, interpolar, quadrosDefesa, quadrosEsquiva, quadrosGolpe, quadrosReacao, type Junta, type Pose, type Quadro, type TipoGolpe } from '../art/rig';
import type { Lutador } from './Lutador';

export const ESCALA_BASE = 0.68;

/**
 * Gladiador articulado na cena. Cada junta é um container aninhado (ombro > cotovelo > mão,
 * quadril > joelho > tornozelo, pescoço), e cada parte é uma imagem 120x200 presa à sua junta,
 * com o pivô no ponto da junta. Girar o container gira o membro inteiro, e os filhos seguem.
 */
export class Corpo implements Lutador {
  readonly raiz: Phaser.GameObjects.Container;
  private juntas = {} as Record<Junta, Phaser.GameObjects.Container>;
  private estado: Pose = { ...GUARDA };
  private animacao: { origem: Pose; quadros: Quadro[]; inicio: number; duracao: number } | null = null;
  private baseX: number;
  private baseY: number;
  /** +1 quando o gladiador olha para a direita (lado A); -1 quando está espelhado (lado B). */
  readonly frente: number;

  constructor(
    cena: Phaser.Scene,
    x: number,
    yPes: number,
    escala: number,
    virado: boolean,
    partes: Partial<Record<ParteId, string>>,
    /** Escala dos deslocamentos (avanço, recuo, pulo): acompanha o tamanho do gladiador na arena. */
    private readonly mov = 1,
  ) {
    const k = ESCALA_BASE * escala;
    this.frente = virado ? -1 : 1;
    const sx = this.frente * k;
    // A figura tem os pés (60,200) no ponto (x, yPes) da tela.
    this.baseX = x - sx * 60;
    this.baseY = yPes - k * 200;
    this.raiz = cena.add.container(this.baseX, this.baseY).setScale(sx, k).setDepth(5);

    const imagem = (contenedor: Phaser.GameObjects.Container, parte: ParteId, junta: Junta | null): void => {
      const chave = partes[parte];
      if (!chave) return;
      const j = junta ? JUNTA_POS[junta] : { x: 0, y: 0 };
      contenedor.add(cena.add.image(-j.x, -j.y, chave).setOrigin(0, 0));
    };
    const no = (junta: Junta, pai: Phaser.GameObjects.Container): Phaser.GameObjects.Container => {
      const p = JUNTA_POS[junta];
      const avo = PAI[junta] ? JUNTA_POS[PAI[junta] as Junta] : { x: 0, y: 0 };
      const c = cena.add.container(p.x - avo.x, p.y - avo.y);
      pai.add(c);
      this.juntas[junta] = c;
      return c;
    };

    // Ordem de desenho: membros de trás antes do tronco, membros da frente depois.
    const tronco = no('tronco', this.raiz);
    imagem(tronco, 'capa', 'tronco');
    const quadrilE = no('quadrilE', tronco);
    imagem(quadrilE, 'coxaE', 'quadrilE');
    const joelhoE = no('joelhoE', quadrilE);
    imagem(joelhoE, 'canelaE', 'joelhoE');
    const tornozeloE = no('tornozeloE', joelhoE);
    imagem(tornozeloE, 'peE', 'tornozeloE');
    const quadrilD = no('quadrilD', tronco);
    imagem(quadrilD, 'coxaD', 'quadrilD');
    const joelhoD = no('joelhoD', quadrilD);
    imagem(joelhoD, 'canelaD', 'joelhoD');
    const tornozeloD = no('tornozeloD', joelhoD);
    imagem(tornozeloD, 'peD', 'tornozeloD');
    imagem(tronco, 'tronco', 'tronco');
    const pescoco = no('pescoco', tronco);
    imagem(pescoco, 'cabeca', 'pescoco');
    const ombroE = no('ombroE', tronco);
    imagem(ombroE, 'bracoE', 'ombroE');
    const cotoveloE = no('cotoveloE', ombroE);
    imagem(cotoveloE, 'antebracoE', 'cotoveloE');
    const maoE = no('maoE', cotoveloE);
    imagem(maoE, 'escudo', 'maoE');
    const ombroD = no('ombroD', tronco);
    imagem(ombroD, 'bracoD', 'ombroD');
    const cotoveloD = no('cotoveloD', ombroD);
    imagem(cotoveloD, 'antebracoD', 'cotoveloD');
    const maoD = no('maoD', cotoveloD);
    imagem(maoD, 'arma', 'maoD');

    this.aplicar({ ...GUARDA });
  }

  /** Inicia uma animação a partir da pose atual. `atraso` adia o começo (ex.: reação no contato). */
  animar(quadros: Quadro[], cena: Phaser.Scene, atraso = 0): void {
    this.animacao = {
      origem: { ...this.estado },
      quadros,
      inicio: cena.time.now + atraso,
      duracao: duracao(quadros),
    };
  }

  /** Avança a animação para o instante `agora` (ms do relógio da cena). */
  atualizar(agora: number): void {
    const a = this.animacao;
    if (!a) return;
    const t = agora - a.inicio;
    if (t < 0) return;
    this.aplicar(interpolar(a.origem, a.quadros, t));
    if (t >= a.duracao) this.animacao = null;
  }

  golpear(tipo: TipoGolpe, cena: Phaser.Scene): number {
    const g = quadrosGolpe(tipo);
    this.animar(g.quadros, cena);
    return g.impacto;
  }

  esquivar(cena: Phaser.Scene, atraso: number): void {
    this.animar(quadrosEsquiva(), cena, atraso);
  }

  defender(comEscudo: boolean, empurrao: boolean, cena: Phaser.Scene): void {
    this.animar(quadrosDefesa(comEscudo, empurrao), cena);
  }

  reagir(critico: boolean, cena: Phaser.Scene): void {
    this.animar(quadrosReacao(critico), cena);
  }

  cair(cena: Phaser.Scene): void {
    this.parar();
    cena.tweens.add({
      targets: this.raiz,
      angle: this.frente > 0 ? -90 : 90,
      alpha: 0.4,
      y: this.raiz.y + 60,
      duration: 500,
      ease: 'Quad.easeIn',
    });
  }

  recolher(cena: Phaser.Scene): void {
    cena.tweens.add({ targets: this.raiz, alpha: 0.45, duration: 400 });
  }

  /** Para tudo e volta à guarda imediatamente (usado depois de cair ou rendido). */
  parar(): void {
    this.animacao = null;
  }

  private aplicar(p: Pose): void {
    this.estado = p;
    for (const junta of Object.keys(JUNTA_POS) as Junta[]) {
      const graus = p[junta];
      if (graus !== undefined) this.juntas[junta].rotation = Phaser.Math.DegToRad(graus);
    }
    this.raiz.x = this.baseX + (p.dx ?? 0) * this.frente * this.mov;
    this.raiz.y = this.baseY + (p.dy ?? 0) * this.mov;
  }
}
