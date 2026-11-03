import { CAPACIDADE_BASE, MAX_GLADIADORES, lanistaDaCasa, regrasDe, type Estado } from '../core/game';

/** Tópicos do tutorial. Os de upgrade só abrem depois que a seção é construída. */
/** Cada página pode levar o jogador a uma aba: o tour passa pelas telas enquanto explica. */
export interface Pagina {
  titulo: string;
  texto: string;
  aba?: string;
}

export interface Topico {
  id: string;
  titulo: string;
  /** Aba em que o tópico abre na primeira visita (ausente = só por evento). */
  aba?: string;
  /** Melhoria que precisa estar construída para o tópico aparecer. */
  requer?: 'palus' | 'armaria' | 'enfermaria' | 'alojamentos' | 'refeitorio';
  paginas: (s: Estado) => Pagina[];
}

function progressao(s: Estado): string {
  const r = regrasDe(s);
  const campeao = r.campeao === 0 ? 'Seu primeiro gladiador já começa como campeão.' : `O primeiro gladiador a chegar a ${r.campeao} vitórias vira o campeão.`;
  const liberdade = r.liberdade === null ? 'Nesta dificuldade a lenda nunca é libertada.' : `Depois de ${r.liberdade} lutas como lenda, ele conquista a liberdade e deixa o ludus.`;
  return `${campeao} O campeão ganha +2 em todos os atributos e rende patrocínio por turno, mas não entra no Poço nem é vendido. Com ${r.lenda} vitórias um gladiador vira lenda (+1 em tudo; só uma lenda viva por vez). ${liberdade}`;
}

const comAba = (aba: string, paginas: Pagina[]): Pagina[] => paginas.map((p) => ({ ...p, aba }));

/** Tour inicial: ludus → upgrades → mercado → arenas → volta ao ludus. */
function tour(s: Estado): Pagina[] {
  return [
    ...comAba('ludus', [
      { titulo: `Bem-vindo, lanista de ${lanistaDaCasa(s).nome}`, texto: 'Esta é a tela do ludus: aqui ficam os seus gladiadores. Toque num card para ver atributos, equipamento e ações. Na barra de cima estão ouro, energia, turno e vitórias. As abas levam às outras partes do ludus.' },
      { titulo: 'Energia e turnos', texto: 'Cada rodada dá 3 de energia. Lutar, treinar, tratar feridos e trocar de estilo gastam energia. Quando ela acabar, toque em Próximo turno: o ludus paga a manutenção (10 de ouro + 5 por gladiador vivo) e o campeão rende patrocínio (20 + 5 por vitória dele). O mercado se renova a cada turno.' },
      { titulo: 'Campeão, lenda e liberdade', texto: progressao(s) },
    ]),
    ...comAba('upgrades', [
      { titulo: 'Upgrades: construa seu ludus', texto: 'Cada upgrade constrói uma seção nova e libera uma mecânica: palus (treino), armaria (equipamentos), enfermaria (tratar feridos), alojamentos (mais gladiadores) e refeitório (manutenção menor). Compre com ouro; quando a obra termina, o tutorial da seção aparece.' },
      { titulo: 'Por onde começar', texto: 'Palus e armaria deixam seus gladiadores mais fortes, e os alojamentos abrem espaço para mais lutadores. Compre o que a sua estratégia pede primeiro.' },
    ]),
    ...comAba('mercado', [
      { titulo: 'Mercado: só escravos', texto: 'O mercado vende 5 escravos novos a cada turno. Eles chegam sem estilo e sem equipamento. Cada um tem uma terra de origem, uma tendência de atributo e uma condição física que muda o preço: jovem é mais caro, cicatrizado mais barato.' },
      { titulo: 'Escolha o estilo', texto: 'Depois de comprar, escolha o estilo dele: Murmilo, Retiário, Trácio ou Samnita. É grátis, não gasta energia e já entrega o kit básico do estilo. Escravo sem estilo não luta, só treina. Trocar de estilo mais tarde custa ouro e energia.' },
      { titulo: 'Espaço no ludus', texto: `O ludus comporta ${CAPACIDADE_BASE} gladiadores. Com os alojamentos, o limite sobe para ${MAX_GLADIADORES}. Escravos que não servem podem ser vendidos pela metade do preço.` },
    ]),
    ...comAba('arenas', [
      { titulo: 'Arenas: escalar e lutar', texto: 'Toque nos gladiadores para escalar 1 ou 2 e escolha a arena. Cada gladiador gasta 1 de energia; no 2×2 a recompensa em ouro dobra. Quem cai abaixo de 25% de vida se rende, então a luta termina antes da morte.' },
      { titulo: 'Fama e dificuldade', texto: 'Você começa em Pompeia. Cápua abre com 8 batalhas disputadas e o Coliseu com 24, vencendo ou não. Quanto melhor a arena, mais forte o rival e maior a recompensa.' },
      { titulo: 'O Poço', texto: 'No Poço os golpes deixam efeitos persistentes (sangramento, veneno, contusão, queimadura), que enfraquecem o gladiador até serem tratados. Quem luta no Poço não volta às arenas de honra, e o campeão não entra.' },
      { titulo: 'Durante a luta', texto: 'Pular luta mostra o resultado na hora, com 10% a menos de ouro. Desistir conta como derrota, sem recompensa, e a energia gasta não volta.' },
    ]),
    ...comAba('ludus', [
      { titulo: 'Primeiro passo', texto: 'De volta ao ludus. Vá ao Mercado, compre escravos, escolha o estilo deles e mande-os para Pompeia. Ouro e fama abrem o resto. Boa sorte, lanista!' },
    ]),
  ];
}

