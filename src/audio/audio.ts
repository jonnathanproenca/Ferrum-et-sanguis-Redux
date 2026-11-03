/**
 * Som sintetizado com Web Audio: nenhum arquivo externo.
 * Música: uma trilha por tela, em loop, com cross-fade. Cada arena tem a sua intensidade:
 * arena pequena (vazia) = trilha discreta; média = trilha firme; cheia = trilha forte.
 * Batalhas de lanista (campanha) geram uma trilha épica própria por lanista.
 * Efeitos: golpes com grunhido, bloqueios com metal, fanfarras. Preferências no navegador.
 */

export type Efeito =
  | 'clique' | 'golpe' | 'critico' | 'esquiva' | 'bloqueio' | 'morte' | 'efeito' | 'atordoado'
  | 'moeda' | 'madeira' | 'parede' | 'recrutar' | 'vitoria' | 'derrota' | 'lenda' | 'liberdade' | 'erro';

export interface Prefs {
  ativo: boolean;
  musica: number;
  efeitos: number;
}

interface Trilha {
  bpm: number;
  raiz: number;
  escala: number[];
  /** Grau da escala (0 = tônica) de cada um dos 4 compassos. */
  progressao: number[];
  melodia: 'nenhuma' | 'lira' | 'corno';
  /** Chance de uma colcheia ter nota (0..1). */
  densidade: number;
  coro: boolean;
  drone: boolean;
  percussao: 'nenhuma' | 'tambor' | 'taiko' | 'taiko_epica';
  volume: number;
  semente: number;
}

const DORIA = [0, 2, 3, 5, 7, 9, 10];
const FRIGIA = [0, 1, 3, 5, 7, 8, 10];
const EOLIA = [0, 2, 3, 5, 7, 8, 10];
const MENOR_HARMONICA = [0, 2, 3, 5, 7, 8, 11];

/** Trilhas fixas: menu, gestão e as três arenas em ordem de público. */
const TRILHAS: Record<string, Trilha> = {
  menu: { bpm: 58, raiz: 98, escala: DORIA, progressao: [0, 3, 0, 6], melodia: 'lira', densidade: 0.25, coro: true, drone: true, percussao: 'nenhuma', volume: 0.8, semente: 11 },
  gestao: { bpm: 80, raiz: 110, escala: EOLIA, progressao: [0, 5, 3, 4], melodia: 'lira', densidade: 0.4, coro: false, drone: true, percussao: 'tambor', volume: 0.75, semente: 23 },
  // Arena vazia: música discreta, quase só lira e bordão.
  pompeia: { bpm: 70, raiz: 87.31, escala: FRIGIA, progressao: [0, 1, 0, 1], melodia: 'lira', densidade: 0.18, coro: false, drone: true, percussao: 'nenhuma', volume: 0.55, semente: 31 },
  // Arena média: chifres e tambor marcial.
  capua: { bpm: 100, raiz: 123.47, escala: DORIA, progressao: [0, 3, 6, 0], melodia: 'corno', densidade: 0.5, coro: false, drone: true, percussao: 'tambor', volume: 0.85, semente: 41 },
  poco: { bpm: 124, raiz: 82.41, escala: FRIGIA, progressao: [0, 1, 0, 6], melodia: 'corno', densidade: 0.55, coro: false, drone: true, percussao: 'taiko', volume: 0.85, semente: 53 },
  // Arena cheia: a trilha mais forte, com coro, chifres e taiko.
  coliseu: { bpm: 112, raiz: 110, escala: MENOR_HARMONICA, progressao: [0, 5, 6, 4], melodia: 'corno', densidade: 0.7, coro: true, drone: true, percussao: 'taiko_epica', volume: 1, semente: 67 },
};

