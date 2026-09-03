# 📋 Task Plan

## Fases V.L.A.E.G — estado real (atualizado 2026-05-08)

- [x] **Fase 1: V - Visão**: Site institucional + sistema de gestão (cliente + admin) para Kadosh Auto Center.
- [x] **Fase 2: L - Link**: Supabase conecta tudo (auth, clientes, veiculos, orcamentos). Backend de placa via Express com fallback em cascata.
- [x] **Fase 3: A - Arquitetura**: Supabase substituiu camada Tools. Pasta `tools/` removida.
- [x] **Fase 4: E - Estilo**: Tema dark com vermelho `#dc2743`, glassmorphism, fontes legíveis.
- [x] **Fase 5: G - Gatilho**: Deploy realizado — Frontend no Vercel + Backend no Render.

---

## Tarefas concluídas (2026-05-03 a 2026-05-08)

1. ✅ **Cascata de APIs de placa**: dotenv carregando, npm script, mensagens de erro úteis.
2. ✅ **Vincular `cliente_id` ao orçamento**: coluna FK em `orcamentos`, BudgetForm anexa cliente_id se logado, ClientDashboard filtra com regra OU.
3. ✅ **PDF profissional**: config centralizada em `oficina.js`, header completo, auto-fill CPF/veículo via `cliente_id`, bloco de prioridade.
4. ✅ **Sistema de prioridade automática**: 4 níveis, engine em `prioridade.js`, badge no admin/cliente/PDF.
5. ✅ **Login admin via Supabase Auth**: senha hardcoded removida, coluna `is_admin`, validação de sessão + permissão.
6. ✅ **RLS hardening**: policies em todas as tabelas, função `is_admin()` SECURITY DEFINER, trigger anti-escalation.
7. ✅ **Trigger `handle_new_user`**: auto-cria row em `clientes` no signup. `Cadastro.jsx` faz UPDATE.
8. ✅ **Sessão persistente**: Hero/Login detectam sessão e redirecionam.
9. ✅ **Editar perfil + endereço**: card com modo edição inline, coluna `endereco`.
10. ✅ **Nome legal vs nome social**: coluna `nome_social`, regras de exibição.
11. ✅ **Botão "Solicitar Serviço"** no ClientDashboard: mini-form pré-preenchido.
12. ✅ **Validação de CPF**: algoritmo de dígitos verificadores em `cpf.js`.
13. ✅ **Upload de fotos de serviço**: `UpdatePhotoModal.jsx` + Supabase Storage + tabela `atualizacoes_servico`.
14. ✅ **Notificação por e-mail ao cliente**: endpoint `/api/send-update-email` via Resend.
15. ✅ **Galeria estática**: grid 2x2 com fotos reais da oficina (foto1-4.jpeg).
16. ✅ **Carrossel de avisos**: `AvisosCarousel.jsx` com dados da tabela `avisos` (auto-play 8s).
17. ✅ **Modo TV**: `TvDashboard.jsx` fullscreen para exibição na oficina.
18. ✅ **Emissão de NF (simulada)**: `InvoiceModal.jsx` com UI completa, aguarda API real.
19. ✅ **Deploy em produção**: Vercel (frontend) + Render (backend) + variáveis de ambiente.
20. ✅ **Notificação de orçamento para admins**: endpoint `/api/send-budget-notification` + template HTML.
21. ✅ **API de Placas paga integrada**: dados completos (FIPE, restrições, chassi, specs) em Cadastro, ClientDashboard e ViewVehicleModal.
22. ✅ **Cache persistente de placas**: tabela `cache_placas` no Supabase, sem expiração.
23. ✅ **CNPJ do admin preenchido**: `61.004.527/0001-89` no campo cpf da conta admin.
24. ✅ **Senha do admin resetada**: via Supabase Admin API.
25. ✅ **Link TikTok corrigido**: já aponta para `@kadosh.auto.center`.
26. ✅ **Pasta tools/ removida**: código legado eliminado.
27. ✅ **Botões de Contato (Hero e Footer)**: Adicionado botão de Localização e corrigido WhatsApp no rodapé.
28. ✅ **Esqueleto da aba Pacotes**: Criados `Pacotes.jsx` e `PacoteDetalhes.jsx` com dados temporários e imagem de capa aplicada.

---

## Próximas tarefas (priorizadas)

