# dellacarmo.github.io

Site institucional e portfólio da organização Dellacarmo. Feito com Vite, sem framework.

## Rodar localmente

```bash
npm install
npm run dev
```

## Gerar o build

```bash
npm run build
```

O resultado vai para `dist/`, com caminhos relativos (`base: './'`), então funciona tanto em
`https://dellacarmo.github.io/` quanto em qualquer repositório publicado como `/nome-do-repo/`.

## Publicar no GitHub Pages

1. Envie o projeto para o repositório `Dellacarmo/dellacarmo.github.io`, no branch `main`.
2. No GitHub, abra **Settings → Pages** e, em **Build and deployment**, escolha **GitHub Actions**.
3. Cada push na `main` roda `.github/workflows/deploy.yml`, que gera o build e publica a pasta `dist/`.

## Onde mexer

- `index.html`: todo o conteúdo (textos, links, equipe).
- `src/style.css`: cores, tipografia e layout. A lógica de cor: amarelo = Felipe (della), azul = Enzo (carmo), verde = o que é dos dois.
- `src/main.js`: o grafo do merge no topo, a fusão de nomes, a sanfona do processo e as entradas.
- `src/img/`: as fotos da equipe e a foto de código. Todas são da própria Dellacarmo.
