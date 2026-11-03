import { MELHORIAS_LUDUS, type Estado } from './game';

const CHAVE = 'ferrum-et-sanguis:v4';

/** Salva no navegador. Se o armazenamento estiver bloqueado, o jogo segue sem salvar. */
export function salvar(e: Estado): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    /* armazenamento indisponível: nada a fazer */
  }
}

export function carregar(): Estado | null {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return null;
    const e = JSON.parse(raw) as Estado;
    if (e.versao !== 4) return null;
    // Saves anteriores às melhorias do ludus: quem já jogava mantém tudo liberado.
    if (!e.melhorias) e.melhorias = Object.fromEntries(MELHORIAS_LUDUS.map((m) => [m.id, true]));
    return e;
  } catch {
    return null;
  }
}
