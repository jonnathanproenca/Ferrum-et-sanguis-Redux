/**
 * Áudio com Web Audio. Camada de arquivos (public/assets/audio, listados em audio-manifest.json): música por tela,
 * efeitos, ambientes e vozes. Sem o arquivo, cai num som sintetizado. Veja docs/AUDIO.md.
 * Música: uma trilha por tela, em loop, com cross-fade. Cada arena tem a sua intensidade:
 * arena pequena (vazia) = trilha discreta; média = trilha firme; cheia = trilha forte.
 * Batalhas de lanista (campanha) geram uma trilha épica própria por lanista.
 * Efeitos: golpes com grunhido, bloqueios com metal, fanfarras. Preferências no navegador.
 */

export type Efeito =
  | 'clique' | 'golpe' | 'critico' | 'esquiva' | 'bloqueio' | 'morte' | 'efeito' | 'atordoado'
  | 'cheat' | 'moeda' | 'madeira' | 'parede' | 'recrutar' | 'vitoria' | 'derrota' | 'lenda' | 'liberdade' | 'erro';

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

/** Telas de gestão sem música própria usam esta, na ordem. */
const ALIAS_MUSICA: Record<string, string[]> = {
  ludus: ['gestao'], upgrades: ['gestao'], mercado: ['gestao'], armeiro: ['gestao'],
  enfermaria: ['gestao'], campanha: ['gestao'], arenas: ['gestao'],
};
const ARENAS = new Set(['pompeia', 'capua', 'poco', 'coliseu']);

type Cena = 'forja' | 'escritorio' | 'enfermaria' | 'mercado';
type Npc = 'engenheiro' | 'medico' | 'mercador';

interface Voz {
  base: number;
  formantes: [number, number];
  silabas: [number, number];
  dur: [number, number];
  /** Variação do tom entre sílabas (semitons) e tendência (negativo = cai). */
  salto: number;
  queda: number;
  aspereza: number;
  vol: number;
}

/** Cada NPC murmura com uma voz diferente: o engenheiro agudo e curioso, o médico grave e rouco, o mercador anasalado. */
const VOZES: Record<Npc, Voz> = {
  engenheiro: { base: 230, formantes: [380, 1250], silabas: [2, 4], dur: [0.07, 0.12], salto: 4, queda: 0, aspereza: 0.05, vol: 0.5 },
  medico: { base: 82, formantes: [330, 760], silabas: [2, 3], dur: [0.18, 0.3], salto: 2, queda: -2.5, aspereza: 0.45, vol: 0.8 },
  mercador: { base: 140, formantes: [480, 1000], silabas: [3, 5], dur: [0.09, 0.15], salto: 3, queda: 0.5, aspereza: 0.2, vol: 0.6 },
};

interface CenaCfg {
  /** Ambiente em loop: chave do arquivo e volume. */
  ambiente?: { chave: string; vol: number; sintese: 'fogo' | 'multidao' };
  bigorna?: boolean;
  npc?: Npc;
}

/** Quadro (ms) em que o martelo toca a bigorna na animação do ferreiro (64 quadros de 42 ms). */
const BIGORNA_IMPACTO = 1.05;
const BIGORNA_CICLO = 2.688;

const CENAS: Record<Cena, CenaCfg> = {
  forja: { ambiente: { chave: 'ambiente/fogo', vol: 0.3, sintese: 'fogo' }, bigorna: true },
  escritorio: { npc: 'engenheiro' },
  enfermaria: { npc: 'medico' },
  mercado: { ambiente: { chave: 'ambiente/mercado', vol: 0.5, sintese: 'multidao' }, npc: 'mercador' },
};

