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
1. ✅ **Integrar API de NF real** no `InvoiceModal.jsx` — Conectado com Asaas (R$ 0,49/nota).
2. ✅ **Configurar conta Admin** — CNPJ preenchido e senha resetada (`Zeepzada07.`).

### 🟡 Média Prioridade
1. ⏭️ **Aplicar regras e valores dos Pacotes** — Aguardando setor financeiro validar descontos e itens para plugar a submissão de pacotes à API de orçamentos.
2. ⏭️ **Reativar confirmação de e-mail** no Supabase com SMTP próprio + template customizado.

### 🔵 Depende de Domínio Próprio (~R$30-40/ano)
3. ⏭️ **Verificar domínio no Resend** — para enviar e-mails para qualquer admin (hoje limitado ao dono da conta).
4. ⏭️ **Descomentar busca dinâmica de admins** no `server.js` (linhas 368-373) — depende do item 3.
