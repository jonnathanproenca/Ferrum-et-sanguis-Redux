# Ferrum et Sanguis

Jogo de navegador de gestão de ludus, inspirado em Dominus Gladiatus. Combate automático, progressão por atributos e arenas com plateia.

## Stack

- Vite + TypeScript + Phaser 3
- Motor de combate puro (sem Phaser), com RNG com semente e testes com Vitest
- Build estático publicado no GitHub Pages via GitHub Actions

## Comandos

```bash
npm install
npm run dev     # servidor local
npm test        # testes do motor de combate
npm run build   # gera dist/
```

## Publicação (GitHub Pages)

1. Criar o repositório no GitHub e enviar o código para a branch `main`.
2. Em **Settings > Pages**, definir **Source** como **GitHub Actions**.
3. A cada push na `main`, o workflow `.github/workflows/deploy.yml` testa, gera o build e publica.

## Estrutura

```
src/core      combate, RNG, economia, save (lógica pura)
src/data      classes.json, arenas.json (balanceamento sem mexer em código)
src/scenes    cenas Phaser (arena, ludus, mercado, campanha)
tests         testes do motor
public/assets sprites, plateia, cenários, áudio
```

## MVP

- Classes: Murmilo, Retiário, Trácio, Samnita
- Arenas: Coliseu, Anfiteatro de Cápua, Arena de Pompeia, Poço
