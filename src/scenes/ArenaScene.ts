import Phaser from 'phaser';
import { partesGladiador, svgParte, type ParteId } from '../art/gladiador';
import { VARIANTES, SPRITE, desenharEspectador, sortearPlateia, type Espectador } from '../art/espectadores';
import { tipoDoGolpe } from '../art/rig';
import { audio, type Efeito } from '../audio/audio';
import type { Evento, TipoEfeito } from '../core/combat';
import type { LutadorVisual, PayloadLuta } from '../core/game';
import { Corpo, ESCALA_BASE } from './Corpo';
import { CorpoSprite } from './CorpoSprite';
import type { Lutador } from './Lutador';
import { SPRITES_CLASSE, chaveSprite, type Pose } from '../art/sprites';
import { VARIANTES_COR, recolorir, varianteDe } from '../art/variantes';

type Dados = PayloadLuta & { onFim: () => void; onDesistir?: () => void };

/** Dados de um lutador que não são o corpo: barra de vida, posição e se tem escudo. */
interface Ficha {
  visual: LutadorVisual;
  x: number;
  /** Linha do chão (y dos pés) deste lutador. */
  y: number;
  escala: number;
  hp: number;
  barra: Phaser.GameObjects.Graphics;
  escudo: boolean;
  /** Carga do golpe pesado (0..cargaMax). */
  carga: number;
  cargaMax: number;
  /** Posição do painel fixo na parte de baixo da tela. */
  hud: Hud;
  textoHp?: Phaser.GameObjects.Text;
}

interface Hud {
  /** x onde começam as barras e largura delas. */
  bx: number;
  largura: number;
  /** y do topo da linha do painel. */
  y: number;
  compacto: boolean;
  lado: 'A' | 'B';
}

const COR_PESADO = 0xe6cf8a;
const COR_PESADO_CHEIO = 0xfff0a8;


const Y_PES = 440;
/** Tamanho do corpo na arena (deve ser igual ao ESCALA_BASE de Corpo). */
const ESCALA_CORPO = ESCALA_BASE;

const NOME_EFEITO: Record<TipoEfeito, string> = {
  sangramento: 'Sangramento',
  envenenamento: 'Envenenamento',
  contusao: 'Contusão',
  queimadura: 'Queimadura',
};

function somDoEvento(ev: Evento): Efeito {
  switch (ev.tipo) {
    case 'esquiva':
      return 'esquiva';
    case 'defesa':
      return 'bloqueio';
    case 'acerto':
      return ev.critico || ev.pesado ? 'critico' : 'golpe';
    case 'aplicado':
    case 'efeito':
    case 'rendicao':
      return 'efeito';
    case 'atordoado':
      return 'atordoado';
    case 'morte':
      return 'morte';
    case 'carga':
      return 'clique';
  }
}

const ESTILO = (tamanho: number, cor: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'Georgia, serif',
  fontSize: `${tamanho}px`,
  color: cor,
  stroke: '#000000',
  strokeThickness: 4,
});

/** Hash curto, usado só para dar nome estável à textura de cada desenho. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function urlSvg(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Carrega uma imagem (data URL de SVG) e a desenha num canvas de tamanho fixo. */
function carregarImagem(src: string, largura: number, altura: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(largura, altura);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = largura;
      c.height = altura;
      c.getContext('2d')?.drawImage(img, 0, 0, largura, altura);
      resolve(c);
    };
    img.onerror = () => reject(new Error(`Falha ao carregar ${src.slice(0, 60)}`));
    img.src = src;
  });
}

/** Carrega um arquivo de imagem (PNG) num canvas, sem suavização extra. */
function carregarArquivo(src: string, largura: number, altura: number): Promise<HTMLCanvasElement> {
  return carregarImagem(src, largura, altura);
}

/** Centro da areia de cada arena (x em pixels da tela de 960). O Coliseu tem a areia deslocada para a direita. */
const CENTRO: Record<string, number> = { coliseu: 530 };

/** Fator entre a imagem de fundo (1024 de largura) e a tela lógica (960). */
const FATOR_FUNDO = 960 / 1024;

/** Tamanho dos gladiadores por arena: nas arenas grandes (Cápua e Coliseu) a plateia está longe, então eles encolhem. */
const FATOR_ARENA: Record<string, number> = { pompeia: 1, capua: 0.7, coliseu: 0.66, poco: 1 };

