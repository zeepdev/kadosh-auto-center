// Engine de classificação automática de prioridade de orçamentos.
// Calculada no momento de exibição (não persistida) — ajustes nas regras
// reclassificam orçamentos antigos automaticamente.

export const PRIORIDADES = {
  EXTREMA: { nivel: 4, label: 'EXTREMA', cor: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', icone: '🚨' },
  ALTA:    { nivel: 3, label: 'ALTA',    cor: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', icone: '⚠️' },
  MEDIA:   { nivel: 2, label: 'MÉDIA',   cor: '#eab308', bg: 'rgba(234, 179, 8, 0.15)',  icone: '🔧' },
  BAIXA:   { nivel: 1, label: 'BAIXA',   cor: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)', icone: '✨' }
};

// Palavras-chave: ordem de checagem é EXTREMA → ALTA → MÉDIA → BAIXA.
// A primeira que casa vence (mais grave precede menos grave).
const KEYWORDS = {
  EXTREMA: [
    'não pega', 'nao pega', 'não liga', 'nao liga', 'não anda', 'nao anda',
    'parado', 'travou', 'guincho', 'reboque', 'imobilizado', 'incapacitado',
    'sem freio', 'freio não funciona', 'freio nao funciona',
    'vazamento óleo', 'vazamento de óleo', 'vazamento oleo',
    'superaquec', 'superaqueceu', 'fervendo', 'ferveu',
    'pifou', 'morreu', 'fundiu', 'fundido', 'embreagem queimou',
    'pane elétrica', 'pane eletrica', 'curto-circuito'
  ],
  ALTA: [
    'barulho motor', 'barulho no motor', 'trepidando', 'tremendo',
    'luz acesa', 'luz acendeu', 'luz do painel',
    'fumaça', 'fumaca', 'cheiro queimado', 'cheiro de queimado',
    'perde força', 'perde forca', 'engasga', 'engasgando',
    'falha motor', 'falha no motor', 'oscilando', 'roncando',
    'freio rangendo', 'freio chiando', 'pedal duro',
    'amortecedor batendo', 'puxando para o lado'
  ],
  MEDIA: [
    'revisão', 'revisao', 'troca de óleo', 'troca óleo', 'troca oleo',
    'filtro', 'manutenção preventiva', 'manutencao preventiva',
    'alinhamento', 'balanceamento', 'pneu', 'bateria',
    'pastilha de freio', 'pastilha freio', 'amortecedor', 'correia'
  ],
  BAIXA: [
    'estética', 'estetica', 'polimento', 'cristalização', 'cristalizacao',
    'higienização', 'higienizacao', 'cera', 'limpeza', 'detalhamento',
    'enceramento'
  ]
};

// Default por categoria do dropdown do BudgetForm (servicoDesejado).
// Aplicado se nenhuma palavra-chave da descrição casar.
const CATEGORIA_PADRAO = {
  'Estética / Polimento': 'BAIXA',
  'Revisão Geral': 'MEDIA',
  'Motor / Mecânica': 'ALTA',
  'Suspensão / Freios': 'ALTA'
};

export function calcularPrioridade(servicoDesejado, descricao) {
  const texto = `${servicoDesejado || ''} ${descricao || ''}`.toLowerCase();

  for (const nivel of ['EXTREMA', 'ALTA', 'MEDIA', 'BAIXA']) {
    if (KEYWORDS[nivel].some(kw => texto.includes(kw))) {
      return PRIORIDADES[nivel];
    }
  }

  const fallback = CATEGORIA_PADRAO[servicoDesejado];
  if (fallback) return PRIORIDADES[fallback];

  return PRIORIDADES.MEDIA;
}
