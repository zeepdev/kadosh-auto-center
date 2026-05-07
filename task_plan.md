# 📋 Task Plan

## Fases V.L.A.E.G — estado real (atualizado 2026-05-07)

- [x] **Fase 1: V - Visão**: Site institucional + sistema de gestão (cliente + admin) para Kadosh Auto Center.
- [x] **Fase 2: L - Link**: Supabase conecta tudo (auth, clientes, veiculos, orcamentos). Backend de placa via Express com fallback em cascata.
- [~] **Fase 3: A - Arquitetura**: Não seguiu A.N.T estrita — Supabase substituiu camada Tools. Pasta `tools/` é legado.
- [x] **Fase 4: E - Estilo**: Tema dark com vermelho `#dc2743`, glassmorphism, fontes legíveis.
- [ ] **Fase 5: G - Gatilho**: Implantação ainda não realizada (rodando local).

---

## Tarefas concluídas (2026-05-03 a 2026-05-07)

1. ✅ **Cascata de APIs de placa**: dotenv carregando, npm script, mensagens de erro úteis.
2. ✅ **Vincular `cliente_id` ao orçamento**: coluna FK em `orcamentos`, BudgetForm anexa cliente_id se logado, ClientDashboard filtra com regra OU.
3. ✅ **PDF profissional**: config centralizada em `oficina.js` (CNPJ, endereço, contatos), header completo, auto-fill CPF/veículo via `cliente_id`, bloco "Serviço Solicitado", bloco "Prioridade".
4. ✅ **Sistema de prioridade automática**: 4 níveis (EXTREMA/ALTA/MÉDIA/BAIXA), engine em `frontend/src/lib/prioridade.js`, badge no admin com filtros + ordenação, badge no PDF e no ClientDashboard.
5. ✅ **Login admin via Supabase Auth**: senha hardcoded removida, coluna `is_admin` em `clientes`, `useEffect` valida sessão + permissão.
6. ✅ **RLS hardening**: policies em todas as 3 tabelas, função `is_admin()` SECURITY DEFINER, trigger anti-escalation, validação automatizada via curl.
7. ✅ **Trigger `handle_new_user`** + recovery: auto-cria row em `clientes` quando user nasce em `auth.users`. `Cadastro.jsx` faz UPDATE em vez de INSERT.
8. ✅ **Sessão persistente** (Hero/Login): botão da Hero detecta sessão ("Minha Área" vs "Área do Cliente"), Login redireciona se já logado.
9. ✅ **Editar perfil + endereço**: card "Seus Dados" com modo edição inline, coluna `endereco` adicionada, PDF puxa endereço auto.
10. ✅ **Nome legal vs nome social**: coluna `nome_social` adicionada, regra de exibição (social || legal), PDF mantém nome legal por ser documento oficial.
11. ✅ **Botão "Solicitar Serviço"** no ClientDashboard: mini-form pré-preenchido, INSERT direto com `cliente_id`.
12. ✅ **Fix erro "Unexpected end of JSON input"** na consulta de placa: `placaApi.js` agora trata response.text() antes de parsear, mensagens de erro distintas.
13. ✅ **Validação de CPF** (algoritmo dos dígitos verificadores) no cadastro: Lógica local implementada em `frontend/src/lib/cpf.js` e integrada no `Cadastro.jsx`.

---

## Próximas tarefas (priorizadas)

1. ⏭️ **Preencher CPF do admin atual** manualmente via Supabase Table Editor (foi criado antes do trigger).
2. ⏭️ **API Placas (apiplacas.com.br)** — integrar como provedor adicional na cascata + reduzir timeout 10s → 5s. Esperando token sair de análise.
3. ⏭️ **Limpar `Gallery.jsx`** (array `images` morto que não renderiza).
4. ⏭️ **Remover pasta `oficina-kadosh/tools/`** (código legado SQLite/Sheets).
5. ⏭️ **Corrigir link do TikTok** em `AboutUs.jsx:20` (atualmente `https://www.tiktok.com/` genérico).
6. ⏭️ **Reativar email confirmation** com template customizado + SMTP próprio (SendGrid/Gmail). Atualmente está DESLIGADO no Supabase Authentication settings.
7. ⏭️ **Implantar (Fase G)** — deploy do frontend (Vercel/Netlify) + backend (Railway/Render).