/**
 * Posição de repouso de cada lutador: 1 de cada lado, ou 2 de cada lado em duas linhas de profundidade
 * (um mais ao fundo e mais afastado do centro, o outro à frente e mais perto), para não se sobreporem.
 */
function posicoes(quantidade: number, lado: 'A' | 'B', centro: number, f: number): Array<{ x: number; y: number }> {
  const s = lado === 'A' ? -1 : 1;
  if (quantidade === 1) return [{ x: centro + s * 75 * f, y: Y_PES }];
  return [
    { x: centro + s * 150 * f, y: Y_PES - 30 * f },
    { x: centro + s * 80 * f, y: Y_PES + 28 * f },
  ];
}

/**
 * Cena da luta. Recebe o resultado já calculado e só reproduz os eventos, em ordem,
 * com tempo suficiente para o olho acompanhar. Não decide nada de regra.
 */
export class ArenaScene extends Phaser.Scene {
  private dados?: Dados;
  private lutadores: Record<string, Lutador> = {};
  private fichas: Record<string, Ficha> = {};
  private partes: Record<string, Partial<Record<ParteId, string>>> = {};
  private plateia: Espectador[] = [];
  private fimMostrado = false;
  private confirmando = false;
  private yTopo = 250;

  constructor() {
    super('arena');
  }

  init(dados?: Dados): void {
    this.dados = dados;
  }

  create(): void {
    const d = this.dados;
    if (!d || !d.lutadoresA || !d.lutadoresB) return;
    // Texturas carregadas à mão (sem o loader do Phaser), para a cena nunca travar esperando um "complete".
    this.carregarTexturas(d).then(() => {
      if (!this.sys.isActive()) return;
      this.montar(d);
    });
  }

