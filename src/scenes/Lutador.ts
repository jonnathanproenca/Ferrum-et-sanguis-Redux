import type Phaser from 'phaser';
import type { TipoGolpe } from '../art/rig';

/** O que a cena precisa de um lutador, seja o corpo articulado (vetor) ou o de sprites. */
export interface Lutador {
  readonly raiz: Phaser.GameObjects.Container;
  /** +1 olhando para a direita (lado A), -1 espelhado (lado B). */
  readonly frente: number;
  /** Inicia o golpe; devolve o instante (ms) do contato com o alvo. */
  golpear(tipo: TipoGolpe, cena: Phaser.Scene): number;
  esquivar(cena: Phaser.Scene, atraso: number): void;
  defender(comEscudo: boolean, empurrao: boolean, cena: Phaser.Scene): void;
  reagir(critico: boolean, cena: Phaser.Scene): void;
  /** Queda definitiva (morte). */
  cair(cena: Phaser.Scene): void;
  /** Rendição: o lutador sai da briga, meio apagado. */
  recolher(cena: Phaser.Scene): void;
  atualizar(agora: number): void;
  parar(): void;
}
