// Ícones dos itens do armeiro: PNGs de public/assets/itens com moldura na cor da qualidade.
import { COR_QUALIDADE, separarId, type Item } from '../core/model';

/** Itens básicos reusam o ícone mais simples do mesmo tipo, conforme a classe. */
function idBasico(slot: string, classe: string): string {
  const meio = classe === 'murmilo' || classe === 'samnita';
  switch (slot) {
    case 'arma': return classe === 'retiario' ? 'tridente' : classe === 'tracio' ? 'sica' : 'gladio';
    case 'acessorio': return classe === 'retiario' ? 'rede' : classe === 'tracio' ? 'escudo_redondo_pequeno' : classe === 'samnita' ? 'escudo_oval' : 'escudo_quadrado';
    case 'elmo': return classe === 'murmilo' ? 'elmo_murmilo' : classe === 'retiario' ? 'galero' : classe === 'tracio' ? 'capacete_frigio' : 'elmo_viseira';
    case 'peito': return 'peito_leve';
    case 'pe': return meio ? 'bota_legionaria' : 'sandalia';
    default: return meio ? 'perneira_couro' : 'faixa_coxa';
  }
}

/** Ícone do item (HTML), com moldura na cor da sua qualidade. `tam` em pixels. */
export function iconeItem(item: Item, tam = 44): string {
  const arquivo = item.basico ? idBasico(item.slot, item.classes[0]) : separarId(item.id).base;
  return `<span class="icone-item" style="--q:${COR_QUALIDADE[item.qualidade]};width:${tam}px;height:${tam}px"><img src="assets/itens/${arquivo}.png" alt="${item.nome}" draggable="false"></span>`;
}
