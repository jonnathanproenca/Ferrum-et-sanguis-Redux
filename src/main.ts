import Phaser from 'phaser';
import { ArenaScene } from './scenes/ArenaScene';
import { montarUi } from './ui/ui';
import { audio } from './audio/audio';

const containerJogo = document.getElementById('game') as HTMLElement;
const raizUi = document.getElementById('ui') as HTMLElement;

const jogo = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#120c0a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ArenaScene],
});

montarUi(raizUi, {
  iniciarArena(payload, onFim, onDesistir, onPular) {
    raizUi.hidden = true;
    audio.tocarTrilha(payload.trilha);
    containerJogo.classList.add('ativo');
    jogo.scale.refresh();
    jogo.scene.start('arena', {
      ...payload,
      onDesistir,
      onPular,
      onFim: () => {
        containerJogo.classList.remove('ativo');
        raizUi.hidden = false;
        audio.tocarTrilha('gestao');
        onFim();
      },
    });
  },
});
