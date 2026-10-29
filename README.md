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

- `index.html`: todo o conteúdo (textos, links, equipe, projetos e as páginas de cada projeto).
- `src/style.css`: cores, tipografia e layout. A lógica de cor: amarelo = Felipe (della), azul = Enzo (carmo), verde = o que é dos dois.
- `src/main.js`: o grafo do merge no topo, a fusão de nomes, a sanfona do processo e as entradas.
- `src/router.js`: abre a página de um projeto no lugar da home, sem recarregar, e devolve a home na mesma rolagem.
- `src/youtube.js`: o player do YouTube com capa leve, que só carrega no play.
- `src/projetos/<projeto>/`: a página de cada projeto, com a cara dele: estilo, script e mídia.
- `src/img/`: as fotos da equipe e a foto de código. Todas são da própria Dellacarmo.

## Projetos

A seção "já está na main" (`#projetos`) mostra um card por projeto. O botão "Mais detalhes" abre a página do
projeto em `#projetos/<nome>` sem sair do site: a imagem do card cresce até virar o topo da página (view
transition, onde o navegador tem) e o "voltar", do site ou do navegador, devolve a home onde ela estava. Sem
JavaScript o mesmo endereço também funciona, por `:target`.

Para adicionar um projeto:

1. Crie `src/projetos/<nome>/` com a mídia, o CSS e, se precisar, o JS da página.
2. No `index.html`, coloque o card em `.projects__list`, com o link para `#projetos/<nome>`, e a página como
   `<article class="case" id="projetos/<nome>">` no fim do `<main>`. A imagem do card e a do topo da página levam
   `data-case-media`: é entre as duas que a transição acontece.
3. Ligue o CSS no `<head>` e o JS no `src/main.js`. A página recebe os eventos `case:warm` (o ponteiro passou no
   card), `case:open` e `case:close`.

### O vídeo do YouTube

A seção do trailer do WI//DIAG já está pronta. Quando o vídeo estiver no YouTube, cole o link (ou só o código do
vídeo) em `data-youtube`, no `index.html`:

```html
<div class="player wi-player" data-youtube="https://youtu.be/CODIGO_DO_VIDEO" data-label="Trailer do WI//DIAG">
```

Vazio, fica a capa com o aviso "em breve no YouTube". Com o link, o play abre o vídeo ali mesmo, pelo
`youtube-nocookie.com`, e o player só é baixado quando a pessoa aperta o play.
