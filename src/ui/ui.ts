import { nomeAparencia } from '../art/gladiador';
import { iconeItem } from '../art/icones';
import { FORJA } from '../art/armeiro';
import { ESCRITORIO } from '../art/engenheiro';
import { ENFERMARIA } from '../art/enfermaria';
import { MERCADO, spriteEscravo } from '../art/mercado';
import { SPRITES_CLASSE } from '../art/sprites';
import { varianteDe } from '../art/variantes';
import { pixelarImagens, colorirSprites } from '../art/pixel';
import { SPRITES_LANISTA, FUNDO_LANISTAS } from '../art/lanistas';
import { CAMADAS_LUDUS, LUDUS_IMG, GUARDAS_VARANDA, GUARDACORPO, LANISTA_VARANDA, PONTOS_PATIO, PORTAO_LUDUS, SPRITES_GLADIADOR, SPRITE_DOCTORE, TREINO_PATIO } from '../art/ludus';
import { audio, type Efeito } from '../audio/audio';
import {
  ARENAS,
  avancarTurno,
  capacidadeLudus,
  comprarItem,
  comprarMestre,
  precoRecruta,
  gerarArmeiroMestre,
  podeGastarEnergia,
  gameOver,
  construirMelhoria,
  equipar,
  lanistaDaCasa,
  LANISTAS,
  melhoriaPorId,
  MELHORIAS_LUDUS,
  lutarArena,
  lutarCampanha,
  desistirDaLuta,
  MAX_GLADIADORES,
  novoJogo,
  PASSOS,
  escolherLanista,
  proximoDesafio,
  recrutar,
  temMelhoria,
  tratar,
  trocarClasse,
  escolherEstilo,
  treinar,
  venderGladiador,
  dispensarGladiador,
  definirConfig,
  limiarLiberdade,
  type Arena,
  type Estado,
  type MelhoriaId,
  type PayloadLuta,
} from '../core/game';
import { carregar, salvar } from '../core/save';
import {
  aparenciaDe,
  ATRIBUTOS,
  CLASSES,
  CLASSES_IDS,
  custoTratamento,
  COR_QUALIDADE,
  QUALIDADES,
  qualidadeDe,
  NOME_ATRIBUTO,
  NOME_CONDICAO,
  terraPorId,
  DESC_CONDICAO,
  NOME_SLOT,
  precoGladiador,
  SLOTS,
  statsDoGladiador,
  itemPorId,
  type Atributo,
  type ClasseId,
  type Gladiador,
  type Item,
  type Slot,
} from '../core/model';
import type { Stats, TipoEfeito } from '../core/combat';

type Aba = 'ludus' | 'upgrades' | 'mercado' | 'armeiro' | 'enfermaria' | 'arenas' | 'campanha' | 'config';

const ABAS: [Aba, string][] = [
  ['ludus', 'Ludus'],
  ['upgrades', 'Upgrades'],
  ['mercado', 'Mercado'],
  ['armeiro', 'Armeiro'],
  ['enfermaria', 'Enfermaria'],
  ['arenas', 'Arenas'],
  ['campanha', 'Campanha'],
  ['config', 'Opções'],
];

const NOME_EFEITO: Record<TipoEfeito, string> = {
  sangramento: 'Sangramento',
  envenenamento: 'Envenenamento',
  contusao: 'Contusão',
  queimadura: 'Queimadura',
};