interface CenaAtiva {
  cena: Cena;
  cfg: CenaCfg;
  nos: { ganho: GainNode; src: AudioBufferSourceNode }[];
  /** O ambiente em loop já é o arquivo (e não o sintético de espera). */
  ambArq: boolean;
  proxBigorna: number;
  proxVoz: number;
}

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
  /** Arquivos de áudio disponíveis: chave (sem extensão) -> caminho. */
  private manifesto = new Map<string, string>();
  private buffers = new Map<string, AudioBuffer>();
  private carregando = new Set<string>();
  private arq: { chave: string; ganho: GainNode; src: AudioBufferSourceNode } | null = null;
  private efetiva = '';
  private pedida: Cena | null = null;
  private cenaAt: CenaAtiva | null = null;

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
        void this.carregarManifesto();
      }
      void this.ctx.resume().then(() => {
        this.tocarTrilha(this.desejada);
        this.aplicarCena();
      });
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

  private async carregarManifesto(): Promise<void> {
    try {
      const base = import.meta.env.BASE_URL;
      const r = await fetch(`${base}audio-manifest.json`);
      if (!r.ok || (r.headers.get('content-type') ?? '').includes('html')) return;
      const lista = (await r.json()) as string[];
      for (const arq of lista) this.manifesto.set(arq.replace(/\.[^.]+$/, ''), `${base}assets/audio/${arq}`);
      for (const k of this.manifesto.keys()) if (k.startsWith('sfx/')) this.obter(k);
      this.efetiva = '';
      this.tocarTrilha(this.desejada);
      this.aplicarCena();
    } catch {
      /* sem manifesto: só som sintetizado */
    }
  }

  /** Devolve o áudio decodificado ou começa a carregá-lo (retorna undefined até ficar pronto). */
  private obter(chave: string): AudioBuffer | undefined {
    const pronto = this.buffers.get(chave);
    if (pronto) return pronto;
    const url = this.manifesto.get(chave);
    const c = this.ctx;
    if (!url || !c || this.carregando.has(chave)) return undefined;
    this.carregando.add(chave);
    void fetch(url)
      .then((r) => r.arrayBuffer())
      .then((d) => c.decodeAudioData(d))
      .then((b) => {
        this.buffers.set(chave, b);
        const pend = this.pendentes.get(chave);
        if (pend) {
          this.pendentes.delete(chave);
          if (performance.now() - pend.em < 4000) this.tocarArquivo(chave, pend.vol, pend.bus);
        }
        this.efetiva = '';
        this.tocarTrilha(this.desejada);
        this.aplicarCena();
      })
      .catch(() => undefined);
    return undefined;
  }

  /** Variantes de um som: 'sfx/golpe' e 'sfx/golpe-1', 'sfx/golpe-2'... */
  private variantes(base: string): string[] {
    const saida: string[] = [];
    for (const k of this.manifesto.keys()) if (k === base || /-\d+$/.test(k) && k.replace(/-\d+$/, '') === base) saida.push(k);
    return saida;
  }

  /** Efeitos pedidos antes de o arquivo terminar de carregar: tocam assim que ele fica pronto (até 4 s depois). */
  private pendentes = new Map<string, { vol: number; bus: AudioNode; em: number }>();

  private tocarArquivo(chave: string, vol: number, bus: AudioNode, atraso = 0, esperar = false): boolean {
    const c = this.ctx;
    const buf = this.obter(chave);
    if (!buf && esperar) this.pendentes.set(chave, { vol, bus, em: performance.now() });
    if (!c || !buf) return false;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(bus);
    src.start(c.currentTime + atraso);
    return true;
  }

  private chaveMusica(nome: string): string | undefined {
    const generico = nome.startsWith('campanha:') ? ['campanha', 'coliseu'] : [];
    for (const k of [nome, ...generico, ...(ALIAS_MUSICA[nome] ?? [])]) if (this.manifesto.has(`musica/${k}`)) return `musica/${k}`;
    return undefined;
  }

  private calarMusica(t: number): void {
    const apagar = (g: GainNode): void => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 1);
      setTimeout(() => g.disconnect(), 1500);
    };
    if (this.atual) apagar(this.atual.ganho);
    this.atual = null;
    if (this.arq) {
      apagar(this.arq.ganho);
      const velho = this.arq.src;
      setTimeout(() => velho.stop(), 1500);
      this.arq = null;
    }
  }

  /** Troca a música da tela. Com o som ainda bloqueado, guarda o pedido para depois. */
  tocarTrilha(nome: string): void {
    this.desejada = nome;
    if (nome === 'menu' || ARENAS.has(nome) || nome.startsWith('campanha:')) {
      this.pedida = null;
      this.aplicarCena();
    }
    const c = this.ctx;
    if (!c || !this.musicaBus || c.state !== 'running') return;
    const chave = this.chaveMusica(nome);
    const buf = chave ? this.obter(chave) : undefined;
    const tr = this.trilha(nome) ?? TRILHAS.gestao;
    const nomeSint = this.trilha(nome) ? nome : 'gestao';
    const efetiva = buf ? `arq:${chave}` : `sint:${nomeSint}`;
    if (this.efetiva === efetiva) return;
    this.efetiva = efetiva;
    const t = c.currentTime;
    this.calarMusica(t);
    const ganho = c.createGain();
    ganho.gain.setValueAtTime(0, t);
    ganho.gain.linearRampToValueAtTime(1, t + 1.5);
    ganho.connect(this.musicaBus);
    if (buf && chave) {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(ganho);
      src.start(t);
      this.arq = { chave, ganho, src };
      return;
    }
    this.atual = { nome: nomeSint, trilha: tr, melodia: gerarMelodia(tr), ganho, proximo: t + 0.05, passo: 0 };
  }

  /** Registra qual cena animada está na tela (null = nenhuma). Efetiva com aplicarCena(). */
  cena(nome: Cena | null): void {
    this.pedida = nome;
  }

  aplicarCena(): void {
    const c = this.ctx;
    const bus = this.efeitosBus;
    if (!c || !bus || c.state !== 'running') return;
    const ambPronto = (cena: Cena | null): boolean => {
      const chave = cena ? CENAS[cena].ambiente?.chave : undefined;
      return !!chave && this.buffers.has(chave);
    };
    // Se o arquivo do ambiente terminou de carregar, troca o ruído de espera por ele.
    const mesma = this.cenaAt?.cena === this.pedida && !(this.cenaAt && !this.cenaAt.ambArq && ambPronto(this.pedida));
    // A animação reinicia a cada redesenho da tela: realinha a bigorna com o quadro do martelo.
    if (mesma && this.cenaAt) {
      this.cenaAt.proxBigorna = c.currentTime + BIGORNA_IMPACTO;
      return;
    }
    if (this.cenaAt) {
      const t = c.currentTime;
      for (const n of this.cenaAt.nos) {
        n.ganho.gain.cancelScheduledValues(t);
        n.ganho.gain.setValueAtTime(n.ganho.gain.value, t);
        n.ganho.gain.linearRampToValueAtTime(0, t + 0.5);
        const src = n.src;
        setTimeout(() => src.stop(), 700);
      }
      this.cenaAt = null;
    }
    if (!this.pedida) return;
    const cfg = CENAS[this.pedida];
    for (const k of [...(cfg.npc ? this.variantes(`voz/${cfg.npc}`) : []), ...(cfg.bigorna ? this.variantes('cena/bigorna') : [])]) this.obter(k);
    const nos: CenaAtiva['nos'] = [];
    const amb = cfg.ambiente;
    if (amb) {
      const buf = this.obter(amb.chave);
      const src = c.createBufferSource();
      const g = c.createGain();
      if (buf) {
        src.buffer = buf;
      } else if (this.ruido && amb.sintese === 'fogo') {
        src.buffer = this.ruido;
        const f = c.createBiquadFilter();
        f.type = amb.sintese === 'fogo' ? 'lowpass' : 'bandpass';
        f.frequency.value = amb.sintese === 'fogo' ? 420 : 650;
        f.Q.value = amb.sintese === 'fogo' ? 0.7 : 0.6;
        src.connect(f);
        f.connect(g);
      }
      src.loop = true;
      if (buf) src.connect(g);
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(buf ? amb.vol : amb.vol * (amb.sintese === 'fogo' ? 0.5 : 0.22), c.currentTime + 1);
      g.connect(bus);
      src.start();
      nos.push({ ganho: g, src });
    }
    this.cenaAt = {
      cena: this.pedida,
      cfg,
      nos,
      ambArq: !!amb && !!this.buffers.get(amb.chave),
      proxBigorna: c.currentTime + BIGORNA_IMPACTO,
      proxVoz: c.currentTime + 1.5 + Math.random() * 2,
    };
  }

  /** Agenda os sons pontuais da cena: bigorna sincronizada, murmúrios, estalos e vozes de fundo. */
  private agendarCena(c: AudioContext): void {
    const s = this.cenaAt;
    const bus = this.efeitosBus;
    if (!s || !bus) return;
    const agora = c.currentTime;
    if (s.cfg.bigorna) {
      while (s.proxBigorna < agora + 0.15) {
        if (s.proxBigorna > agora - 0.05) this.bigorna(c, bus, Math.max(s.proxBigorna, agora));
        s.proxBigorna += BIGORNA_CICLO;
      }
    }
    if (s.cfg.npc && agora >= s.proxVoz) {
      this.murmurar(c, bus, s.cfg.npc, agora + 0.02);
      s.proxVoz = agora + 4 + Math.random() * 5;
    }
    const amb = s.cfg.ambiente;
    if (amb && !this.buffers.has(amb.chave)) {
      if (amb.sintese === 'fogo' && Math.random() < 0.1) {
        this.ruidoFiltrado(c, agora, 0.03 + Math.random() * 0.04, 'highpass', 2500 + Math.random() * 2500, 0.05, bus);
      }
      if (amb.sintese === 'multidao' && Math.random() < 0.05) {
        const f = 90 + Math.random() * 130;
        this.murmurar(c, bus, 'mercador', agora, { base: f, vol: 0.12 });
      }
    }
  }

  private bigorna(c: AudioContext, bus: AudioNode, t: number): void {
    const vars = this.variantes('cena/bigorna');
    if (vars.length) {
      const k = vars[Math.floor(Math.random() * vars.length)];
      if (this.buffers.has(k)) {
        this.tocarArquivo(k, 1, bus, Math.max(0, t - c.currentTime));
        return;
      }
      this.obter(k);
    }
    // Síntese: pancada de martelo, tinido de ferro e ressonância.
    this.ruidoFiltrado(c, t, 0.05, 'highpass', 3000, 0.5, bus);
    this.tom(c, 180, t, 0.12, 'square', 0.35, bus, undefined, 90);
    for (const [f, v, d] of [[1250, 0.22, 0.9], [2230, 0.14, 0.6], [3380, 0.08, 0.4], [780, 0.12, 1.1]] as const) {
      this.tom(c, f, t, d, 'sine', v, bus);
    }
  }

  private murmurar(c: AudioContext, bus: AudioNode, npc: Npc, t: number, ajuste?: { base: number; vol: number }): void {
    const vars = this.variantes(`voz/${npc}`);
    if (vars.length && !ajuste) {
      const k = vars[Math.floor(Math.random() * vars.length)];
      this.tocarArquivo(k, 1, bus);
      return; // com arquivo, nunca cai na voz sintética (se ainda carrega, fica em silêncio)
    }
    const v = { ...VOZES[npc], ...ajuste };
    const n = v.silabas[0] + Math.floor(Math.random() * (v.silabas[1] - v.silabas[0] + 1));
    let semitom = 0;
    let at = t;
    for (let i = 0; i < n; i++) {
      const dur = v.dur[0] + Math.random() * (v.dur[1] - v.dur[0]);
      semitom += (Math.random() * 2 - 1) * v.salto + v.queda;
      const f = v.base * Math.pow(2, semitom / 12);
      // Fonte glótica (dente-de-serra suavizada) com vibrato, passando por formantes largos de vogal nasal.
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, at);
      o.frequency.linearRampToValueAtTime(Math.max(40, f * (1 + (Math.random() - 0.5) * 0.18)), at + dur);
      const lfo = c.createOscillator();
      lfo.frequency.value = 5.5;
      const lfoG = c.createGain();
      lfoG.gain.value = f * 0.012;
      lfo.connect(lfoG);
      lfoG.connect(o.frequency);
      const suave = c.createBiquadFilter();
      suave.type = 'lowpass';
      suave.frequency.value = Math.min(2600, f * 7);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(v.vol * 0.9, at + Math.min(0.04, dur * 0.3));
      g.gain.linearRampToValueAtTime(v.vol * 0.55, at + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, at + dur);
      o.connect(suave);
      const vogal = 0.85 + Math.random() * 0.3;
      for (const [fm, q, ganho] of [[v.formantes[0] * vogal, 2, 1], [v.formantes[1] * (1.25 - (vogal - 0.85)), 2.5, 0.55], [2400, 3, 0.18]] as const) {
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = fm;
        bp.Q.value = q;
        const gf = c.createGain();
        gf.gain.value = ganho * 2.2;
        suave.connect(bp);
        bp.connect(gf);
        gf.connect(g);
      }
      g.connect(bus);
      o.start(at);
      lfo.start(at);
      o.stop(at + dur + 0.03);
      lfo.stop(at + dur + 0.03);
      if (v.aspereza > 0) this.ruidoFiltrado(c, at, dur * 0.8, 'bandpass', v.formantes[0] * 1.3, v.vol * v.aspereza * 0.12, bus);
      at += dur * (0.9 + Math.random() * 0.5);
    }
  }

  tocarEfeito(nome: Efeito): void {
    const c = this.ctx;
    const bus = this.efeitosBus;
    if (!c || !bus || c.state !== 'running') return;
    const vars = this.variantes(`sfx/${nome}`);
    if (vars.length) {
      const k = vars[Math.floor(Math.random() * vars.length)];
      if (this.tocarArquivo(k, 1, bus, 0, true)) return;
      if (!SONS[nome]) return;
    }
    const t = c.currentTime;
    const som = SONS[nome];
    if (som) som(this, c, bus, t);
  }

  /** Mantém as notas da trilha ativa agendadas um pouco à frente do relógio do áudio. */
  private agendar(): void {
    const a = this.atual;
    const c = this.ctx;
    if (c) this.agendarCena(c);
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
  cena: (nome: Cena | null): void => motor.cena(nome),
  aplicarCena: (): void => motor.aplicarCena(),
  definirPrefs: (p: Partial<Prefs>): void => motor.definirPrefs(p),
  prefs: (): Prefs => motor.prefsAtuais(),
};