  private async carregarTexturas(d: Dados): Promise<void> {
    const pedidos: Promise<void>[] = [];
    const vistas = new Set<string>();
    this.partes = {};
    for (const l of [...d.lutadoresA, ...d.lutadoresB]) {
      const mapa: Partial<Record<ParteId, string>> = {};
      const conteudo = partesGladiador(l.aparencia);
      for (const id of Object.keys(conteudo) as ParteId[]) {
        if (!conteudo[id]) continue;
        const svg = svgParte(conteudo[id]);
        const chave = `parte:${hash(svg)}`;
        mapa[id] = chave;
        if (!this.textures.exists(chave) && !vistas.has(chave)) {
          vistas.add(chave);
          pedidos.push(carregarImagem(urlSvg(svg), 120, 200).then((c) => { this.textures.addCanvas(chave, c); }));
        }
      }
      this.partes[l.id] = mapa;
    }
    const fundo = `fundo:${d.arte}`;
    if (!this.textures.exists(fundo)) {
      pedidos.push(carregarArquivo(d.arte, 1280, 720).then((c) => { this.textures.addCanvas(fundo, c); }));
    }
    for (const l of [...d.lutadoresA, ...d.lutadoresB]) {
      const conj = SPRITES_CLASSE[l.classe];
      if (!conj) continue;
      (Object.keys(conj.quadros) as Pose[]).forEach((pose) => {
        const variante = varianteDe(l.id);
        const chave = chaveSprite(l.classe, pose, variante);
        const q = conj.quadros[pose];
        if (!q || this.textures.exists(chave) || vistas.has(chave)) return;
        vistas.add(chave);
        pedidos.push(
          carregarImagem(q.arquivo, q.w, q.h).then((c) => {
            const g = c.getContext('2d');
            if (g && variante) {
              const dados = g.getImageData(0, 0, c.width, c.height);
              recolorir(dados.data, VARIANTES_COR[variante]);
              g.putImageData(dados, 0, 0);
            }
            this.textures.addCanvas(chave, c);
            // folhas de baixa resolução são ampliadas: filtro vizinho mantém o pixel nítido
            if (conj.alturaGuarda < 130) this.textures.get(chave).setFilter(Phaser.Textures.FilterMode.NEAREST);
          }),
        );
      });
    }
    for (let v = 0; v < VARIANTES; v++) {
      for (const q of [0, 1] as const) {
        const chave = `espectador:${v}:${q}`;
        if (!this.textures.exists(chave)) {
          this.textures.addCanvas(chave, desenharEspectador(v, q));
          this.textures.get(chave).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }
    }
    if (!this.textures.exists('moeda')) {
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 8;
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = '#7a5410';
        g.fillRect(2, 0, 4, 8);
        g.fillRect(0, 2, 8, 4);
        g.fillStyle = '#f2c230';
        g.fillRect(2, 1, 4, 6);
        g.fillRect(1, 2, 6, 4);
        g.fillStyle = '#fff0a0';
        g.fillRect(2, 2, 2, 2);
      }
      this.textures.addCanvas('moeda', c);
      this.textures.get('moeda').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    await Promise.all(pedidos);
  }

  update(): void {
    const agora = this.time.now;
    for (const c of Object.values(this.lutadores)) c.atualizar(agora);
  }

  private montar(d: Dados): void {
    this.lutadores = {};
    this.fichas = {};
    this.cameras.main.setBackgroundColor('#120c0a');
    // Cenário pintado em pixel art (imagem pronta), sem pixelização por cima.
    this.add.image(480, 270, `fundo:${d.arte}`).setDisplaySize(960, 540).setDepth(-10);

    this.fimMostrado = false;
    this.confirmando = false;
    this.desenharPlateia(d);
    this.criarBotaoPular();

    const centro = CENTRO[Object.keys(CENTRO).find((k) => d.arte.includes(k)) ?? ''] ?? 480;
    const f = FATOR_ARENA[['pompeia', 'capua', 'coliseu', 'poco'].find((k) => d.arte.includes(k)) ?? 'pompeia'] ?? 1;
    const xsA = posicoes(d.lutadoresA.length, 'A', centro, f);
    const xsB = posicoes(d.lutadoresB.length, 'B', centro, f);
    this.desenharFaixaHud();
    d.lutadoresA.forEach((l, i) => this.criarLutador(l, xsA[i], false, d.lutadoresA.length, f, i));
    d.lutadoresB.forEach((l, i) => this.criarLutador(l, xsB[i], true, d.lutadoresB.length, f, i));
    this.agendarEventos(d.eventos);
  }

  /** Espectadores sorteados a cada partida, conforme a lotação da arena. */
  private desenharPlateia(d: Dados): void {
    const arenaId = ['pompeia', 'capua', 'coliseu', 'poco'].find((k) => d.arte.includes(k)) ?? 'coliseu';
    const lotacao = d.plateia === 'vazia' || d.plateia === 'meia' || d.plateia === 'cheia' ? d.plateia : 'meia';
    this.plateia = sortearPlateia(arenaId, lotacao);
    const k = FATOR_FUNDO;
    for (const e of this.plateia) {
      const escala = (e.altura * k) / SPRITE.h;
      const fig = this.add
        .image(e.x * k, e.y * k, `espectador:${e.semente}:0`)
        .setOrigin(0.5, 1)
        .setScale(escala)
        .setDepth(-5 + e.y / 1000);
      if (e.anima) {
        // Comemora: alterna entre braços baixos e erguidos e dá um pulinho.
        this.time.addEvent({
          delay: Phaser.Math.Between(380, 760),
          loop: true,
          startAt: Phaser.Math.Between(0, 300),
          callback: () => fig.setTexture(`espectador:${e.semente}:${fig.texture.key.endsWith(':0') ? 1 : 0}`),
        });
      }
    }
  }

  /** Botão de desistir: encerra a luta na hora, sem ganhar nada (conta como derrota). */
  private criarBotaoPular(): void {
    const fundo = this.add
      .rectangle(884, 28, 140, 34, 0x000000, 0.65)
      .setStrokeStyle(2, 0xf2d28a)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    this.add.text(884, 28, 'Desistir', ESTILO(15, '#f2d28a')).setOrigin(0.5).setDepth(51);
    fundo.on('pointerup', () => {
      if (this.fimMostrado || this.confirmando) return;
      this.confirmarDesistencia();
    });
  }

  /** Pede confirmação antes de desistir (conta como derrota, sem recompensa). A luta fica pausada enquanto isso. */
  private confirmarDesistencia(): void {
    this.confirmando = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    const itens: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      itens.push(o);
      return o;
    };
    add(this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7).setDepth(200).setInteractive());
    add(this.add.rectangle(480, 270, 520, 220, 0x1a1208, 0.96).setStrokeStyle(2, 0xf2d28a).setDepth(201));
    add(this.add.text(480, 205, 'Desistir da luta?', ESTILO(26, '#f2d28a')).setOrigin(0.5).setDepth(202));
    add(
      this.add
        .text(480, 255, 'Conta como derrota, sem recompensa.\nA energia gasta não volta.', { ...ESTILO(16, '#e8d5b0'), align: 'center' })
        .setOrigin(0.5)
        .setDepth(202),
    );
    const fechar = (): void => {
      for (const o of itens) o.destroy();
      this.confirmando = false;
    };
    const botao = (x: number, texto: string, cor: number, aoClicar: () => void): void => {
      add(
        this.add
          .rectangle(x, 325, 200, 42, cor)
          .setStrokeStyle(2, 0xf2d28a)
          .setDepth(202)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', aoClicar),
      );
      add(this.add.text(x, 325, texto, ESTILO(16, '#f2d28a')).setOrigin(0.5).setDepth(203));
    };
    botao(366, 'Continuar lutando', 0x3a3220, () => {
      fechar();
      this.time.paused = false;
      this.tweens.resumeAll();
    });
    botao(594, 'Desistir', 0x8a1c1c, () => {
      fechar();
      this.time.paused = false;
      this.tweens.resumeAll();
      if (this.fimMostrado) return;
      this.fimMostrado = true;
      this.time.removeAllEvents();
      this.tweens.killAll();
      const d = this.dados;
      d?.onDesistir?.();
      d?.onFim();
    });
  }

  /** Faixa escura fixa embaixo da tela, onde ficam retratos, vida e barra de golpe pesado. */
  private desenharFaixaHud(): void {
    this.add.rectangle(480, 505, 960, 70, 0x000000, 0.62).setDepth(40);
    this.add.rectangle(480, 470, 960, 2, 0xf2d28a, 0.5).setDepth(41);
  }

  private criarLutador(visual: LutadorVisual, pos: { x: number; y: number }, virado: boolean, quantidadeDoLado: number, fator: number, indice: number): void {
    const { x, y } = pos;
    const escala = (quantidadeDoLado === 1 ? 1 : 0.76) * fator;
    const corpo: Lutador = CorpoSprite.existe(visual.classe)
      ? new CorpoSprite(this, x, y, escala, virado, visual.classe, fator, varianteDe(visual.id))
      : new Corpo(this, x, y, escala, virado, this.partes[visual.id] ?? {}, fator);
    this.lutadores[visual.id] = corpo;
    corpo.raiz.setDepth(5 + y / 1000);
    const topo = y - 200 * ESCALA_CORPO * escala;
    this.yTopo = Math.min(this.yTopo, topo);

    const compacto = quantidadeDoLado > 1;
    const lado = virado ? 'B' : 'A';
    const alturaLinha = compacto ? 34 : 66;
    const ps = alturaLinha - 6;
    const margem = 14;
    const larguraBarra = compacto ? 280 : 340;
    const yLinha = 471 + indice * alturaLinha + 3;
    const xRetrato = lado === 'A' ? margem : 960 - margem - ps;
    const bx = lado === 'A' ? margem + ps + 10 : 960 - margem - ps - 10 - larguraBarra;
    const hud: Hud = { bx, largura: larguraBarra, y: yLinha, compacto, lado };

    this.criarRetrato(visual, xRetrato, yLinha, ps, lado);
    const nome = this.add
      .text(lado === 'A' ? bx : bx + larguraBarra, yLinha - 2, visual.nome, ESTILO(compacto ? 11 : 15, virado ? '#9bb7e0' : '#f2d28a'))
      .setOrigin(lado === 'A' ? 0 : 1, 0)
      .setDepth(43);
    nome.setStroke('#000000', 3);
    const barra = this.add.graphics().setDepth(42);
    const ficha: Ficha = {
      visual, x, y, escala, hp: visual.hpMax, barra, escudo: Boolean(this.partes[visual.id]?.escudo),
      carga: 0, cargaMax: 4, hud,
    };
    if (!compacto) {
      ficha.textoHp = this.add
        .text(bx + larguraBarra / 2, yLinha + 21 + 8, '', ESTILO(11, '#ffffff'))
        .setOrigin(0.5)
        .setDepth(44);
      ficha.textoHp.setStroke('#000000', 3);
    }
    this.fichas[visual.id] = ficha;
    this.desenharBarra(ficha);
  }

  /** Retrato quadrado: recorta o rosto/tronco do sprite de guarda do lutador. */
  private criarRetrato(visual: LutadorVisual, x: number, y: number, tam: number, lado: 'A' | 'B'): void {
    const cor = lado === 'A' ? 0xf2d28a : 0x9bb7e0;
    this.add.rectangle(x + tam / 2, y + tam / 2, tam, tam, 0x1a1208, 1).setDepth(42);
    const chave = chaveSprite(visual.classe, 'guarda', varianteDe(visual.id));
    if (this.textures.exists(chave)) {
      const fonte = this.textures.get(chave).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
      const w = fonte.width;
      const h = fonte.height;
      const lado2 = Math.min(w, h * 0.42);
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      if (g) {
        g.imageSmoothingEnabled = false;
        g.drawImage(fonte, (w - lado2) / 2, h * 0.02, lado2, lado2, 0, 0, 64, 64);
        const k = `ret:${visual.id}:${lado}`;
        if (this.textures.exists(k)) this.textures.remove(k);
        this.textures.addCanvas(k, c);
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.add.image(x + tam / 2, y + tam / 2, k).setDisplaySize(tam - 4, tam - 4).setDepth(43);
      }
    } else {
      this.add.text(x + tam / 2, y + tam / 2, visual.nome[0], ESTILO(22, '#f2d28a')).setOrigin(0.5).setDepth(43);
    }
    this.add.rectangle(x + tam / 2, y + tam / 2, tam, tam).setStrokeStyle(2, cor).setDepth(44);
  }

  private desenharBarra(f: Ficha): void {
    const { bx, largura, y, compacto, lado } = f.hud;
    const hpProp = Math.max(0, Math.min(1, f.hp / f.visual.hpMax));
    const cargaProp = Math.max(0, Math.min(1, f.carga / f.cargaMax));
    const cheia = f.carga >= f.cargaMax;
    const yHp = y + (compacto ? 13 : 21);
    const hHp = compacto ? 9 : 18;
    const yPe = yHp + hHp + (compacto ? 2 : 4);
    const hPe = compacto ? 6 : 10;
    // preenche da borda do retrato para fora: A cresce para a direita, B para a esquerda
    const x0 = (prop: number): number => (lado === 'A' ? bx : bx + largura * (1 - prop));
    const g = f.barra;
    g.clear();
    g.fillStyle(0x000000, 0.8);
    g.fillRect(bx - 1, yHp - 1, largura + 2, hHp + 2);
    g.fillStyle(hpProp > 0.4 ? 0x7fd04a : 0xd88a6a, 1);
    g.fillRect(x0(hpProp), yHp, largura * hpProp, hHp);
    g.fillStyle(0x000000, 0.8);
    g.fillRect(bx - 1, yPe - 1, largura + 2, hPe + 2);
    g.fillStyle(cheia ? COR_PESADO_CHEIO : COR_PESADO, 1);
    g.fillRect(x0(cargaProp), yPe, largura * cargaProp, hPe);
    // marcas dos 4 degraus
    g.fillStyle(0x000000, 0.7);
    for (let i = 1; i < f.cargaMax; i++) g.fillRect(bx + (largura * i) / f.cargaMax - 1, yPe, 2, hPe);
    if (f.textoHp) f.textoHp.setText(`${Math.max(0, Math.round(f.hp))} / ${f.visual.hpMax}`);
  }

  private atualizarCarga(id: string, valor: number, max: number): void {
    const f = this.fichas[id];
    if (!f) return;
    const encheu = valor >= max && f.carga < max;
    f.carga = valor;
    f.cargaMax = max;
    this.desenharBarra(f);
    if (encheu) {
      this.flutuar(f.x, 'Golpe pesado pronto!', '#fff0a8', 16);
      const { bx, largura, y, compacto } = f.hud;
      const brilho = this.add
        .rectangle(bx + largura / 2, y + (compacto ? 13 + 9 + 2 + 3 : 21 + 18 + 4 + 5), largura + 6, compacto ? 10 : 14, 0xfff0a8, 0.5)
        .setDepth(45);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 700, onComplete: () => brilho.destroy() });
    }
  }

  private posicao(id: string): number {
    return this.fichas[id]?.x ?? 480;
  }

  private agendarEventos(eventos: Evento[]): void {
    // Cada golpe dura o bastante para o olho acompanhar; lutas longas são comprimidas com um piso de tempo.
    // Eventos de carga não gastam tempo próprio: aparecem junto do golpe que os causou.
    const principais = eventos.filter((e) => e.tipo !== 'carga').length;
    const intervalo = Math.max(420, Math.min(900, 20000 / Math.max(1, principais)));
    let slot = -1;
    for (const ev of eventos) {
      if (ev.tipo !== 'carga') slot++;
      const atraso = 700 + Math.max(0, slot) * intervalo + (ev.tipo === 'carga' ? 380 : 0);
      this.time.delayedCall(atraso, () => this.mostrar(ev));
    }
    this.time.delayedCall(700 + principais * intervalo + 900, () => this.mostrarFim());
  }

  private mostrar(ev: Evento): void {
    if (ev.tipo !== 'carga') audio.tocarEfeito(somDoEvento(ev));
    switch (ev.tipo) {
      case 'esquiva':
        this.ataque(ev.ator, ev.alvo, 'esquiva');
        this.flutuar(this.posicao(ev.alvo), 'Esquiva', '#e8d5b0');
        break;
      case 'defesa':
        this.ataque(ev.ator, ev.alvo, 'defesa');
        this.flutuar(this.posicao(ev.alvo), 'Bloqueado', '#9bb7e0');
        break;
      case 'acerto': {
        this.ataque(ev.ator, ev.alvo, 'acerto', ev.critico || Boolean(ev.pesado));
        this.flutuar(
          this.posicao(ev.alvo),
          ev.pesado ? `PESADO −${ev.dano}` : ev.critico ? `CRÍTICO −${ev.dano}` : `−${ev.dano}`,
          ev.pesado ? '#fff0a8' : ev.critico ? '#ffd24a' : '#ff8a7a',
          ev.pesado || ev.critico ? 30 : 22,
        );
        this.atualizarHp(ev.alvo, ev.hpRestante);
        break;
      }
      case 'carga':
        this.atualizarCarga(ev.alvo, ev.valor, ev.max);
        break;
      case 'aplicado':
        this.flutuar(this.posicao(ev.alvo), `${NOME_EFEITO[ev.nome]}!`, '#c79cff');
        break;
      case 'efeito':
        this.flutuar(this.posicao(ev.alvo), `${NOME_EFEITO[ev.nome]} −${ev.dano}`, '#c79cff', 18);
        this.atualizarHp(ev.alvo, ev.hpRestante);
        break;
      case 'atordoado':
        this.flutuar(this.posicao(ev.alvo), 'Atordoado', '#f2d28a');
        break;
      case 'rendicao':
        this.flutuar(this.posicao(ev.alvo), 'Rende-se!', '#f2d28a', 22);
        this.recolher(ev.alvo);
        break;
      case 'morte':
        this.morrer(ev.alvo);
        break;
    }
  }

  /**
   * Golpe corpo a corpo: o atacante articula o golpe conforme a arma (corte, estocada, golpe
   * pesado ou soco). No contato, o alvo reage: recua ao ser acertado, levanta o escudo ao
   * bloquear (às vezes sendo empurrado), ou pula para trás ao esquivar.
   */
  private ataque(atorId: string, alvoId: string, resultado: 'acerto' | 'defesa' | 'esquiva', critico = false): void {
    const atk = this.lutadores[atorId];
    const alv = this.lutadores[alvoId];
    const fa = this.fichas[atorId];
    const fv = this.fichas[alvoId];
    if (!atk || !alv || !fa || !fv) return;
    const impacto = atk.golpear(tipoDoGolpe(fa.visual.aparencia.equipamento.arma), this);

    if (resultado === 'esquiva') {
      alv.esquivar(this, Math.max(0, impacto - 90));
      return;
    }
    this.time.delayedCall(impacto, () => {
      const frente = atk.frente;
      if (resultado === 'acerto') {
        alv.reagir(critico, this);
        this.faiscas(fv.x - frente * 10, fv.y - 70, critico ? 0xff5a4a : 0xffd27a, critico ? 14 : 8);
        this.cameras.main.shake(140, critico ? 0.012 : 0.005);
      } else {
        const empurrao = Math.random() < 0.4;
        alv.defender(fv.escudo, empurrao, this);
        this.faiscas(fv.x + frente * 20, fv.y - 80, 0xffe9a0, 10);
      }
    });
  }

  private faiscas(x: number, y: number, cor: number, quantidade: number): void {
    for (let i = 0; i < quantidade; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), cor).setDepth(9);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-30, 20),
        alpha: 0,
        duration: Phaser.Math.Between(260, 420),
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private atualizarHp(id: string, hp: number): void {
    const f = this.fichas[id];
    if (!f) return;
    f.hp = hp;
    this.desenharBarra(f);
  }

  /** Rendição: o lutador sai da briga, meio apagado, sem morrer. */
  private recolher(id: string): void {
    this.lutadores[id]?.recolher(this);
  }

  private morrer(id: string): void {
    const c = this.lutadores[id];
    if (!c) return;
    c.parar();
    this.flutuar(this.posicao(id), 'Morreu', '#ff5555', 26);
    c.cair(this);
  }

  private flutuar(x: number, texto: string, cor: string, tamanho = 18): void {
    const t = this.add.text(x, this.yTopo - 6, texto, ESTILO(tamanho, cor)).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      y: this.yTopo - 46,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** Chuva de moedas da plateia no Poço: poucas, médias ou muitas, conforme a lotação. */
  private chuvaDeMoedas(quantidade: number): void {
    const k = FATOR_FUNDO;
    const origens = this.plateia.length ? this.plateia : [{ x: 512, y: 180 } as Espectador];
    for (let i = 0; i < quantidade; i++) {
      const o = origens[Phaser.Math.Between(0, origens.length - 1)];
      const alvoX = Phaser.Math.Between(260, 700);
      const alvoY = Phaser.Math.Between(Y_PES - 40, Y_PES + 50);
      const moeda = this.add.image(o.x * k, o.y * k - 10, 'moeda').setScale(2.2).setDepth(8).setAlpha(0);
      this.tweens.add({ targets: moeda, alpha: 1, duration: 80, delay: i * 90 });
      this.tweens.add({ targets: moeda, x: alvoX, duration: 900, delay: i * 90, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: moeda, y: alvoY, duration: 1000, delay: i * 90, ease: 'Bounce.easeOut' });
      this.tweens.add({ targets: moeda, angle: 360 * Phaser.Math.Between(1, 3), duration: 900, delay: i * 90 });
    }
  }

  private mostrarFim(): void {
    const d = this.dados;
    if (!d || this.fimMostrado) return;
    this.fimMostrado = true;
    if (d.moedas > 0) {
      audio.tocarEfeito('vitoria');
      this.chuvaDeMoedas(d.moedas);
      this.time.delayedCall(900 + d.moedas * 90 + 900, () => this.painelFinal(d));
      return;
    }
    this.painelFinal(d);
  }

  private painelFinal(d: Dados): void {
    audio.tocarEfeito(d.vitoriaA ? 'vitoria' : 'derrota');
    const marco = d.marcos.some((m) => m.includes('liberdade')) ? 'liberdade' : d.marcos.length ? 'lenda' : null;
    if (marco) this.time.delayedCall(1400, () => audio.tocarEfeito(marco));

    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.72).setDepth(100);
    this.add.text(480, 120, d.titulo, ESTILO(28, '#f2d28a')).setOrigin(0.5).setDepth(101);
    this.add
      .text(480, 180, d.vitoriaA ? 'VITÓRIA' : 'DERROTA', ESTILO(44, d.vitoriaA ? '#9be05a' : '#d88a6a'))
      .setOrigin(0.5)
      .setDepth(101);
    const ganho = d.vitoriaA && d.ouro > 0
      ? [`+${d.ouro} ouro${d.bonusPct ? ` (bônus da plateia: +${d.bonusPct}%)` : ''}`]
      : [];
    const efeitos = d.efeitosNovos.length ? `Efeitos: ${d.efeitosNovos.join(' · ')}` : 'Sem efeitos persistentes.';
    this.add
      .text(480, 270, [d.resumo, ...ganho, efeitos, ...d.marcos].join('\n'), { ...ESTILO(16, '#e8d5b0'), align: 'center', wordWrap: { width: 760 } })
      .setOrigin(0.5)
      .setDepth(101);
    const botao = this.add
      .rectangle(480, 440, 200, 46, 0x8a1c1c)
      .setStrokeStyle(2, 0xf2d28a)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    this.add.text(480, 440, 'Continuar', ESTILO(18, '#f2d28a')).setOrigin(0.5).setDepth(102);
    botao.on('pointerup', () => d.onFim());
  }
}