### ✅ Concluído recentemente
1. ✅ **Renomear de Pacotes para Revisões**: Mudança de escopo de "Pacotes" para "Revisões" finalizada em `/revisoes` e `/revisoes/:id`.
2. ✅ **Valores e Itens das Revisões Básica e Premium**: Aplicado conteúdo exato enviado pelo financeiro (Básica: R$ 799,00 e Premium: R$ 1.799,00) contendo tabelas separadas de Serviços e Peças (excluída a aba de Benefícios Exclusivos).
3. ✅ **Conexão Real do Botão "Quero esta revisão"**: Totalmente integrado com inserção direta na tabela `orcamentos` do Supabase e disparando notificação por e-mail real aos administradores através da API `/api/send-budget-notification`.
4. ✅ **Correção de Contraste e Desfoque no Cabeçalho (Navbar)**: Adicionado um fundo descontraído com `backdrop-filter: blur(10px)` e fundo preto semitransparente na Navbar global para legibilidade instantânea em todas as páginas.
5. ✅ **Integrar API de NF real** no `InvoiceModal.jsx` — Conectado com Asaas (R$ 0,49/nota).
6. ✅ **Configurar conta Admin** — CNPJ preenchido e senha resetada (`Zeepzada07.`).
7. ✅ **Simplificação de Formulário e Acompanhamento do Veículo**: Simplificação do formulário de orçamento inicial com botão de expansão "Detalhar Orçamento (Opcional)"; remoção da avaliação de 1 a 5 do site; e criação de barra de progresso de serviço em tempo real com carro dinâmico e controle integrado no painel administrativo.
8. ✅ **Correção e Migração do Google Drive (JSON Parse e Suporte a OAuth2)**:
   - Corrigido o decodificador inteligente em `server.js` que processa corretamente `GOOGLE_CREDENTIALS_BASE64` (texto puro, base64 ou envolta em aspas).
   - Implementado suporte a **OAuth 2.0 (com Refresh Token)** para permitir uploads em contas pessoais do Gmail (evitando o erro `Service Accounts do not have storage quota` já que contas de serviço agora possuem cota zero para armazenamento próprio).
   - Adicionado o parâmetro `supportsAllDrives: true` para compatibilidade total com Drives Compartilhados.
9. ✅ **Integração do Google reCAPTCHA v3**: Site Key instalada no `index.html` e scripts de token adicionados aos formulários públicos (`BudgetForm.jsx` e `RevisaoDetalhes.jsx`). Criado o endpoint `/api/verify-recaptcha` no backend para validar os envios usando a `RECAPTCHA_SECRET_KEY` (com bypass de segurança caso a chave não esteja configurada localmente, para não travar o desenvolvimento).
10. ✅ **Foto de Perfil do Cliente e Depoimentos**: Desenvolvida a funcionalidade que permite aos clientes fazerem upload de suas próprias fotos de perfil (até 5MB) na área de edição de dados do painel do cliente (`ClientDashboard.jsx`), armazenando a foto no bucket público do Supabase. Modificada a listagem de depoimentos da página inicial (`Testimonials.jsx`) para buscar e exibir automaticamente as fotos reais dos autores (com fallback para a inicial estilizada do nome).
11. ✅ **Correção de Tela Preta no Fluxo de Caixa**:
   - Eliminada a duplicação de renderização de `<FluxoCaixa />` e `<MecanicosManager />` em `AdminDashboard.jsx`.
   - Adicionadas rotas diretas `/fluxo-de-caixa`, `/fluxo_caixa`, `/caixa` e rota curinga de fallback no `App.jsx`.
   - Blindado o componente `FluxoCaixa.jsx` contra dados nulos, campos corrompidos e formatos de data inválidos com helpers `safeArray` e `formatIsoDate`.
   - Implementado `ErrorBoundary.jsx` com botões de auto-recuperação e limpeza de cache local (`kadosh_fluxo_caixa_draft` / `kadosh_fluxo_caixa`).
12. ✅ **Consulta Geral de Lançamentos (Extrato de Entradas e Saídas)**:
   - Adicionada a sub-aba '🔍 Consultar Lançamentos (Extrato Geral)' no Fluxo de Caixa (`FluxoCaixa.jsx`).
   - Lista unificada de todas as entradas e saídas sem precisar abrir fechamento por fechamento.
   - Filtros por tipo (Recebidos/Pagos), períodos (Hoje, Mês Atual, Mês Anterior, Ano, Personalizado), conta e busca textual por placa/cliente/descrição.
   - Cards com totais dinâmicos (Recebido, Pago, Saldo Líquido, Qtd Lançamentos).
   - Exportação em formato CSV (Excel) e rotas diretas `/extrato` e `/lancamentos`.

### 🟡 Média Prioridade
1. ⏭️ **Reativar confirmação de e-mail** no Supabase com SMTP próprio + template customizado.

### 🔵 Depende de Domínio Próprio (~R$30-40/ano)
2. ⏭️ **Verificar domínio no Resend** — para enviar e-mails para qualquer admin (hoje limitado ao dono da conta).
3. ⏭️ **Descomentar busca dinâmica de admins** no `server.js` (linhas 368-373) — depende do item anterior.