const ABREV: Record<Atributo, string> = { forca: 'FOR', agilidade: 'AGI', vitalidade: 'VIT', sorte: 'SOR' };

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string | number): string => String(s).replace(/[&<>"']/g, (c) => ENTIDADES[c]);

const EMBLEMA = `<svg class="emblema" viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="60" cy="60" r="56" fill="#1d1411" stroke="#f2d28a" stroke-width="3"/>
  <circle cx="60" cy="60" r="48" fill="none" stroke="#8a1c1c" stroke-width="2" stroke-dasharray="4 4"/>
  <path d="M60 22 L74 52 L60 98 L46 52 Z" fill="#8a1c1c" stroke="#f2d28a" stroke-width="2"/>
  <line x1="34" y1="34" x2="86" y2="86" stroke="#e8d5b0" stroke-width="5" stroke-linecap="round"/>
  <line x1="86" y1="34" x2="34" y2="86" stroke="#e8d5b0" stroke-width="5" stroke-linecap="round"/>
  <circle cx="60" cy="60" r="7" fill="#f2d28a"/>
</svg>`;

function fmtStats(s: Stats): string {
  return ATRIBUTOS.map((a) => `${ABREV[a]} ${s[a]}`).join(' · ');
}

function fmtBonus(b: Partial<Stats>): string {
  const partes = (Object.entries(b) as [Atributo, number][])
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${ABREV[k]} ${v > 0 ? '+' : ''}${v}`);
  return partes.length ? partes.join(', ') : 'sem bônus';
}

function fmtItem(item: Item): string {
  const peso = item.peso ? ` (${item.peso})` : '';
  const q = item.qualidade ? ` [${QUALIDADES[item.qualidade]}]` : '';
  return `${item.nome}${q}${peso} · ${fmtBonus(item.bonus)}`;
}

function caracteristicas(g: Gladiador): string {
  const terra = terraPorId(g.terra).nome;
  const t = g.tendencia ? `Tendência: ${NOME_ATRIBUTO[g.tendencia]}` : '';
  const c = g.condicao ? NOME_CONDICAO[g.condicao] : '';
  return [terra, t, c].filter(Boolean).join(' · ');
}

function nomeOrigem(g: Gladiador): string {
  if (g.campeao) return 'Campeão do ludus';
  return g.origem === 'livre' ? 'Livre' : 'Escravo';
}

/**
 * Monta a interface dentro de `raiz`. A UI guarda só o que precisa para desenhar;
 * o estado da partida vive em `e` e é salvo após cada ação.
 */
export function montarUi(raiz: HTMLElement, opcoes: {
  iniciarArena(payload: PayloadLuta, onFim: () => void, onDesistir?: () => void): void;
}): void {
  new MutationObserver(() => { pixelarImagens(raiz); colorirSprites(raiz); }).observe(raiz, { childList: true, subtree: true });
  let e: Estado | null = null;
  let aba: Aba = 'ludus';
  let menuAberto = true;
  let escolhendo = false;
  let lanistaSel: string | null = null;
  let aviso = '';
  let equipe: string[] = [];
  const abertos = new Set<string>();

  /** Gladiadores escolhidos para a próxima luta (só os vivos). */
  function equipeValida(s: Estado): Gladiador[] {
    const vivos = s.gladiadores.filter((g) => g.vivo && !g.semEstilo);
    equipe = equipe.filter((id) => vivos.some((g) => g.id === id));
    return equipe.map((id) => vivos.find((g) => g.id === id) as Gladiador);
  }

  function opcoesSlot(s: Estado, g: Gladiador, slot: Slot): Item[] {
    const ids = new Set<string>(
      s.inventario.filter((id) => {
        const item = itemPorId(id);
        return item.slot === slot && item.classes.includes(g.classe);
      }),
    );
    const atual = g.equipamento[slot];
    if (atual) ids.add(atual);
    return [...ids].map((id) => itemPorId(id));
  }

  /** Gladiador com a mesma sprite da arena (pose de guarda), na cor do seu id e com moldura da melhor peça. */
  function gladiadorImg(g: Gladiador): string {
    if (g.semEstilo) return `<img class="gladiador-img sprite-card sprite-escravo" src="${spriteEscravo(g.terra, g.look)}" alt="" draggable="false">`;
    const q = Math.max(0, ...SLOTS.map((sl) => qualidadeDe(g.equipamento[sl])));
    const cor = q > 0 ? COR_QUALIDADE[q] : 'transparent';
    const set = SPRITES_CLASSE[g.classe];
    const quadro = set?.quadros.guarda;
    if (!quadro) return '';
    return `<img class="gladiador-img sprite-card" data-sprite="${quadro.arquivo}" data-variante="${varianteDe(g.id)}" src="${quadro.arquivo}" style="--q:${cor}" alt="" draggable="false">`;
  }

  function cardGladiador(s: Estado, g: Gladiador): string {
    const casa = lanistaDaCasa(s);
    const ap = aparenciaDe(g);
    const stats = statsDoGladiador(g, casa.especialidade);
    const classe = CLASSES[g.classe];
    const morto = !g.vivo;
    const efeitos = g.efeitos.length
      ? `<div class="efeitos">${g.efeitos
          .map((ef) => `<span class="efeito">${NOME_EFEITO[ef.tipo]} ${ef.severidade}</span>`)
          .join('')}</div>`
      : '';

    const estiloEscolha = g.semEstilo
      ? `<div class="linha">
          <select data-campo="estilo" aria-label="Estilo de luta">${CLASSES_IDS.map((c) => `<option value="${c}">${CLASSES[c].nome}</option>`).join('')}</select>
          <button class="btn primario" data-acao="estilo" data-id="${g.id}">Definir estilo (grátis)</button>
        </div>`
      : '';
    const acoes = g.vivo
      ? `${estiloEscolha}<div class="linha">
          ${
            temMelhoria(s, 'palus')
              ? `<select data-campo="atributo" aria-label="Atributo para treinar">${ATRIBUTOS.map(
                  (a) => `<option value="${a}">${NOME_ATRIBUTO[a]}</option>`,
                ).join('')}</select>
                <button class="btn" data-acao="treinar" data-id="${g.id}">Treinar</button>`
              : '<span class="meta">Treino: construa os palus.</span>'
          }
          ${
            g.campeao || g.semEstilo
              ? ''
              : `<select data-campo="classe" aria-label="Novo estilo">${CLASSES_IDS.filter((c) => c !== g.classe)
                  .map((c) => `<option value="${c}">${CLASSES[c].nome}</option>`)
                  .join('')}</select>
                 <button class="btn" data-acao="trocar" data-id="${g.id}">Trocar estilo</button>`
          }
          ${
            g.efeitos.length
              ? temMelhoria(s, 'enfermaria')
                ? `<button class="btn primario" data-acao="tratar" data-id="${g.id}">Tratar (${custoTratamento(g)} ouro)</button>`
                : '<span class="meta">Ferido: construa a enfermaria.</span>'
              : ''
          }
        </div>`
      : '';

    const equip = SLOTS.map((slot) => {
      const atual = g.equipamento[slot];
      const itemAtual = atual ? itemPorId(atual) : null;
      const opcoes = opcoesSlot(s, g, slot)
        .map((item) => `<option value="${item.id}" ${atual === item.id ? 'selected' : ''} style="color:${COR_QUALIDADE[item.qualidade]}">${esc(fmtItem(item))}</option>`)
        .join('');
      return `<div class="slot">
        <div class="slot-topo">${itemAtual ? iconeItem(itemAtual, 40) : '<span class="icone-vazio"></span>'}
          <div class="slot-info"><span>${NOME_SLOT[slot]}</span>${itemAtual ? `<b style="color:${COR_QUALIDADE[itemAtual.qualidade]}">${esc(itemAtual.nome)} · ${QUALIDADES[itemAtual.qualidade]}</b><small>${esc(fmtBonus(itemAtual.bonus))}</small>` : '<small>vazio</small>'}</div></div>
        <select data-acao="equipar" data-id="${g.id}" data-slot="${slot}">
          <option value="">— vazio —</option>${opcoes}
        </select></div>`;
    }).join('');

    const venda = g.campeao
      ? '<p class="meta">O campeão não é vendido nem dispensado.</p>'
      : g.lenda
        ? `<p class="meta">Lenda: só deixa o ludus pela liberdade, com ${limiarLiberdade(s.config)} vitórias.</p>`
        : `<div class="linha">${
            g.vivo && g.origem === 'escravo'
              ? `<button class="btn" data-acao="vender" data-id="${g.id}">Vender · ${Math.max(20, Math.round(precoGladiador(g) / 2))} ouro</button>`
              : ''
          }<button class="btn" data-acao="dispensar" data-id="${g.id}">Dispensar</button></div>`;

    const chaveDetalhes = `eq-${g.id}`;
    return `<article id="g-${g.id}" class="card ${morto ? 'morto' : ''} ${g.campeao ? 'campeao' : ''}">
      <div class="thumb">${gladiadorImg(g)}</div>
      <h3>${esc(g.nome)} <small>${g.semEstilo ? 'Sem estilo' : esc(classe.nome)}</small> ${g.campeao ? '<span class="selo">Campeão</span>' : ''}${g.lenda ? '<span class="selo lenda">Lenda</span>' : ''}</h3>
      <p class="meta">${esc(nomeOrigem(g))} · ${g.semEstilo ? esc(caracteristicas(g)) : esc(nomeAparencia(ap))} · Nível ${g.nivel}${morto ? ' · morto' : ''}</p>
      <p class="meta">Vitórias ${g.vitorias} · Poço ${g.vitoriasPoco} · Derrotas ${g.derrotas}</p>
      ${g.semEstilo ? '<p class="passiva">Sem estilo: não luta nas arenas até você definir como ele vai lutar. O kit básico vem junto.</p>' : `<p class="passiva"><strong>${esc(classe.passivaNome)}:</strong> ${esc(classe.passivaDescricao)}</p>`}
      <p class="stats">${fmtStats(stats)}</p>
      ${efeitos}
      ${acoes}
      ${venda}
      ${
        g.semEstilo
          ? '<p class="meta">Equipamento: defina o estilo primeiro.</p>'
          : temMelhoria(s, 'armaria')
          ? `<details data-chave="${chaveDetalhes}" ${abertos.has(chaveDetalhes) ? 'open' : ''}>
        <summary>Equipamento</summary>
        <div class="slots">${equip}</div>
      </details>`
          : '<p class="meta">Equipamento: construa a armaria.</p>'
      }
    </article>`;
  }

  /** O doutor estala o chicote em intervalos aleatórios, enquanto a cena do ludus estiver na tela. */
  const estalarChicote = (): void => {
    const el = raiz.querySelector('.doctore');
    if (el) {
      el.classList.add('estala');
      window.setTimeout(() => el.classList.remove('estala'), 520);
    }
    window.setTimeout(estalarChicote, 1800 + Math.random() * 4200);
  };
  window.setTimeout(estalarChicote, 2500);

  /** Estado da cena do ludus: portão aberto, painel de um edifício e gladiador em foco. */
  let portaoAberto = false;
  let painelLudus: string | null = null;
  /** Compra em andamento: a cena do ludus anima a obra (tábuas arrancadas, parede quebrando, fade). */
  let animCompra: { id: MelhoriaId; t0: number } | null = null;

  const pct = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;

  /** Posição em porcentagem de uma região da imagem do ludus (em pixels da imagem), com folga opcional. */
  function posicaoLudus(c: { x: number; y: number; w: number; h: number }, folga = 0): string {
    return `left:${pct(c.x - folga, LUDUS_IMG.w)};top:${pct(c.y - folga, LUDUS_IMG.h)};width:${pct(c.w + 2 * folga, LUDUS_IMG.w)};height:${pct(c.h + 2 * folga, LUDUS_IMG.h)};`;
  }

  /** Painel da enfermaria (aberto pelo ícone na cena): lista os feridos e permite tratá-los. */
  function painelDaMelhoria(s: Estado, id: MelhoriaId): string {
    if (id !== 'enfermaria' || !temMelhoria(s, id)) return '';
    const feridos = s.gladiadores.filter((g) => g.vivo && g.efeitos.length);
    const corpo = feridos.length
      ? feridos
          .map((g) => `<p class="meta">${esc(g.nome)}: ${g.efeitos.map((ef) => NOME_EFEITO[ef.tipo]).join(', ')} <button class="btn primario" data-acao="tratar" data-id="${g.id}">Tratar (${custoTratamento(g)} ouro)</button></p>`)
          .join('')
      : '<p class="meta">Ninguém ferido agora.</p>';
    return `<div class="painel-ludus"><h3>Enfermaria <small>construída</small></h3>${corpo}</div>`;
  }

  /** Gladiadores do jogador no pátio (só os vivos), o doutor que patrulha, os guardas e o equipamento de treino. */
  function personagensLudus(s: Estado, animId: MelhoriaId | null): string {
    const hash = (t: string): number => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const sprite = (sp: { arquivo: string; w: number; h: number }, cx: number, pe: number, extra = '', estilo = ''): string =>
      `<img class="ludus-sprite ${extra}" src="${sp.arquivo}" style="left:${pct(cx - sp.w / 2, LUDUS_IMG.w)};top:${pct(pe - sp.h, LUDUS_IMG.h)};width:${pct(sp.w, LUDUS_IMG.w)};z-index:${Math.round(pe)};${estilo}" alt="" draggable="false">`;
    const vivos = s.gladiadores.filter((g) => g.vivo);
    const gladiadores = vivos
      .map((g, i) => {
        const h = hash(g.id);
        const sp = SPRITES_GLADIADOR[h % SPRITES_GLADIADOR.length];
        const [cx, pe] = PONTOS_PATIO[i % PONTOS_PATIO.length];
        const atraso = -(h % 40) / 10;
        const duracao = 2.6 + (h % 17) / 10;
        const espelho = h % 2 ? 'espelhado' : '';
        return sprite(sp, cx, pe, `treina ${espelho}`, `animation-duration:${duracao}s;animation-delay:${atraso}s;`);
      })
      .join('');
    const dh = SPRITE_DOCTORE;
    const doutor = `<div class="doctore" style="top:${pct(452 - dh.h, LUDUS_IMG.h)};width:${pct(dh.w, LUDUS_IMG.w)};z-index:452">
        <div class="doctore-corpo"><img class="ludus-sprite-fixo" src="${dh.arquivo}" alt="" draggable="false">
        <svg class="chicote" viewBox="0 0 120 60" aria-hidden="true"><g transform="translate(120,0) scale(-1,1)"><path d="M2 36 C 28 6, 60 2, 98 22" stroke="#e8d5b0" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M98 22 l8 -6 m-8 6 l9 2 m-9 -2 l5 9" stroke="#fff6c8" stroke-width="2" stroke-linecap="round"/></g></svg></div>
      </div>`;
    const guardas =
      GUARDAS_VARANDA.map((g) => sprite(g.sprite, g.x, g.y, 'guarda')).join('') +
      (() => {
        const sp = SPRITES_LANISTA[s.casaId];
        const h = LANISTA_VARANDA.altura;
        // O lanista escolhido pelo jogador fica no balcão, entre os guardas.
        return sp ? sprite({ arquivo: sp.arquivo, w: Math.round((sp.w * h) / sp.h), h }, LANISTA_VARANDA.x, LANISTA_VARANDA.y, 'guarda lanista') : '';
      })();
    const guardaCorpo = GUARDACORPO.map(
      (t) => `<img class="ludus-sprite guardacorpo" src="${t.arquivo}" style="left:${pct(t.x, LUDUS_IMG.w)};top:${pct(t.y, LUDUS_IMG.h)};width:${pct(t.w, LUDUS_IMG.w)};z-index:240" alt="" draggable="false">`,
    ).join('');
    const treino = temMelhoria(s, 'palus')
      ? TREINO_PATIO.map((t) => sprite(t.sprite, t.x, t.y, animId === 'palus' ? 'treino-fixo fade-compra' : 'treino-fixo', animId === 'palus' ? '--d:.3s;' : '')).join('')
      : '';
    return guardas + guardaCorpo + treino + gladiadores + doutor;
  }

  /** Seções fechadas com tábuas até serem construídas; a compra arranca as tábuas e revela a seção. */
  const COM_TABUAS: MelhoriaId[] = ['enfermaria', 'refeitorio', 'alojamentos'];
  const DURACAO_COMPRA = 3.2;
  const TABUAS = [
    { top: 4, r: -4, vx: -95, rf: -210, d: 0 },
    { top: 28, r: 3, vx: 110, rf: 180, d: 0.14 },
    { top: 52, r: -2, vx: -140, rf: -150, d: 0.28 },
    { top: 76, r: 4, vx: 125, rf: 230, d: 0.42 },
  ];
  const ICONES_LUDUS: Partial<Record<MelhoriaId, { rotulo: string; acao: string; valor: string; svg: string }>> = {
    armaria: {
      rotulo: 'Armeiro',
      acao: 'aba',
      valor: 'armeiro',
      svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.4 11.5H9.6L12 1.5zM7.5 13h9v2.2h-9zM10.9 15.2h2.2V22h-2.2z" fill="currentColor"/></svg>',
    },
    enfermaria: {
      rotulo: 'Enfermaria',
      acao: 'aba',
      valor: 'enfermaria',
      svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor"/></svg>',
    },
  };

  /** Estado da cena do ludus: portão aberto e seção aberta. */
  function cenaLudus(s: Estado): string {
    const casa = lanistaDaCasa(s);
    const ativa = animCompra && Date.now() - animCompra.t0 < DURACAO_COMPRA * 1000 ? animCompra : null;
    const decorrido = ativa ? (Date.now() - ativa.t0) / 1000 : 0;
    const animando = (id: MelhoriaId): boolean => ativa?.id === id;
    const camadas = MELHORIAS_LUDUS.filter((m) => m.id !== 'palus' && temMelhoria(s, m.id))
      .map((m) => {
        const c = CAMADAS_LUDUS[m.id];
        const anim = animando(m.id);
        const atraso = COM_TABUAS.includes(m.id) ? '1s' : '0.6s';
        return `<img class="ludus-camada ${anim ? 'fade-compra' : ''}" src="${c.arquivo}" style="${posicaoLudus(c)}${anim ? `--d:${atraso};` : ''}" alt="" draggable="false">`;
      })
      .join('');
    const tabuas = COM_TABUAS.filter((id) => !temMelhoria(s, id) || animando(id))
      .map((id) => {
        const c = CAMADAS_LUDUS[id];
        const t = TABUAS.map(
          (b) => `<i class="tabua" style="top:${b.top}%;--r:${b.r}deg;--vx:${b.vx}%;--rf:${b.rf}deg;--d:${b.d}s"></i>`,
        ).join('');
        return `<div class="tabuas ${animando(id) ? 'arranca' : ''}" style="${posicaoLudus(c, 5)}" title="${esc(melhoriaPorId(id).nome)}: construa no menu Upgrades">${t}</div>`;
      })
      .join('');
    const poeira = animando('armaria')
      ? `<div class="poeira" style="${posicaoLudus(CAMADAS_LUDUS.armaria, 10)}"><i></i><i></i><i></i></div>`
      : '';
    const icones = (Object.keys(ICONES_LUDUS) as MelhoriaId[])
      .filter((id) => temMelhoria(s, id))
      .map((id) => {
        const ic = ICONES_LUDUS[id];
        const c = CAMADAS_LUDUS[id];
        if (!ic) return '';
        const feridos = id === 'enfermaria' ? s.gladiadores.filter((g) => g.vivo && g.efeitos.length).length : 0;
        return `<button class="icone-ludus ${animando(id) ? 'pop' : ''} ${painelLudus === id ? 'aberta' : ''}" data-acao="${ic.acao}" data-valor="${ic.valor}" style="left:${pct(c.x + c.w / 2, LUDUS_IMG.w)};top:${pct(c.y + c.h / 2, LUDUS_IMG.h)}" aria-label="${ic.rotulo}" title="${ic.rotulo}">${ic.svg}${feridos ? `<span class="icone-aviso">${feridos}</span>` : ''}</button>`;
      })
      .join('');
    const menuPortao = portaoAberto
      ? `<div class="portao-menu">
          <p class="meta">Para onde ir?</p>
          <button class="btn primario" data-acao="aba" data-valor="mercado">Mercado de gladiadores</button>
          <button class="btn" data-acao="aba" data-valor="arenas">Arenas</button>
        </div>`
      : '';
    const painel = painelLudus ? painelDaMelhoria(s, painelLudus as MelhoriaId) : '';
    return `<div class="ludus-wrap"><div class="ludus-cena ${ativa ? `compra compra-${ativa.id}` : ''}" style="--decorrido:${decorrido.toFixed(2)}s" role="img" aria-label="Ludus de ${esc(casa.nome)} no alto do morro">
      <img class="ludus-base" src="${LUDUS_IMG.base}" alt="" draggable="false">
      ${camadas}
      ${personagensLudus(s, ativa?.id ?? null)}
      ${tabuas}
      ${poeira}
      <button class="portao" data-acao="portao" style="${posicaoLudus(PORTAO_LUDUS)}" aria-label="Portão do ludus: escolher mercado ou arena"><span class="portao-rotulo">Portão</span></button>
      ${menuPortao}
      ${icones}
      <span class="rotulo-ludus">Ludus de ${esc(casa.nome)}</span>
      ${painel}
    </div></div>`;
  }

  /** Escritório do engenheiro: fundo estático, engenheiro respirando e brilho da lamparina. */
  function escritorio(): string {
    const pc = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;
    const e = ESCRITORIO.engenheiro;
    const l = ESCRITORIO.lamparina;
    return `<div class="forja escritorio" role="img" aria-label="Engenheiro romano examinando um projeto">
      <img class="forja-fundo" src="${ESCRITORIO.fundo}" alt="" draggable="false">
      <div class="forja-brilho" style="left:${pc(l.x - l.r, ESCRITORIO.w)};top:${pc(l.y - l.r, ESCRITORIO.h)};width:${pc(l.r * 2, ESCRITORIO.w)};aspect-ratio:1"></div>
      <img class="forja-ferreiro" src="${e.arquivo}" alt="" draggable="false" style="left:${pc(e.x, ESCRITORIO.w)};top:${pc(e.y, ESCRITORIO.h)};width:${pc(e.w, ESCRITORIO.w)};aspect-ratio:${e.w}/${e.h}">
    </div>`;
  }

  /** Menu Upgrades: onde se compram as seções do ludus. */
  function upgrades(s: Estado): string {
    const ordem: MelhoriaId[] = ['palus', 'armaria', 'alojamentos', 'refeitorio', 'enfermaria'];
    const cards = ordem
      .map((id) => {
        const m = melhoriaPorId(id);
        const feita = temMelhoria(s, id);
        const falta = m.custo - s.ouro;
        const acao = feita
          ? '<span class="construida-selo">Construído</span>'
          : `<button class="btn primario" data-acao="construir" data-valor="${id}" ${falta > 0 ? 'disabled' : ''}>Construir · ${m.custo} ouro</button>${falta > 0 ? `<p class="meta">Faltam ${falta} de ouro.</p>` : ''}`;
        return `<article class="card upgrade ${feita ? 'feito' : ''}">
          <h3>${esc(m.nome)}</h3>
          <p class="meta">${esc(m.efeito)}</p>
          ${acao}
        </article>`;
      })
      .join('');
    return `${escritorio()}<p class="meta">Cada upgrade transforma o ludus. Ao comprar, você volta à cena para ver a obra.</p><div class="grade">${cards}</div>`;
  }

  function ludus(s: Estado): string {
    const ordenados = [...s.gladiadores].sort((a, b) => Number(b.campeao) - Number(a.campeao));
    return `${cenaLudus(s)}
      <p class="meta">Gladiadores: ${s.gladiadores.length}/${capacidadeLudus(s)}</p>
      <div class="grade">${ordenados.map((g) => cardGladiador(s, g)).join('')}</div>`;
  }

  function cardMercado(s: Estado, g: Gladiador): string {
    const preco = precoRecruta(s, g);
    const cheio = s.gladiadores.length >= capacidadeLudus(s);
    const semOuro = s.ouro < preco;
    const casa = lanistaDaCasa(s);
    const cond = g.condicao ? `<p class="meta"><b>${NOME_CONDICAO[g.condicao]}</b>: ${esc(DESC_CONDICAO[g.condicao])}</p>` : '';
    return `<article class="card">
      <div class="thumb">${gladiadorImg(g)}</div>
      <h3>${esc(g.nome)} <small>Escravo</small></h3>
      <p class="meta">${esc(caracteristicas(g))}</p>
      ${cond}
      <p class="stats">${fmtStats(statsDoGladiador(g, casa.especialidade))}</p>
      <button class="btn primario" data-acao="recrutar" data-id="${g.id}" ${cheio || semOuro ? 'disabled' : ''}>
        Comprar · ${preco} ouro
      </button>
    </article>`;
  }

  function mercado(s: Estado): string {
    const lotado = s.gladiadores.length >= capacidadeLudus(s) && capacidadeLudus(s) < MAX_GLADIADORES
      ? `<p class="aviso">Ludus lotado (${s.gladiadores.length}/${capacidadeLudus(s)}). Construa os alojamentos para ampliar.</p>`
      : '';
    const m = MERCADO.mercador;
    const pc = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;
    const cena = `<div class="forja mercado" role="img" aria-label="Mercador de escravos aguardando compradores">
      <img class="forja-fundo" src="${MERCADO.fundo}" alt="" draggable="false">
      <img class="forja-ferreiro" src="${m.arquivo}" alt="" draggable="false" style="left:${pc(m.x, MERCADO.w)};top:${pc(m.y, MERCADO.h)};width:${pc(m.w, MERCADO.w)};aspect-ratio:${m.w}/${m.h}">
    </div>`;
    return `${cena}${lotado}<p class="meta">O mercado vende escravos e é renovado a cada turno. Cada um traz uma tendência de atributo, uma terra e uma condição física. Depois de comprado, você escolhe o estilo em que ele vai lutar e ele recebe o kit básico.</p>
      <div class="grade">${s.mercado.map((g) => cardMercado(s, g)).join('')}</div>`;
  }

  /** Cena da forja: fundo, brilho e fogo da fornalha e o ferreiro martelando uma lâmina (animação com faíscas). */
  function forja(): string {
    const pc = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;
    const cam = (c: { x: number; y: number; w: number; h: number; quadros?: number }): string =>
      `left:${pc(c.x, FORJA.w)};top:${pc(c.y, FORJA.h)};width:${pc(c.w, FORJA.w)};aspect-ratio:${c.w}/${c.h}`;
    const f = FORJA.fogo;
    const m = FORJA.ferreiro;
    return `<div class="forja" role="img" aria-label="Ferreiro forjando uma lâmina na bigorna">
      <img class="forja-fundo" src="${FORJA.fundo}" alt="" draggable="false">
      <div class="forja-brilho" style="left:${pc(f.x - 70, FORJA.w)};top:${pc(f.y - 60, FORJA.h)};width:${pc(f.w + 140, FORJA.w)};aspect-ratio:${f.w + 140}/${f.h + 120}"></div>
      <img class="forja-ferreiro" src="${f.arquivo}" alt="" draggable="false" style="${cam(f)}">
      <img class="forja-ferreiro" src="${m.arquivo}" alt="" draggable="false" style="${cam(m)}">
    </div>`;
  }

  /** Aba Enfermaria: cena do médico e lista dos feridos para tratar. */
  function enfermaria(s: Estado): string {
    if (!temMelhoria(s, 'enfermaria')) {
      return `<p class="aviso">Construa a enfermaria no menu Upgrades para tratar os feridos.</p>
        <button class="btn primario" data-acao="aba" data-valor="upgrades">Ir aos upgrades</button>`;
    }
    const pc = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;
    const E = ENFERMARIA;
    const m = E.medico;
    const lz = E.luzPorta;
    const t = E.tocha;
    const cena = `<div class="forja enfermaria" role="img" aria-label="Médico brutal do ludus aguardando os feridos">
      <img class="forja-fundo" src="${E.fundo}" alt="" draggable="false">
      <div class="luz-porta" style="left:${pc(lz.x, E.w)};top:${pc(lz.y, E.h)};width:${pc(lz.w, E.w)};aspect-ratio:${lz.w}/${lz.h}"></div>
      <div class="forja-brilho" style="left:${pc(t.x - t.r, E.w)};top:${pc(t.y - t.r, E.h)};width:${pc(t.r * 2, E.w)};aspect-ratio:1"></div>
      <img class="forja-ferreiro" src="${m.arquivo}" alt="" draggable="false" style="left:${pc(m.x, E.w)};top:${pc(m.y, E.h)};width:${pc(m.w, E.w)};aspect-ratio:${m.w}/${m.h}">
    </div>`;
    const feridos = s.gladiadores.filter((g) => g.vivo && g.efeitos.length);
    const lista = feridos.length
      ? feridos
          .map(
            (g) => `<article class="card">
          <h3>${esc(g.nome)}</h3>
          <div class="efeitos">${g.efeitos.map((ef) => `<span class="efeito">${NOME_EFEITO[ef.tipo]} ${ef.severidade}</span>`).join('')}</div>
          <button class="btn primario" data-acao="tratar" data-id="${g.id}" ${s.energia < 1 || s.ouro < custoTratamento(g) ? 'disabled' : ''}>Tratar · ${custoTratamento(g)} ouro · 1 energia</button>
        </article>`,
          )
          .join('')
      : '<p class="meta">Ninguém ferido agora. O médico aguarda, entediado.</p>';
    return `${cena}<p class="meta">Tratar um ferido remove os efeitos deixados pelo Poço.</p><div class="grade">${lista}</div>`;
  }

  function armeiro(s: Estado): string {
    if (!temMelhoria(s, 'armaria')) {
      return `<p class="aviso">Construa a armaria no ludus para usar o armeiro.</p>
        <button class="btn primario" data-acao="aba" data-valor="ludus">Ir ao ludus</button>`;
    }
    const contagem = new Map<string, number>();
    for (const id of s.inventario) contagem.set(id, (contagem.get(id) ?? 0) + 1);
    const guardados = [...contagem.entries()]
      .map(([id, qtd]) => {
        const item = itemPorId(id);
        return `<li class="inv-item">${iconeItem(item, 34)}<span style="color:${COR_QUALIDADE[item.qualidade]}">${esc(fmtItem(item))}</span> <span class="meta">×${qtd}</span></li>`;
      })
      .join('');

    if (!s.armeiroMestre) gerarArmeiroMestre(s);
    const mestre = (s.armeiroMestre ?? [])
      .map((id) => {
        const item = itemPorId(id);
        const serve = item.classes.map((c) => CLASSES[c].nome).join(', ');
        return `<article class="card item">
          <div class="thumb item-thumb">${iconeItem(item, 56)}</div>
          <h3 style="color:${COR_QUALIDADE[item.qualidade]}">${esc(item.nome)} <small>${QUALIDADES[item.qualidade]}</small></h3>
          <p class="meta">${NOME_SLOT[item.slot]} · Serve: ${esc(serve)}</p>
          <p class="stats">${esc(fmtBonus(item.bonus))}</p>
          <button class="btn primario" data-acao="comprar-mestre" data-valor="${item.id}" ${s.ouro < item.preco ? 'disabled' : ''}>
            Comprar · ${item.preco} ouro
          </button>
        </article>`;
      })
      .join('');
    return `${forja()}
      <h4 class="secao">Armeiro mestre</h4>
      <p class="meta">Cinco peças especiais, sorteadas a cada rodada (no máximo 3 Superiores, 2 Raras, 2 Épicas e 1 Lendária). Todo gladiador já recebe o kit básico ao escolher o estilo, então aqui só há peças melhores. Chances: <span style="color:${COR_QUALIDADE[1]}">Superior 60%</span> · <span style="color:${COR_QUALIDADE[2]}">Rara 25%</span> · <span style="color:${COR_QUALIDADE[3]}">Épica 11%</span> · <span style="color:${COR_QUALIDADE[4]}">Lendária 4%</span>.</p>
      <div class="grade">${mestre || '<p class="meta">Tudo vendido. Novas peças na próxima rodada.</p>'}</div>
      <h4 class="secao">No armeiro</h4>
      <ul class="registro">${guardados || '<li class="meta">Nenhum item guardado.</li>'}</ul>`;
  }

  /** Escalação: faixa de cards dos gladiadores vivos; o toque põe/tira da equipe, na ordem do toque. */
  function seletorEquipe(s: Estado, titulo: string, maximo: number): string {
    const vivos = s.gladiadores.filter((g) => g.vivo && !g.semEstilo);
    if (!vivos.length) return '<p class="aviso">Nenhum gladiador pronto para lutar: escolha o estilo dos escravos no ludus.</p>';
    const sel = equipeValida(s);
    const escolhidos = sel.length
      ? sel.map((g, i) => `<span class="escolhido"><b>${i + 1}</b> ${esc(g.nome)}</span>`).join('')
      : '<span class="meta">Toque nos gladiadores para escalar.</span>';
    const cartas = vivos
      .map((g) => {
        const pos = equipe.indexOf(g.id);
        const cheio = pos < 0 && equipe.length >= maximo;
        const titulo = cheio ? 'Equipe completa: tire alguém antes' : `${esc(g.nome)}: ${CLASSES[g.classe].nome}`;
        return `<button class="escala ${pos >= 0 ? 'marcado' : ''}" data-acao="escalar" data-id="${g.id}" ${cheio ? 'disabled' : ''} title="${titulo}">
          ${pos >= 0 ? `<span class="num">${pos + 1}</span>` : ''}
          <div class="thumb">${gladiadorImg(g)}</div>
          <strong>${esc(g.nome)}</strong>
          <small>${esc(CLASSES[g.classe].nome)}${g.lenda ? ' · Lenda' : ''}${g.campeao ? ' · Campeão' : ''}</small>
        </button>`;
      })
      .join('');
    return `<section class="escalacao">
      <header><strong>${esc(titulo)}</strong> <span class="meta">${sel.length}/${maximo}</span>
        <button class="btn" data-acao="limpar-escalacao" ${sel.length ? '' : 'disabled'}>Limpar</button></header>
      <div class="escolhidos">${escolhidos}</div>
      <div class="faixa">${cartas}</div>
    </section>`;
  }

  function arenas(s: Estado): string {
    const sel = equipeValida(s);
    const cards = ARENAS.map((a: Arena) => {
      const erros = sel
        .map((g) =>
          !a.honra && g.campeao ? `${g.nome} é o campeão e não entra no Poço.`
          : a.honra && g.pocoOnly ? `${g.nome} já lutou no Poço: fora das arenas de honra.`
          : '',
        )
        .filter(Boolean);
      const efeitos = a.efeitos
        ? `<div class="efeitos">${a.efeitos.map((ef) => `<span class="efeito">${NOME_EFEITO[ef]}</span>`).join('')}</div>`
        : '';
      const botoes = [1, 2]
        .map((modo) => {
          const motivo =
            sel.length === 0 ? `Escale ${modo} gladiador${modo > 1 ? 'es' : ''}.`
            : sel.length !== modo ? `Esta opção pede ${modo} gladiador${modo > 1 ? 'es' : ''}; você escalou ${sel.length}.`
            : erros[0] ?? (s.energia < modo ? `Energia insuficiente (precisa de ${modo}).` : '');
          return `<button class="btn ${modo === 1 ? 'primario' : ''}" data-acao="lutar" data-valor="${a.id}" data-modo="${modo}" ${motivo ? 'disabled' : ''}>Lutar ${modo}×${modo}${modo > 1 ? ' · 2 energia, ouro ×2' : ''}</button>`;
        })
        .join('');
      const status = sel.length === 0 ? 'Escale os gladiadores acima.' : erros[0] ?? '';
      return `<article class="card arena">
        <div class="arte"><img class="arte-img" src="${a.arte.replace('.png', '-mini.png')}" width="480" height="270" alt=""></div>
        <h3>${esc(a.nome)}</h3>
        <p class="meta">${a.honra ? `Plateia ${esc(a.plateia)}` : 'Plateia sorteada a cada luta'} · ${a.honra ? 'Arena de honra' : 'Poço: golpes causam efeitos persistentes'}</p>
        <p class="meta">Rendição: quem cai abaixo de 25% se rende.</p>
        ${efeitos}
        <p class="meta">Recompensa ${a.recompensaOuro[0] === a.recompensaOuro[1] ? `${a.recompensaOuro[0]} ouro + bônus da lotação (10%, 20% ou 30%)` : `${a.recompensaOuro[0]}–${a.recompensaOuro[1]} ouro`}</p>
        ${status ? `<p class="aviso">${esc(status)}</p>` : ''}
        <div class="botoes">${botoes}</div>
      </article>`;
    }).join('');
    return `${seletorEquipe(s, 'Escalação para a arena', 2)}<div class="grade">${cards}</div>`;
  }

  function campanha(s: Estado): string {
    const d = proximoDesafio(s);
    if (!d) {
      return `<article class="card desafio"><h3>Campanha concluída</h3>
        <p class="meta">Você venceu todos os lanistas da fila.</p></article>`;
    }
    const formato = d.passo.formato ?? 1;
    const sel = equipeValida(s);
    const escolha = d.opcoes
      .map((l) => {
        const rivalCampeao = s.campeoesRivais[l.id];
        const marcado = d.lanista?.id === l.id;
        return `<button class="card lanista-opcao ${marcado ? 'escolhido' : ''}" data-acao="escolher-lanista" data-id="${l.id}">
          <div class="thumb">${gladiadorImg(rivalCampeao)}</div>
          <h3>${esc(l.nome)}</h3>
          <p class="meta">Escola de ${esc(CLASSES[l.especialidade].nome)}</p>
          <p class="meta">${marcado ? 'Desafio aceito' : 'Toque para enfrentar'}</p>
        </button>`;
      })
      .join('');
    const opcoesHtml = `<section class="escolha-lanista">
      <h3>Escolha quem enfrentar</h3>
      <div class="grade">${escolha}</div>
    </section>`;
    if (!d.lanista) {
      return `${opcoesHtml}<p class="aviso">Escolha um lanista para ver o desafio.</p>`;
    }
    const rival = s.campeoesRivais[d.lanista.id];
    const pronto = d.pronto && sel.length === formato && s.energia >= formato;
    const status = sel.length !== formato ? `Escale ${formato} gladiador${formato > 1 ? 'es' : ''}.`
      : s.energia < formato ? `Energia insuficiente (precisa de ${formato}).`
      : '';
    return `${opcoesHtml}${seletorEquipe(s, `Escalação (${formato} contra ${formato})`, formato)}
      <article class="card desafio ${d.passo.regra.letal ? 'nemesis' : ''}">
        <div class="linha">
          <div class="thumb">${gladiadorImg(rival)}</div>
          <div>
            <h3>${esc(d.passo.titulo)} <small>${formato}×${formato}</small></h3>
            <p class="meta">Rival: ${esc(d.lanista.nome)} · ${esc(CLASSES[d.lanista.especialidade].nome)}${formato > 1 ? ' e um companheiro' : ''}</p>
            <p class="passiva"><strong>${esc(d.passo.regra.nome)}:</strong> ${esc(d.passo.regra.descricao)}</p>
            <p class="aviso">Até a morte: nesta luta ninguém se rende.</p>
          </div>
        </div>
        <ul class="requisitos">${d.requisitos
          .map((r) => `<li class="${r.ok ? 'ok' : 'falta'}">${r.ok ? '✓' : '•'} ${esc(r.texto)}</li>`)
          .join('')}</ul>
        <p class="meta">Passo ${d.indice + 1} de ${PASSOS.length}</p>
        ${status ? `<p class="aviso">${esc(status)}</p>` : ''}
        <button class="btn grande primario" data-acao="campanha" ${pronto ? '' : 'disabled'}>Enfrentar</button>
      </article>`;
  }

  function configuracoes(s: Estado): string {
    const p = audio.prefs();
    const lendas = s.gladiadores.filter((g) => g.lenda).length;
    return `<h4 class="secao">Gladiadores</h4>
      <div class="linha">
        <label class="campo">Vira lenda com
          <input type="number" min="1" max="30" value="${s.config.vitoriasLenda}" data-campo="lenda"> vitórias</label>
        <p class="meta">Liberdade: ${limiarLiberdade(s.config)} vitórias (3× a lenda)</p>
        <button class="btn primario" data-acao="salvar-config">Salvar</button>
      </div>
      <p class="meta">Só uma lenda viva por ludus. Lenda: +1 em todos os atributos, nunca vendida nem dispensada; só deixa o ludus pela liberdade. Liberdade: automática ao chegar ao limite. O campeão não é libertado. Só escravos são vendidos.</p>
      <p class="meta">Libertos nesta partida: ${s.libertados.length} · Lendas no ludus: ${lendas}</p>
      <h4 class="secao">Som</h4>
      <div class="linha">
        <label class="campo"><span><input type="checkbox" data-audio="ativo" ${p.ativo ? 'checked' : ''}> Som ligado</span></label>
        <label class="campo">Música
          <input type="range" min="0" max="1" step="0.05" value="${p.musica}" data-audio="musica"></label>
        <label class="campo">Efeitos
          <input type="range" min="0" max="1" step="0.05" value="${p.efeitos}" data-audio="efeitos"></label>
      </div>`;
  }

  function registro(s: Estado): string {
    return `<ul class="registro">${s.log.slice(0, 8).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
  }

  function menu(): string {
    audio.tocarTrilha('menu');
    const salvo = carregar();
    return `<section class="menu"><div class="moldura">
      ${EMBLEMA}
      <h1>Ferrum et Sanguis</h1>
      <p class="sub">Um ludus, uma casa, a areia do Coliseu.</p>
      <div class="bloco">
        ${salvo ? '<button class="btn grande primario" data-acao="continuar">Continuar</button>' : ''}
        <button class="btn grande ${salvo ? '' : 'primario'}" data-acao="novo">Novo ludus</button>
      </div>
    </div></section>`;
  }

  /** Tela de escolha do lanista (nome, história, especialidade e bônus) ao começar um novo ludus. */
  function selecaoLanista(): string {
    const sel = LANISTAS.find((l) => l.id === lanistaSel) ?? null;
    const posicoes = LANISTAS.map((l, i) => {
      const sp = SPRITES_LANISTA[l.id];
      const largura = ((sp.w * 0.98) / 1376) * 100;
      const centro = 8 + (84 / (LANISTAS.length - 1)) * i;
      const ativo = sel?.id === l.id;
      return `<button class="lanista-sel ${ativo ? 'ativo' : sel ? 'apagado' : ''}" data-acao="marcar-lanista" data-id="${l.id}" aria-label="${esc(l.nome)}" aria-pressed="${ativo}"
        style="left:${(centro - largura / 2).toFixed(2)}%;width:${largura.toFixed(2)}%;z-index:${ativo ? 20 : 10 - Math.abs(i - 5)}">
        <img src="${sp.arquivo}" alt="" draggable="false"></button>`;
    }).join('');
    const info = sel
      ? `<h2>${esc(sel.nome)}</h2>
         <p class="sel-titulo">${esc(sel.titulo ?? '')}</p>
         <p class="sel-historia">${esc(sel.historia ?? '')}</p>
         <p class="sel-esp">${esc(sel.especializacao ?? CLASSES[sel.especialidade].nome)}</p>
         <p class="sel-bonus"><strong>${esc(sel.bonus?.nome ?? '')}:</strong> ${esc(sel.bonus?.descricao ?? '')}</p>`
      : '<h2>Escolha seu lanista</h2><p class="sel-historia">Cada lanista tem uma história, uma especialidade e um bônus que moldam o seu ludus. Toque em um deles.</p>';
    return `<section class="selecao-lanistas">
      <div class="sel-palco" style="background-image:url('${FUNDO_LANISTAS}')">
        <div class="sel-info">${info}</div>
        ${posicoes}
      </div>
      <div class="sel-info sel-info-m">${info}</div>
      <div class="sel-acoes">
        <button class="btn" data-acao="voltar-menu">Voltar</button>
        <button class="btn grande primario" data-acao="confirmar-lanista" ${sel ? '' : 'disabled'}>${sel ? `Assumir o ludus de ${esc(sel.nome)}` : 'Escolha um lanista'}</button>
      </div>
    </section>`;
  }

  function render(): void {
    if (escolhendo) {
      audio.tocarTrilha('menu');
      raiz.innerHTML = selecaoLanista();
      return;
    }
    if (!e || menuAberto) {
      raiz.innerHTML = menu();
      return;
    }
    const s = e;
    if (gameOver(s)) {
      audio.tocarTrilha('menu');
      raiz.innerHTML = `<section class="menu"><div class="moldura">
        ${EMBLEMA}
        <h1>Fim de jogo</h1>
        <p class="sub">O ludus de ${esc(lanistaDaCasa(s).nome)} ficou sem gladiadores e sem ouro para recrutar outro.</p>
        <p class="meta">${s.vitoriasTotais} vitórias em ${s.turno} turnos.</p>
        <div class="bloco"><button class="btn grande primario" data-acao="novo">Novo ludus</button></div>
      </div></section>`;
      return;
    }
    const casa = lanistaDaCasa(s);
    const topo = `<header class="topo">
      <strong>${esc(casa.nome)}</strong>
      <span>Ouro ${s.ouro}</span>
      <span>Energia ${s.energia}</span>
      <span>Turno ${s.turno}</span>
      <span>Vitórias ${s.vitoriasTotais}</span>
      <button class="btn ${podeGastarEnergia(s) ? 'pendente' : ''}" data-acao="turno" title="${podeGastarEnergia(s) ? 'Gaste toda a energia antes' : ''}">Próximo turno</button>
      <button class="btn" data-acao="menu">Menu</button>
    </header>`;
    const abas = `<nav class="abas">${ABAS.map(
      ([id, nome]) => `<button class="btn ${aba === id ? 'ativa' : ''}" data-acao="aba" data-valor="${id}">${nome}</button>`,
    ).join('')}</nav>`;
    audio.tocarTrilha('gestao');
    const conteudo =
      aba === 'config' ? configuracoes(s)
      : aba === 'ludus' ? ludus(s)
      : aba === 'upgrades' ? upgrades(s)
      : aba === 'mercado' ? mercado(s)
      : aba === 'armeiro' ? armeiro(s)
      : aba === 'enfermaria' ? enfermaria(s)
      : aba === 'arenas' ? arenas(s)
      : campanha(s);
    const avisoHtml = aviso ? `<p class="aviso">${esc(aviso)}</p>` : '';
    raiz.innerHTML = `${topo}${abas}${avisoHtml}${conteudo}<section class="rodape">${registro(s)}</section>`;
  }

  /** Executa uma ação de gestão, salva e redesenha. Erros de regra viram aviso. */
  function agir(fn: (s: Estado) => void, som?: Efeito): void {
    if (!e) return;
    aviso = '';
    try {
      fn(e);
      salvar(e);
      if (som) audio.tocarEfeito(som);
    } catch (err) {
      aviso = err instanceof Error ? err.message : 'Ação indisponível.';
      audio.tocarEfeito('erro');
    }
    render();
  }

  /** Máximo de gladiadores da escalação atual: 2 nas arenas, o formato do passo na campanha. */
  function maximoEscalacao(): number {
    if (e && aba === 'campanha') return proximoDesafio(e)?.passo.formato ?? 1;
    return 2;
  }

  function alternarEscala(id: string): void {
    if (equipe.includes(id)) equipe = equipe.filter((x) => x !== id);
    else if (equipe.length < maximoEscalacao()) equipe = [...equipe, id];
    render();
  }

  function lutarNaArena(arenaId: string, modo: number): void {
    if (!e) return;
    const ids = equipeValida(e).map((g) => g.id);
    if (ids.length !== modo) {
      aviso = `Escolha ${modo} gladiador${modo > 1 ? 'es' : ''}.`;
      render();
      return;
    }
    try {
      const antes = structuredClone(e);
      const payload = lutarArena(e, ids, arenaId);
      aviso = '';
      salvar(e);
      opcoes.iniciarArena(payload, render, () => {
        if (!e) return;
        e = desistirDaLuta(antes, e, ids);
        salvar(e);
      });
    } catch (err) {
      aviso = err instanceof Error ? err.message : 'Luta indisponível.';
      render();
    }
  }

  function lutarNaCampanha(): void {
    if (!e) return;
    const ids = equipeValida(e).map((g) => g.id);
    try {
      const antes = structuredClone(e);
      const payload = lutarCampanha(e, ids);
      aviso = '';
      salvar(e);
      opcoes.iniciarArena(payload, render, () => {
        if (!e) return;
        e = desistirDaLuta(antes, e, ids);
        salvar(e);
      });
    } catch (err) {
      aviso = err instanceof Error ? err.message : 'Luta indisponível.';
      render();
    }
  }

  function executar(acao: string, id: string, valor: string, campo: (c: string) => string): void {
    switch (acao) {
      case 'continuar':
        e = carregar();
        menuAberto = false;
        aviso = '';
        render();
        return;
      case 'novo':
        escolhendo = true;
        lanistaSel = null;
        render();
        return;
      case 'marcar-lanista':
        lanistaSel = id;
        render();
        return;
      case 'voltar-menu':
        escolhendo = false;
        render();
        return;
      case 'confirmar-lanista':
        if (!lanistaSel) return;
        escolhendo = false;
        e = novoJogo(undefined, lanistaSel);
        menuAberto = false;
        aba = 'ludus';
        equipe = [];
        aviso = '';
        salvar(e);
        render();
        return;
      case 'menu':
        menuAberto = true;
        render();
        return;
      case 'aba':
        aba = valor as Aba;
        aviso = '';
        render();
        return;
      case 'turno':
        agir((s) => avancarTurno(s));
        return;
      case 'treinar':
        agir((s) => treinar(s, id, campo('atributo') as Atributo));
        return;
      case 'estilo':
        agir((s) => escolherEstilo(s, id, campo('estilo') as ClasseId));
        return;
      case 'trocar':
        agir((s) => trocarClasse(s, id, campo('classe') as ClasseId));
        return;
      case 'tratar':
        agir((s) => tratar(s, id), 'moeda');
        return;
      case 'construir': {
        if (!e) return;
        const id = valor as MelhoriaId;
        aviso = '';
        try {
          construirMelhoria(e, id);
          salvar(e);
          aba = 'ludus';
          painelLudus = null;
          portaoAberto = false;
          animCompra = { id, t0: Date.now() };
          audio.tocarEfeito(id === 'armaria' ? 'parede' : COM_TABUAS.includes(id) ? 'madeira' : 'moeda');
          window.setTimeout(() => {
            if (animCompra?.id === id) animCompra = null;
          }, DURACAO_COMPRA * 1000 + 300);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          aviso = err instanceof Error ? err.message : 'Ação indisponível.';
          audio.tocarEfeito('erro');
        }
        render();
        return;
      }
      case 'recrutar':
        agir((s) => recrutar(s, id), 'recrutar');
        return;
      case 'comprar-mestre':
        agir((s) => comprarMestre(s, valor), 'moeda');
        return;
      case 'comprar':
        agir((s) => comprarItem(s, valor), 'moeda');
        return;
      case 'vender':
        agir((s) => venderGladiador(s, id), 'moeda');
        return;
      case 'dispensar':
        agir((s) => dispensarGladiador(s, id));
        return;
      case 'salvar-config': {
        const lenda = raiz.querySelector<HTMLInputElement>('input[data-campo="lenda"]');
        agir((s) => {
          definirConfig(s, { vitoriasLenda: Number(lenda?.value) });
          aviso = 'Configurações salvas.';
        });
        return;
      }
    }
  }

  raiz.addEventListener('click', (ev) => {
    const alvo = (ev.target as HTMLElement).closest<HTMLElement>('[data-acao]');
    if (!alvo || alvo.hasAttribute('disabled')) return;
    audio.desbloquear();
    audio.tocarEfeito('clique');
    const card = alvo.closest('.card');
    const campo = (c: string): string =>
      card?.querySelector<HTMLSelectElement>(`select[data-campo="${c}"]`)?.value ?? '';
    if (alvo.dataset.acao === 'escalar') return alternarEscala(alvo.dataset.id ?? '');
    if (alvo.dataset.acao === 'portao') {
      portaoAberto = !portaoAberto;
      painelLudus = null;
      return render();
    }
    if (alvo.dataset.acao === 'painel-ludus') {
      const v = alvo.dataset.valor ?? null;
      painelLudus = painelLudus === v ? null : v;
      return render();
    }
    if (alvo.dataset.acao === 'aba') {
      portaoAberto = false;
      painelLudus = null;
    }
    if (alvo.dataset.acao === 'escolher-lanista') {
      const id = alvo.dataset.id ?? '';
      return agir((st) => escolherLanista(st, id));
    }
    if (alvo.dataset.acao === 'limpar-escalacao') {
      equipe = [];
      return render();
    }
    if (alvo.dataset.acao === 'lutar') return lutarNaArena(alvo.dataset.valor ?? '', Number(alvo.dataset.modo ?? 1));
    if (alvo.dataset.acao === 'campanha') return lutarNaCampanha();
    executar(alvo.dataset.acao ?? '', alvo.dataset.id ?? '', alvo.dataset.valor ?? '', campo);
  });

  raiz.addEventListener('change', (ev) => {
    const alvo = ev.target as HTMLInputElement | HTMLSelectElement;
    if (alvo.dataset.audio) {
      const chave = alvo.dataset.audio;
      if (chave === 'ativo') audio.definirPrefs({ ativo: (alvo as HTMLInputElement).checked });
      else if (chave === 'musica') audio.definirPrefs({ musica: Number(alvo.value) });
      else audio.definirPrefs({ efeitos: Number(alvo.value) });
      return;
    }
    if (alvo.dataset.acao === 'equipar' && e) {
      const id = alvo.dataset.id ?? '';
      const slot = alvo.dataset.slot as Slot;
      const itemId = alvo.value || null;
      agir((s) => equipar(s, id, slot, itemId));
    }
  });

  // Mantém os blocos de equipamento abertos entre redesenhos.
  raiz.addEventListener(
    'toggle',
    (ev) => {
      const det = ev.target as HTMLDetailsElement;
      const chave = det.dataset.chave;
      if (!chave) return;
      if (det.open) abertos.add(chave);
      else abertos.delete(chave);
    },
    true,
  );

  render();
}
