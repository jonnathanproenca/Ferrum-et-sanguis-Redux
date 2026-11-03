import Phaser from 'phaser';
import { quadrosGolpe, type TipoGolpe } from '../art/rig';
import { SPRITES_CLASSE, chaveSprite, type ConjuntoSprites, type Pose } from '../art/sprites';
import type { Lutador } from './Lutador';

/** Altura, em pixels da tela, do gladiador em guarda na escala 1 (a mesma do corpo articulado). */
const ALTURA_BASE = 136;

/** Gladiador feito de sprites: troca de pose conforme a ação, com pequenos deslocamentos do corpo. */
export class CorpoSprite implements Lutador {
  readonly raiz: Phaser.GameObjects.Container;
  readonly frente: number;
  private readonly imagem: Phaser.GameObjects.Image;
  private readonly conjunto: ConjuntoSprites;
  private readonly classe: string;
  private readonly k: number;
  private readonly baseX: number;
  private readonly baseY: number;
  private ocupado = false;
  private ficha = 0;
  private respira = 0;
  /** Rendeu-se ou caiu: fica quieto na última pose e ignora qualquer outra ação. */
  private parado = false;

  /** Há sprites para esta classe? */
  static existe(classe: string): boolean {
    return Boolean(SPRITES_CLASSE[classe]);
  }

  constructor(cena: Phaser.Scene, x: number, yPes: number, escala: number, virado: boolean, classe: string, private readonly mov = 1, private readonly variante = 0) {
    const conjunto = SPRITES_CLASSE[classe];
    if (!conjunto) throw new Error(`Sem sprites para ${classe}`);
    this.conjunto = conjunto;
    this.classe = classe;
    this.frente = virado ? -1 : 1;
    this.k = (ALTURA_BASE * escala) / conjunto.alturaGuarda;
    this.baseX = x;
    this.baseY = yPes;
    this.raiz = cena.add.container(x, yPes).setScale(this.frente * this.k, this.k).setDepth(5);
    this.imagem = cena.add.image(0, 0, chaveSprite(classe, 'guarda', variante)).setOrigin(0, 0);
    this.raiz.add(this.imagem);
    this.pose('guarda');
  }

  /** Poses que algumas folhas não têm usam um substituto. */
  private static readonly SUBSTITUTO: Partial<Record<Pose, Pose>> = {
    respira: 'guarda', recupera: 'prepara', esquiva: 'recupera', empurrao: 'defende', dano: 'critico', critico: 'dano', cai: 'critico', morto: 'cai',
  };

  private pose(p: Pose): void {
    let usar: Pose = p;
    while (!this.conjunto.quadros[usar]) usar = CorpoSprite.SUBSTITUTO[usar] ?? 'guarda';
    const q = this.conjunto.quadros[usar];
    if (!q) return;
    this.imagem.setTexture(chaveSprite(this.classe, usar, this.variante));
    this.imagem.setPosition(-q.ax, -q.ay);
  }

  /** Respiração em repouso: alterna guarda e guarda-2 enquanto nada acontece. */
  atualizar(agora: number): void {
    if (this.ocupado) return;
    const fase = Math.floor(agora / 520) % 2;
    if (fase !== this.respira) {
      this.respira = fase;
      this.pose(fase ? 'respira' : 'guarda');
    }
  }

  private acao(cena: Phaser.Scene, atraso: number, passos: { ms: number; fazer: () => void }[]): void {
    if (this.parado) return;
    const minha = ++this.ficha;
    this.ocupado = true;
    let t = atraso;
    for (const p of passos) {
      cena.time.delayedCall(t, () => {
        if (this.ficha === minha) p.fazer();
      });
      t += p.ms;
    }
    cena.time.delayedCall(t, () => {
      if (this.ficha === minha) {
        this.ocupado = false;
        this.pose('guarda');
      }
    });
  }

  /**
   * Avança ou recua a partir da posição de repouso e volta a ela. Os valores são absolutos (nunca relativos à
   * posição atual), senão golpes sobrepostos acumulam deslocamento e o lutador vai subindo pela arena.
   */
  private deslocar(cena: Phaser.Scene, dx: number, dy: number, duracao: number, volta = true): void {
    cena.tweens.add({
      targets: this.raiz,
      x: { from: this.baseX, to: this.baseX + dx * this.frente * this.mov },
      y: { from: this.baseY, to: this.baseY + dy * this.mov },
      duration: duracao,
      yoyo: volta,
      ease: 'Sine.easeOut',
    });
  }

  golpear(tipo: TipoGolpe, cena: Phaser.Scene): number {
    const g = quadrosGolpe(tipo);
    const imp = g.impacto;
    if (this.parado) return imp;
    const alt = Boolean(this.conjunto.quadros.alt) && Math.random() < 0.35;
    this.acao(cena, 0, [
      { ms: imp - 90, fazer: () => this.pose('prepara') },
      { ms: 170, fazer: () => this.pose(alt ? 'alt' : 'impacto') },
      { ms: 240, fazer: () => this.pose('recupera') },
    ]);
    // avança até o alvo no tempo do impacto e volta
    cena.time.delayedCall(Math.max(0, imp - 190), () => this.deslocar(cena, 54, 0, 190));
    return imp;
  }

  esquivar(cena: Phaser.Scene, atraso: number): void {
    this.acao(cena, atraso, [
      { ms: 360, fazer: () => { this.pose('esquiva'); this.deslocar(cena, -42, -16, 180); } },
    ]);
  }

  defender(_comEscudo: boolean, empurrao: boolean, cena: Phaser.Scene): void {
    this.acao(cena, 0, [
      { ms: empurrao ? 420 : 340, fazer: () => { this.pose(empurrao ? 'empurrao' : 'defende'); if (empurrao) this.deslocar(cena, -18, 0, 200); } },
    ]);
  }

  reagir(critico: boolean, cena: Phaser.Scene): void {
    this.acao(cena, 0, [
      { ms: critico ? 520 : 380, fazer: () => { this.pose(critico ? 'critico' : 'dano'); this.deslocar(cena, critico ? -30 : -14, 0, 180); } },
    ]);
  }

  cair(cena: Phaser.Scene): void {
    const minha = ++this.ficha;
    this.ocupado = true;
    this.parado = true;
    this.pose('cai');
    const q = this.conjunto.quadros;
    if (q.cai || q.morto) {
      cena.time.delayedCall(420, () => {
        if (this.ficha === minha) this.pose('morto');
      });
    } else {
      // folha sem poses de queda: o sprite de dano crítico tomba de lado
      cena.tweens.add({ targets: this.raiz, angle: this.frente > 0 ? -90 : 90, y: this.raiz.y + 30 * this.k, duration: 480, ease: 'Quad.easeIn' });
    }
  }

  recolher(cena: Phaser.Scene): void {
    // Rendição: cinza, parado e agachado, sem voltar a respirar nem trocar de pose.
    this.ficha++;
    this.ocupado = true;
    this.parado = true;
    this.pose('critico');
    cena.tweens.add({ targets: this.raiz, alpha: 0.45, duration: 400 });
  }

  parar(): void {
    this.ficha++;
  }
}
