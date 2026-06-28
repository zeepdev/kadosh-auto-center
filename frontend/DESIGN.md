# Sistema de Design — Kadosh Auto Center

Tema: **base grafite/preto neutro + vermelho da marca como detalhe** (nunca fundo vermelho chapado).
Aparência tecnológica/automotiva com animações leves. Implementado em CSS puro + componentes React,
sem bibliotecas de animação (usa CSS + IntersectionObserver).

A fonte da verdade é [`src/index.css`](src/index.css) — variáveis, utilitários e estilos globais.
Alterar uma variável lá reflete no site inteiro.

## Tokens (CSS variables em `:root`)

| Variável | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#0a0a0c` | Fundo principal (grafite quase preto) |
| `--bg-secondary` | `#0f0f12` | Seções alternadas |
| `--bg-elev` | `#16161a` | Cards/painéis elevados |
| `--bg-card` | `rgba(255,255,255,.025)` | Cartões `.glass` translúcidos |
| `--accent-color` | `#e10600` | **Vermelho da marca** (detalhe principal) |
| `--accent-hover` | `#ff2316` | Hover do vermelho |
| `--accent-deep` | `#9d0400` | Vermelho escuro p/ gradientes |
| `--accent-soft` | `rgba(225,6,0,.12)` | Fundo suave vermelho |
| `--accent-glow` | `rgba(225,6,0,.45)` | Brilho/sombra vermelha |
| `--text-main` `--text-muted` `--text-dim` | `#fff` / `#9a9aa4` / `#6a6a72` | Textos |
| `--hairline` / `--glass-border` | `rgba(255,255,255,.06)` / `.08` | Bordas finas |

> O vermelho da marca é **`#e10600`** em todo o site. O antigo `#dc2743` foi descontinuado.

## Tipografia

- **Anton** — títulos display do hero (`.hero h1`), caixa alta condensada.
- **Archivo** (800/900) — demais títulos `h1–h4`, botões, eyebrows, números.
- **Inter** — corpo de texto.

## Utilitários globais (classes)

- `.container` — largura máx. 1200px centralizada.
- `.eyebrow` — rótulo vermelho de seção (com tracinho), caixa alta.
- `.section-title` — título grande de seção (Archivo 900, uppercase).
- `.btn` / `.btn-ghost` / `.btn-outline` — botões (primário vermelho com glow / contorno / tracejado).
- `.glass` — cartão translúcido com blur.
- `.reveal` (+ `.reveal-left` / `.reveal-right`) — entrada animada ao rolar; ativada via classe
  `.is-visible` pelo componente [`Reveal`](src/components/Reveal.jsx). Respeita `prefers-reduced-motion`.
- `.shine` — brilho diagonal que passa no hover.
- `.diag-stripes` — diagonais vermelhas decorativas.

## Camada de páginas internas (dashboards)

Para Área do Cliente, Admin e afins:

- `.dash-page` — wrapper de página: fundo, cor e **`padding-top` que libera a navbar fixa**
  (corrige o conteúdo ficar escondido atrás do menu).
- `.dash-wrap` — limita a largura do conteúdo (máx. 1100px).
- `.panel` — cartão sólido (mais contraste que `.glass`).
- `.panel-title` — título de seção interna: branco + **barrinha vermelha** à esquerda.
- `.chip` / `.chip-accent` — etiquetas/badges.

## Componentes-chave

- [`Hero.jsx`](src/components/Hero.jsx) — foto da fachada com corte diagonal, zoom suave (ken burns),
  linha de varredura vermelha, diagonais e faixa de confiança (Confiança/Qualidade/Desempenho/Compromisso).
- [`Services.jsx`](src/components/Services.jsx) — cards com ícones outline e accent vermelho.
- [`Stats.jsx`](src/components/Stats.jsx) — 4 diferenciais **reais** (garantia 90 dias, diagnóstico
  computadorizado, preço justo, honestidade). **Não usar números inventados.**
- [`CtaBands.jsx`](src/components/CtaBands.jsx) — `OrcamentoBand` (faixa vermelha) e `WhatsAppBand`.
- [`Reveal.jsx`](src/components/Reveal.jsx) — animação leve de entrada via IntersectionObserver.
- [`ClientDashboard.jsx`](src/components/ClientDashboard.jsx) — inclui o **stepper de progresso**
  (`.prog-card`/`.stepper`/`.pstep`/`.pnode`): nós com ícones, ✓ nas etapas concluídas, anel pulsante
  na etapa atual e linha que preenche em vermelho.

## Convenções

- Vermelho é **detalhe**, não fundo. Para destaque use bordas, glow, diagonais, ícones e faixas pontuais.
- Cores **semânticas** podem fugir do vermelho quando comunicam estado (status: finalizado=verde,
  agendado=azul, pendente=vermelho; KPIs financeiros em verde). O resto segue o vermelho da marca.
- Toda animação deve respeitar `prefers-reduced-motion`.
- Sem emojis em títulos de seção do site público (mantê-los só onde já é funcional/amigável no painel).