const CHAVE = 'ferrum-et-sanguis:audio';
const PADRAO: Prefs = { ativo: true, musica: 0.5, efeitos: 0.7 };

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Trilha épica própria de um lanista: o id define raiz, escala, progressão, andamento e melodia. */
function trilhaDeLanista(id: string): Trilha {
  const h = hash(id);
  const raizes = [73.42, 82.41, 98, 110, 123.47];
  const escalas = [FRIGIA, EOLIA, MENOR_HARMONICA];
  const progs = [
    [0, 6, 5, 4],
    [0, 5, 3, 6],
    [0, 1, 5, 0],
    [0, 3, 4, 0],
  ];
  return {
    bpm: 98 + ((h >>> 9) % 26),
    raiz: raizes[h % raizes.length],
    escala: escalas[(h >>> 3) % escalas.length],
    progressao: progs[(h >>> 6) % progs.length],
    melodia: 'corno',
    densidade: 0.62,
    coro: true,
    drone: true,
    percussao: 'taiko_epica',
    volume: 0.95,
    semente: h,
  };
}

/** Melodia de 4 compassos (32 colcheias), gerada da semente: mesma trilha, mesma melodia. */
function gerarMelodia(tr: Trilha): (number | null)[] {
  let r = tr.semente >>> 0 || 1;
  const rnd = (): number => {
    r ^= r << 13;
    r ^= r >>> 17;
    r ^= r << 5;
    r >>>= 0;
    return r / 4294967296;
  };
  const saida: (number | null)[] = [];
  let atual = 2;
  for (let i = 0; i < 32; i++) {
    const acorde = tr.progressao[Math.floor(i / 8) % tr.progressao.length];
    const forte = i % 4 === 0;
    if (rnd() > (forte ? Math.min(1, tr.densidade + 0.25) : tr.densidade)) {
      saida.push(null);
      continue;
    }
    if (forte) {
      const tons = [acorde, acorde + 2, acorde + 4];
      atual = tons[Math.floor(rnd() * 3)];
    } else {
      atual += (rnd() < 0.5 ? -1 : 1) * (rnd() < 0.7 ? 1 : 2);
    }
    atual = Math.max(acorde - 2, Math.min(acorde + 6, atual));
    saida.push(atual);
  }
  return saida;
}

interface Ativa {
  nome: string;
  trilha: Trilha;
  melodia: (number | null)[];
  ganho: GainNode;
  proximo: number;
  passo: number;
}

function carregarPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? { ...PADRAO, ...(JSON.parse(raw) as Partial<Prefs>) } : { ...PADRAO };
  } catch {
    return { ...PADRAO };
  }
}

/** Frequência do grau d'escala (0 = tônica) da trilha, com deslocamento de oitava. */
function freqGrau(tr: Trilha, grau: number, oitava = 0): number {
  const n = tr.escala.length;
  const oit = Math.floor(grau / n);
  const idx = ((grau % n) + n) % n;
  return tr.raiz * Math.pow(2, (tr.escala[idx] + 12 * (oit + oitava)) / 12);
}

class Motor {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicaBus: GainNode | null = null;
  private efeitosBus: GainNode | null = null;
  private ruido: AudioBuffer | null = null;
  private atual: Ativa | null = null;
  private desejada = 'menu';
  private trilhasLanista = new Map<string, Trilha>();
  private prefs: Prefs = carregarPrefs();

