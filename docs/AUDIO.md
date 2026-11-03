# Áudio

Soltar o arquivo em `public/assets/audio/` basta: o jogo lista a pasta sozinho (`audio-manifest.json`). Sem arquivo, toca o som sintetizado. mp3, ogg, wav, m4a ou webm.

| Pasta / nome | Quando toca | Observação |
|---|---|---|
| `musica/menu` | Menu e seleção de lanista | loop |
| `musica/gestao` | Ludus e abas sem música própria | loop |
| `musica/upgrades`, `mercado`, `armeiro`, `enfermaria` | Cada aba | opcional; sem ela usa `gestao` |
| `musica/pompeia`, `capua`, `poco`, `coliseu` | Arenas (pública crescente) | loop |
| `musica/campanha` | Batalhas de lanista | loop; sem ela usa `coliseu` |
| `sfx/<efeito>` | clique, golpe, critico, esquiva, bloqueio, morte, efeito, atordoado, moeda, madeira, parede, recrutar, vitoria, derrota, lenda, liberdade, erro | variantes: `sfx/golpe-1`, `golpe-2`... sorteadas |
| `cena/bigorna` | Armeiro, a cada pancada (2,688 s; impacto em 1,05 s do vídeo) | uma pancada só, ataque no começo do arquivo; aceita variantes |
| `ambiente/fogo` | Armeiro | loop, volume baixo |
| `ambiente/mercado` | Mercado | loop de multidão |
| `voz/engenheiro`, `voz/medico`, `voz/mercador` | Murmúrio a cada 4-9 s | arquivos curtos (1-2 s), variantes `-1`, `-2`... |

Os volumes da cena (fogo 0,3; mercado 0,7) estão em `CENAS` em `src/audio/audio.ts`. Os arquivos de loop devem emendar sem silêncio no começo e no fim.
