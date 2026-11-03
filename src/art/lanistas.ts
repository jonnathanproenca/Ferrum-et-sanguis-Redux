// Sprites dos lanistas (corpo inteiro, 12 da folha de arte). w/h em pixels do arquivo.
// batiatus e espartaco ficam guardados para a campanha.
export interface SpriteLanista { arquivo: string; w: number; h: number }

export const SPRITES_LANISTA: Record<string, SpriteLanista> = {
  'lanista-1': { arquivo: 'assets/lanistas/lanista-1.png', w: 134, h: 283 },
  'lanista-2': { arquivo: 'assets/lanistas/lanista-2.png', w: 120, h: 286 },
  'lanista-3': { arquivo: 'assets/lanistas/lanista-3.png', w: 145, h: 289 },
  'lanista-4': { arquivo: 'assets/lanistas/lanista-4.png', w: 122, h: 283 },
  'lanista-5': { arquivo: 'assets/lanistas/lanista-5.png', w: 151, h: 286 },
  'lanista-6': { arquivo: 'assets/lanistas/lanista-6.png', w: 134, h: 288 },
  'lanista-7': { arquivo: 'assets/lanistas/lanista-7.png', w: 158, h: 273 },
  'lanista-8': { arquivo: 'assets/lanistas/lanista-8.png', w: 145, h: 282 },
  'lanista-9': { arquivo: 'assets/lanistas/lanista-9.png', w: 158, h: 294 },
  'lanista-10': { arquivo: 'assets/lanistas/lanista-10.png', w: 137, h: 290 },
  'batiatus': { arquivo: 'assets/lanistas/batiatus.png', w: 133, h: 282 },
  'espartaco': { arquivo: 'assets/lanistas/espartaco.png', w: 186, h: 292 },
};

export const FUNDO_LANISTAS = 'assets/lanistas/fundo.jpg';