  /** Chamado a partir de um gesto do jogador (navegadores exigem isso para tocar som). */
  desbloquear(): void {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const c = new Ctx();
        this.ctx = c;
        this.master = c.createGain();
        this.musicaBus = c.createGain();
        this.efeitosBus = c.createGain();
        this.musicaBus.connect(this.master);
        this.efeitosBus.connect(this.master);
        this.master.connect(c.destination);
        const n = c.sampleRate;
        this.ruido = c.createBuffer(1, n, n);
        const dados = this.ruido.getChannelData(0);
        for (let i = 0; i < n; i++) dados[i] = Math.random() * 2 - 1;
        this.aplicarPrefs();
        setInterval(() => this.agendar(), 50);
      }
      void this.ctx.resume().then(() => this.tocarTrilha(this.desejada));
    } catch {
      /* navegador sem áudio: o jogo segue mudo */
    }
  }

  definirPrefs(p: Partial<Prefs>): void {
    this.prefs = { ...this.prefs, ...p };
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.prefs));
    } catch {
      /* armazenamento indisponível */
    }
    this.aplicarPrefs();
  }

  prefsAtuais(): Prefs {
    return { ...this.prefs };
  }

  private aplicarPrefs(): void {
    if (!this.master || !this.musicaBus || !this.efeitosBus) return;
    this.master.gain.value = this.prefs.ativo ? 1 : 0;
    this.musicaBus.gain.value = this.prefs.musica;
    this.efeitosBus.gain.value = this.prefs.efeitos;
  }

  private trilha(nome: string): Trilha | undefined {
    if (TRILHAS[nome]) return TRILHAS[nome];
    if (nome.startsWith('campanha:')) {
      const id = nome.slice('campanha:'.length);
      let tr = this.trilhasLanista.get(id);
      if (!tr) {
        tr = trilhaDeLanista(id);
        this.trilhasLanista.set(id, tr);
      }
      return tr;
    }
    return undefined;
  }

  /** Troca a música da tela. Com o som ainda bloqueado, guarda o pedido para depois. */
  tocarTrilha(nome: string): void {
    this.desejada = nome;
    const c = this.ctx;
    const tr = this.trilha(nome);
    if (!c || !this.musicaBus || c.state !== 'running' || !tr) return;
    if (this.atual?.nome === nome) return;
    const t = c.currentTime;
    if (this.atual) {
      const velho = this.atual.ganho;
      velho.gain.cancelScheduledValues(t);
      velho.gain.setValueAtTime(velho.gain.value, t);
      velho.gain.linearRampToValueAtTime(0, t + 1);
      setTimeout(() => velho.disconnect(), 1500);
    }
    const ganho = c.createGain();
    ganho.gain.setValueAtTime(0, t);
    ganho.gain.linearRampToValueAtTime(1, t + 1.5);
    ganho.connect(this.musicaBus);
    this.atual = { nome, trilha: tr, melodia: gerarMelodia(tr), ganho, proximo: t + 0.05, passo: 0 };
  }

  tocarEfeito(nome: Efeito): void {
    const c = this.ctx;
    const bus = this.efeitosBus;
    if (!c || !bus || c.state !== 'running') return;
    const t = c.currentTime;
    const som = SONS[nome];
    if (som) som(this, c, bus, t);
  }

  /** Mantém as notas da trilha ativa agendadas um pouco à frente do relógio do áudio. */
  private agendar(): void {
    const a = this.atual;
    const c = this.ctx;
    if (!a || !c) return;
    const limite = c.currentTime + 0.15;
    const dur = 60 / a.trilha.bpm / 2; // colcheia
    while (a.proximo < limite) {
      this.passo(a, a.proximo, a.passo);
      a.proximo += dur;
      a.passo += 1;
    }
  }

  /** Uma colcheia da trilha: bordão e coro no início do compasso, melodia, percussão. */
  private passo(a: Ativa, t: number, p: number): void {
    const c = this.ctx;
    if (!c) return;
    const tr = a.trilha;
    const dur = 60 / tr.bpm / 2;
    const s = p % 8;
    const compasso = Math.floor(p / 8);
    const acorde = tr.progressao[compasso % tr.progressao.length];
    const dest = a.ganho;
    const v = tr.volume;

    if (s === 0) {
      if (tr.drone) this.tom(c, freqGrau(tr, acorde, -2), t, dur * 8, 'triangle', 0.1 * v, dest, 260);
      if (tr.coro) for (const k of [0, 2, 4]) this.tom(c, freqGrau(tr, acorde + k), t, dur * 8, 'sine', 0.03 * v, dest, 1800);
    }

    const nota = a.melodia[p % a.melodia.length];
    if (nota !== null && nota !== undefined) {
      const f = freqGrau(tr, nota, 1);
      if (tr.melodia === 'lira') {
        this.tom(c, f, t, dur * 2.4, 'triangle', 0.09 * v, dest, 3000);
      } else if (tr.melodia === 'corno') {
        this.tom(c, f, t, dur * 1.9, 'sawtooth', 0.045 * v, dest, 900);
        this.tom(c, f * 1.005, t, dur * 1.9, 'square', 0.02 * v, dest, 700);
      }
    }

    switch (tr.percussao) {
      case 'tambor':
        if (s === 0 || s === 4) this.tambor(c, t, dest, 0.28 * v);
        break;
      case 'taiko':
        if (s === 0) this.taiko(c, t, dest, 0.85 * v);
        if (s === 4) this.taiko(c, t, dest, 0.55 * v);
        if (s === 6) this.taiko(c, t, dest, 0.3 * v);
        break;
      case 'taiko_epica': {
        const forca = [0.95, 0.4, 0.7, 0.45, 0.85, 0.4, 0.7, 0.5][s];
        this.taiko(c, t, dest, forca * v);
        break;
      }
      default:
        break;
    }
  }

  private tom(
    c: AudioContext,
    freq: number,
    t: number,
    dur: number,
    tipo: OscillatorType,
    vol: number,
    destino: AudioNode,
    corte?: number,
    freqFim?: number,
  ): void {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (corte) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = corte;
      g.connect(f);
      f.connect(destino);
    } else {
      g.connect(destino);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private ruidoFiltrado(
    c: AudioContext,
    t: number,
    dur: number,
    tipo: BiquadFilterType,
    freq: number,
    vol: number,
    destino: AudioNode,
  ): void {
    if (!this.ruido) return;
    const src = c.createBufferSource();
    src.buffer = this.ruido;
    const f = c.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(destino);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Taiko: tambor grave com queda de tom e um estalo de baqueta. */
  private taiko(c: AudioContext, t: number, destino: AudioNode, vol: number): void {
    this.tom(c, 110, t, 0.35, 'sine', vol, destino, undefined, 42);
    this.ruidoFiltrado(c, t, 0.05, 'bandpass', 500, 0.3 * vol, destino);
  }

  private tambor(c: AudioContext, t: number, destino: AudioNode, vol: number): void {
    this.tom(c, 150, t, 0.14, 'triangle', vol, destino, undefined, 80);
  }

  /** Grunhido: dente-de-serra com filtro de voz e um sopro de ar. */
  private voz(c: AudioContext, t: number, dur: number, f0: number, f1: number, vol: number, destino: AudioNode): void {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const filtro = c.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 700;
    filtro.Q.value = 2.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(filtro);
    filtro.connect(g);
    g.connect(destino);
    o.start(t);
    o.stop(t + dur + 0.05);
    this.ruidoFiltrado(c, t, dur * 0.6, 'bandpass', 1100, vol * 0.4, destino);
  }

  /** Acesso para os efeitos sonoros, que são funções fora da classe. */
  notas(c: AudioContext, bus: AudioNode, t: number): {
    tom: (freq: number, dt: number, dur: number, tipo: OscillatorType, vol: number, freqFim?: number) => void;
    ruido: (dt: number, dur: number, tipo: BiquadFilterType, freq: number, vol: number) => void;
    voz: (dt: number, dur: number, f0: number, f1: number, vol: number) => void;
  } {
    return {
      tom: (freq, dt, dur, tipo, vol, freqFim) => this.tom(c, freq, t + dt, dur, tipo, vol, bus, undefined, freqFim),
      ruido: (dt, dur, tipo, freq, vol) => this.ruidoFiltrado(c, t + dt, dur, tipo, freq, vol, bus),
      voz: (dt, dur, f0, f1, vol) => this.voz(c, t + dt, dur, f0, f1, vol, bus),
    };
  }
}

type Som = (m: Motor, c: AudioContext, bus: AudioNode, t: number) => void;

const arpejo = (notas: number[], passo: number, tipo: OscillatorType, vol: number): Som =>
  (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    notas.forEach((f, i) => n.tom(f, i * passo, passo * 1.6, tipo, vol));
  };

const SONS: Partial<Record<Efeito, Som>> = {
  clique: (m, c, bus, t) => m.notas(c, bus, t).tom(880, 0, 0.04, 'square', 0.04),
  // Golpe: o assobio da lâmina, o impacto grave e um grunhido curto.
  golpe: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.ruido(0, 0.1, 'highpass', 1400, 0.1);
    n.tom(90, 0.05, 0.35, 'sine', 0.7, 40);
    n.voz(0.03, 0.22, 210, 130, 0.16);
  },
  // Crítico: impacto mais forte, grunhido longo e um tinido de metal.
  critico: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.ruido(0, 0.12, 'highpass', 1200, 0.14);
    n.tom(80, 0.05, 0.45, 'sine', 0.9, 32);
    n.tom(1400, 0.05, 0.5, 'triangle', 0.07);
    n.voz(0.03, 0.36, 260, 120, 0.24);
  },
  esquiva: (m, c, bus, t) => m.notas(c, bus, t).ruido(0, 0.32, 'highpass', 900, 0.2),
  // Bloqueio: lâmina batendo no escudo, metálico.
  bloqueio: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.ruido(0, 0.06, 'highpass', 3500, 0.18);
    n.tom(1046, 0, 0.45, 'triangle', 0.1);
    n.tom(1864, 0, 0.35, 'triangle', 0.05);
  },
  morte: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.voz(0, 0.9, 260, 90, 0.25);
    n.tom(70, 0, 0.9, 'sine', 0.6, 40);
  },
  efeito: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.tom(620, 0, 0.35, 'sine', 0.12);
    n.tom(740, 0, 0.35, 'sine', 0.12);
  },
  atordoado: (m, c, bus, t) => m.notas(c, bus, t).tom(300, 0, 0.25, 'square', 0.1, 150),
  moeda: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.tom(1319, 0, 0.12, 'sine', 0.12);
    n.tom(1760, 0.09, 0.25, 'sine', 0.12);
  },
  // Tábuas sendo arrancadas: estalos secos de madeira, um atrás do outro, e o barulho delas caindo.
  madeira: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    [0, 0.2, 0.42, 0.63].forEach((dt, i) => {
      n.ruido(dt, 0.1, 'bandpass', 1100 + i * 260, 0.42);
      n.ruido(dt + 0.02, 0.2, 'lowpass', 500, 0.3);
      n.tom(170 - i * 14, dt, 0.16, 'square', 0.1, 70);
    });
    [0.9, 1.0, 1.12, 1.25].forEach((dt, i) => n.ruido(dt, 0.07, 'bandpass', 700 + i * 180, 0.2));
  },
  // Parede quebrando: estrondo grave, rachaduras e entulho caindo.
  parede: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.tom(58, 0, 1.2, 'sine', 0.85, 28);
    n.ruido(0, 1.1, 'lowpass', 380, 0.55);
    [0.04, 0.17, 0.31, 0.46].forEach((dt) => n.ruido(dt, 0.09, 'highpass', 2400, 0.32));
    [0.55, 0.64, 0.72, 0.86, 1.0, 1.12].forEach((dt, i) => {
      n.ruido(dt, 0.08, 'bandpass', 600 + i * 150, 0.22);
      n.tom(120 - i * 8, dt, 0.1, 'triangle', 0.08, 60);
    });
  },
  recrutar: arpejo([330, 440, 554], 0.08, 'sine', 0.12),
  vitoria: arpejo([196, 262, 330, 392, 523], 0.16, 'sawtooth', 0.06),
  derrota: arpejo([392, 349, 311, 262], 0.28, 'triangle', 0.12),
  lenda: arpejo([262, 392, 523, 659, 784, 1046], 0.12, 'triangle', 0.14),
  liberdade: arpejo([523, 659, 784, 1046], 0.1, 'sine', 0.14),
  erro: (m, c, bus, t) => {
    const n = m.notas(c, bus, t);
    n.tom(150, 0, 0.18, 'square', 0.1);
    n.tom(120, 0.1, 0.18, 'square', 0.1);
  },
};

const motor = new Motor();

export const audio = {
  desbloquear: (): void => motor.desbloquear(),
  tocarTrilha: (nome: string): void => motor.tocarTrilha(nome),
  tocarEfeito: (nome: Efeito): void => motor.tocarEfeito(nome),
  definirPrefs: (p: Partial<Prefs>): void => motor.definirPrefs(p),
  prefs: (): Prefs => motor.prefsAtuais(),
};