export const TOPICOS: Topico[] = [
  { id: 'tour', titulo: 'Tutorial', paginas: tour },
  {
    id: 'campanha',
    titulo: 'Campanha',
    aba: 'campanha',
    paginas: () => [
      { titulo: 'Os lanistas rivais', texto: 'A campanha tem 9 passos. Em cada um você escolhe, entre três lanistas, qual enfrentar. Cada passo tem uma regra própria e requisitos, como vitórias na arena ou um gladiador equipado.' },
      { titulo: 'Até a morte', texto: 'Nas lutas da campanha ninguém se rende: vai até a morte. Alguns passos são 2×2. Prepare seu time antes de entrar na arena.' },
    ],
  },
  {
    id: 'treino',
    titulo: 'Palus: treinamento',
    requer: 'palus',
    paginas: () => [
      { titulo: 'Treinar gladiadores', texto: 'Com o palus pronto, cada card de gladiador ganha botões de treino. Treinar custa 1 de energia e 20 de ouro, soma +1 no atributo escolhido (máximo 10 por atributo) e dá experiência. Escravos recém-comprados treinam mesmo sem estilo.' },
    ],
  },
  {
    id: 'armeiro',
    titulo: 'Armaria e armeiro',
    requer: 'armaria',
    paginas: () => [
      { titulo: 'Peças especiais', texto: 'O armeiro mestre oferece 5 peças por rodada, todas melhores que as básicas. As chances de qualidade: Superior 60%, Rara 25%, Épica 11% e Lendária 4%. Cada rodada tem no máximo 3 verdes, 2 azuis, 2 roxas e 1 laranja.' },
      { titulo: 'Equipar', texto: 'Comprada a peça, ela vai para o armeiro. Abra o card do gladiador e escolha a peça em cada espaço: arma, elmo, peito, acessório, perna e pé. Cada peça serve a certos estilos. As básicas já vêm com o estilo.' },
    ],
  },
  {
    id: 'enfermaria',
    titulo: 'Enfermaria',
    requer: 'enfermaria',
    paginas: () => [
      { titulo: 'Tratar os feridos', texto: 'O médico trata os efeitos persistentes que o Poço deixa. Tratar custa 1 de energia e 30 de ouro por ponto de severidade, e remove todos os efeitos do gladiador. Sem tratamento, os efeitos continuam reduzindo os atributos.' },
    ],
  },
  {
    id: 'alojamentos',
    titulo: 'Alojamentos',
    requer: 'alojamentos',
    paginas: () => [{ titulo: 'Mais espaço', texto: `O ludus passa a comportar ${MAX_GLADIADORES} gladiadores, em vez de ${CAPACIDADE_BASE}. Lembre que cada gladiador vivo aumenta a manutenção por turno.` }],
  },
  {
    id: 'refeitorio',
    titulo: 'Refeitório',
    requer: 'refeitorio',
    paginas: () => [{ titulo: 'Manutenção menor', texto: 'A manutenção por gladiador cai de 5 para 3 de ouro por turno. Quanto mais gladiadores, mais o refeitório economiza.' }],
  },
];

export const TODOS_OS_TOPICOS = TOPICOS.map((t) => t.id);

export function topicoPorId(id: string): Topico | undefined {
  return TOPICOS.find((t) => t.id === id);
}
