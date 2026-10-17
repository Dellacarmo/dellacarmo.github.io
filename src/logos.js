// Logos das ferramentas, de Simple Icons (CC0). As marcas pertencem aos seus donos;
// aqui só indicam as tecnologias que a equipe usa. Onde não há logo, entra uma palavra.
import {
  siReact, siNextdotjs, siAngular, siTypescript, siVite, siTailwindcss, siNodedotjs, siDotnet,
  siPostgresql, siVercel, siGit, siFlutter, siDart, siKotlin, siAndroid, siPwa, siPython,
} from 'simple-icons';

const icon = (si) => ({ path: si.path, hex: si.hex });

export const LOGOS = {
  react: icon(siReact),
  next: icon(siNextdotjs),
  angular: icon(siAngular),
  typescript: icon(siTypescript),
  vite: icon(siVite),
  tailwind: icon(siTailwindcss),
  node: icon(siNodedotjs),
  dotnet: icon(siDotnet),
  postgres: icon(siPostgresql),
  vercel: icon(siVercel),
  git: icon(siGit),
  flutter: icon(siFlutter),
  dart: icon(siDart),
  kotlin: icon(siKotlin),
  android: icon(siAndroid),
  pwa: icon(siPwa),
  python: icon(siPython),
  sql: { word: 'SQL' },
  aws: { word: 'AWS' },
  a11y: { word: 'a11y' },
  llm: { word: 'LLM' },
  llamacpp: { word: 'llama.cpp', lines: ['llama', '.cpp'] },
  bits: { word: '4-bit' },
};
