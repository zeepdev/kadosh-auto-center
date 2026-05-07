# 📈 Progress

*Histórico de progresso: o que foi feito, erros, testes e resultados.*

---

## 📸 SNAPSHOT — Estado em 2026-05-07

**Tudo abaixo foi feito em sessão estendida (entradas marcadas com data 2026-05-03 cobrem trabalho realizado entre 2026-05-03 e 2026-05-07; a data foi mantida por compatibilidade com referências existentes).**

### O que está pronto e funcionando
- ✅ **Cascata de APIs de placa** (SINESP → API Brasil → Placa FIPE) com fallback, timeout 10s/cada, dotenv carregando, npm script.
- ✅ **Auth completa** Supabase: cadastro, login, sessão persistente, redirecionamento inteligente (Hero detecta sessão).
- ✅ **Cadastro funcional** (com trigger `handle_new_user` auto-criando row em `clientes` + UPDATE pelo Cadastro.jsx).
- ✅ **ClientDashboard** completo: dados pessoais com edição inline (nome social + whatsapp + endereço), gestão de veículos com consulta de placa, botão "Solicitar Serviço" com mini-form pré-preenchido, histórico com badge de prioridade.
- ✅ **AdminDashboard** completo: login real (Supabase Auth + flag `is_admin`), lista com prioridade + filtros + ordenação, mudança de status, gerar PDF.
- ✅ **PDF profissional** com config centralizada da oficina, auto-fill via `cliente_id` (CPF, marca/modelo/ano, endereço), bloco de prioridade, bloco de serviço solicitado.
- ✅ **Sistema de prioridade automática** (4 níveis EXTREMA/ALTA/MÉDIA/BAIXA) com keyword matching + fallback por categoria.
- ✅ **RLS hardening** completo: policies em todas as 3 tabelas, função `is_admin()` SECURITY DEFINER, trigger anti-escalation. Validado com testes anônimos via curl.
- ✅ **Dados fixos da oficina** centralizados em `frontend/src/config/oficina.js`.
- ✅ **Validação algorítmica de CPF** no cadastro (`frontend/src/lib/cpf.js` — dígitos verificadores).

### Arquivos novos criados nesta sessão
- `frontend/src/config/oficina.js` — config centralizada (CNPJ, endereço, contatos)
- `frontend/src/lib/prioridade.js` — engine de classificação automática
- `frontend/src/lib/cpf.js` — validação algorítmica de CPF

### Configurações alteradas no Supabase (usuário rodou)
1. Tabela `orcamentos`: `+cliente_id UUID` (FK auth.users), `+índice idx_orcamentos_cliente_id`
2. Tabela `clientes`: `+is_admin bool DEFAULT FALSE`, `+endereco text`, `+nome_social text`
3. Função `public.is_admin(uid)` SECURITY DEFINER
4. Função `public.handle_new_user()` SECURITY DEFINER + trigger `on_auth_user_created` em `auth.users`
5. Função `public.prevent_is_admin_change()` + trigger `prevent_is_admin_change_trigger` em `clientes`
6. RLS habilitado em `clientes`, `veiculos`, `orcamentos` + ~13 policies
7. Authentication → Providers → Email → "Confirm email" **DESLIGADO** (trade-off conhecido — fricção zero no cadastro a custo de não validar email)
8. Usuário admin criado em `auth.users` (`kadoshautocenter7@gmail.com`) e marcado com `is_admin = true`

### Bugs/melhorias ainda pendentes (ver detalhes em `findings.md` e `task_plan.md`)
1. CPF do admin atual está vazio (criado antes do trigger; preencher manualmente via Table Editor)
2. Token API Placas (apiplacas.com.br em análise) → integrar quando liberar + reduzir timeouts
3. Limpar `Gallery.jsx` (array `images` morto)
4. Remover pasta `oficina-kadosh/tools/` (legado SQLite/Sheets)
5. Corrigir link genérico do TikTok em `AboutUs.jsx`
6. Reativar email confirmation no futuro (com SMTP próprio + template custom)
7. Implantar (Fase G) — deploy frontend (Vercel/Netlify) + backend (Railway/Render)

### Como continuar (qualquer IA, próxima sessão)
1. Ler `gemini.md` (quickstart no topo)
2. Ler `findings.md` (schema atual + decisões)
3. Ler `task_plan.md` (próximas tarefas)
4. Subir `npm run dev` + `npm run server` em 2 terminais (de `frontend/`)
5. Verificar que o estado descrito ainda bate com o código (audite antes de mudar)

---

## Log de Atividades (cronológico)

### 2026-05-03 — Cascata de APIs de placa (correção de bugs)
**Contexto**: A lógica de fallback SINESP → API Brasil → Placa FIPE já estava implementada em `frontend/server.js:154-176`, mas 3 bugs impediam o uso real dos provedores de fallback.

**Bugs corrigidos**:
1. `frontend/server.js` não importava `dotenv` → tokens nunca eram lidos do `.env`. **Fix**: adicionado `import 'dotenv/config'` no topo.
2. `frontend/.env` não tinha as chaves `API_BRASIL_TOKEN` e `PLACA_FIPE_TOKEN`. **Fix**: linhas vazias adicionadas (usuário cola os tokens quando obtiver).
3. `frontend/package.json` não tinha script para subir o servidor. **Fix**: adicionado `"server": "node server.js"`.

**Dependência adicionada**: `dotenv ^16.4.5`.

**Teste end-to-end**: subido o servidor com token de teste no `.env`, hit em `GET /api/status` retornou `apiBrasil: "✅ Token configurado"`. Confirmado que `dotenv` carrega corretamente quando rodado via `npm run server` (cwd = frontend/).

**Como usar agora** (2 terminais a partir de `frontend/`):
- `npm run server` → API de placa em `:3001`
- `npm run dev` → Vite em `:5173` (proxy `/api` → `:3001`)

**Pendente do mesmo tema**: usuário ainda precisa cadastrar e colar os tokens de API Brasil e Placa FIPE no `.env` quando os obtiver. SINESP funciona sem token.

### 2026-05-03 — Vincular `cliente_id` ao orçamento
**Contexto**: A tabela `orcamentos` não tinha vínculo com `clientes`. O `ClientDashboard` filtrava histórico por `placa`, o que misturaria dados se 2 clientes tivessem placas iguais.

**Decisão de regra de negócio** (alinhada com o usuário): filtro tipo "OU" — mostrar orçamentos com `cliente_id = meu_id` OU (`cliente_id IS NULL` AND placa bate com um dos meus veículos). Permite "reivindicar" orçamentos feitos como anônimo antes do cadastro.

**Mudanças**:
1. **Supabase** (rodado pelo usuário): `ALTER TABLE orcamentos ADD COLUMN cliente_id UUID REFERENCES auth.users(id)` + índice `idx_orcamentos_cliente_id`.
2. `frontend/src/components/BudgetForm.jsx:92-97` — antes de inserir, chama `supabase.auth.getUser()`. Se houver user, anexa `cliente_id: user.id` ao payload (spread condicional). Form anônimo continua funcionando.
3. `frontend/src/components/ClientDashboard.jsx:46-66` — substituiu `.in('placa', placas)` por 2 queries em `Promise.all`: (a) `eq('cliente_id', userId)` e (b) `is('cliente_id', null).in('placa', placas)`. Resultados merged e ordenados por `id` desc. Sem risco de duplicata porque (b) exige `cliente_id IS NULL`.

**Edge cases cobertos**:
- Cliente sem veículos cadastrados ainda vê orçamentos vinculados ao seu `cliente_id`.
- Visitante anônimo segue submetendo o form normalmente (sem `cliente_id`).
- Orçamentos antigos (pré-coluna) têm `cliente_id NULL` e aparecem se a placa bater.

### 2026-05-03 — PDF profissional + sistema de prioridade automática

**1. Config centralizada da oficina**
Criado `frontend/src/config/oficina.js` com dados fixos (CNPJ `61.004.527/0001-89`, endereço completo Av. Goiás Qd 43 Lt 18 Nº 6144 St. Urias Magalhães, telefone `(62) 8152-9741`, email `kadoshautocenter7@gmail.com`, garantia, validade do orçamento). Trocar dados no futuro = mexer em 1 lugar.

**2. PDF reformulado** (`PDFGenerator.jsx`)
- Header agora mostra: nome + CNPJ + endereço + telefone + email da oficina (lado esquerdo) e título + data emissão + validade (direito).
- Bloco DADOS DO CLIENTE: adicionado **E-mail**; CPF/CNPJ separado de WhatsApp.
- Bloco DADOS DO VEÍCULO: agora pode ser auto-preenchido (marca/modelo/ano vêm da tabela `veiculos`).
- **Novo bloco SERVIÇO SOLICITADO**: tipo + descrição que veio do `BudgetForm`.
- **Auto-fill via cliente_id**: se o orçamento tiver `cliente_id`, o `useEffect` busca em paralelo (`Promise.all`) `clientes` (cpf, nome, whatsapp) e `veiculos` (marca/modelo/ano filtrando pela placa do orçamento). Mostra status visual no admin: "🔍 Buscando..." → "✅ Auto-preenchidos".
- Footer usa `OFICINA.garantiaServicos` e `OFICINA.validadeOrcamento`.

**3. Sistema de prioridade automática**
Criado `frontend/src/lib/prioridade.js` com 4 níveis (EXTREMA 🚨, ALTA ⚠️, MÉDIA 🔧, BAIXA ✨). Lógica:
1. Varre `servicoDesejado + descricao` por palavras-chave (EXTREMA → BAIXA, primeira que casa vence).
2. Se nenhuma keyword bater, usa default por categoria do dropdown (`Estética/Polimento` → BAIXA, `Revisão Geral` → MÉDIA, `Motor/Mecânica` e `Suspensão/Freios` → ALTA).
3. Default final: MÉDIA.

Calculada **on-the-fly** (não persistida). Vantagem: ajustes nas regras reclassificam orçamentos antigos automaticamente.

**4. Prioridade no AdminDashboard** (`AdminDashboard.jsx`)
- Coluna nova "Prioridade" no início da tabela (badge colorido).
- Ordenação composta: prioridade desc → id desc (urgentes sempre no topo).
- Filtros por prioridade abaixo da busca: "Todos / 🚨 EXTREMA / ⚠️ ALTA / 🔧 MÉDIA / ✨ BAIXA" com contador. Clicar de novo desativa.

**5. Prioridade no PDF**
Bloco visual logo abaixo do header (`PDFGenerator.jsx` — `KadoshPDF`), bordado e tingido com a cor da prioridade.

**Pendente**: prioridade no `ClientDashboard` (não implementado — usuário pediu "no dashboard" e foi implementado só no admin; perguntar se quer também no do cliente). Endereço do cliente cadastrado também não auto-preenche (não há coluna `endereco` em `clientes` no schema atual).

### 2026-05-03 — Login admin via Supabase Auth (remoção de senha hardcoded)

**Contexto**: A senha do painel admin estava hardcoded em `AdminDashboard.jsx:22` (`'JesusCristo2025@'`), visível em DevTools. Login era apenas client-side (setava `localStorage.kadoshAuth = 'true'`), trivialmente burlável.

**Mudanças no Supabase** (rodadas pelo usuário):
1. `ALTER TABLE clientes ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;`
2. Criado usuário no Auth (Supabase Dashboard → Authentication → Users): email `kadoshautocenter7@gmail.com`, "Auto Confirm User" ativado.
3. `INSERT INTO clientes (id, nome, whatsapp, is_admin) VALUES ('9993df3c-7955-47aa-9d87-1e7d3a6f252d', 'Admin Kadosh', '556281529741', true);`

**Mudanças no código** (`AdminDashboard.jsx`):
- Removida senha hardcoded e qualquer referência a `localStorage.kadoshAuth`.
- Form de login agora tem **e-mail + senha**, usa `supabase.auth.signInWithPassword`.
- Após login bem-sucedido, query em `clientes.is_admin` valida permissão. Se não for admin → `signOut` automático + erro "Você não tem permissão para acessar o painel."
- `useEffect` de boot verifica se já existe sessão Supabase ativa E se o user é admin (skipa o login).
- Estados granulares: `checkingSession` (mostra "Verificando sessão..."), `loginLoading` (botão "Entrando..."), `loginError` (mensagem específica).
- `handleLogout` agora chama `supabase.auth.signOut()`.

**Defesa em camadas (recomendação futura)**: o controle ainda é só no client. Um atacante poderia, em teoria, manipular o JS pra pular a checagem de `is_admin`. A defesa real seria configurar **RLS (Row Level Security)** no Supabase para que mesmo com o token de um usuário não-admin, queries sensíveis (UPDATE em `orcamentos`, etc.) sejam negadas pelo banco. Não foi feito pq o usuário escolheu "Plano A" (rápido) — vale como próxima fase de hardening.

### 2026-05-03 — Fix: erro "Unexpected end of JSON input" na consulta de placa
**Causa raiz**: Quando o servidor `frontend/server.js` (`:3001`) está fora, o proxy do Vite repassa um body vazio. O `placaApi.js` chamava `.json()` direto e quebrava com mensagem confusa.

**Fix em `frontend/src/lib/placaApi.js`**:
- Faz `response.text()` antes de parsear, com try/catch específico para JSON malformado.
- Mensagens de erro distintas: body vazio, JSON inválido, servidor offline (`Failed to fetch`), e erros estruturados do backend.
- Checa `response.ok` antes de acceptar o resultado.

**Lembrete operacional**: precisa rodar `npm run server` (em `frontend/`) em paralelo com `npm run dev` para a consulta de placa funcionar.

### 2026-05-03 — Hardening de segurança via RLS no Supabase

**Contexto**: A checagem de `is_admin` era apenas client-side (em `AdminDashboard.jsx`). Um atacante poderia, em teoria, manipular o JS pra pular. Defesa real precisa ser no banco (Row Level Security).

**O que foi rodado no Supabase** (pelo usuário):
1. `CREATE FUNCTION public.is_admin(uid)` com `SECURITY DEFINER` — bypassa RLS pra checar `clientes.is_admin` sem recursão.
2. Trigger `prevent_is_admin_change_trigger` em `clientes` BEFORE UPDATE — impede não-admin de alterar a coluna `is_admin` (defesa contra escalation).
3. RLS habilitado em `clientes`, `veiculos`, `orcamentos`.
4. **Policies de `clientes`**: SELECT/UPDATE permitido pro próprio user OR admin; INSERT só com `id = auth.uid()` (signup); DELETE só admin.
5. **Policies de `veiculos`**: SELECT/UPDATE/DELETE permitido pro dono (`cliente_id = auth.uid()`) OR admin; INSERT só com `cliente_id = auth.uid()`.
6. **Policies de `orcamentos`**:
   - INSERT anônimo (form da landing): `cliente_id IS NULL` obrigatório.
   - INSERT logado: `cliente_id = auth.uid()` OR `cliente_id IS NULL`.
   - SELECT: próprios + anônimos com placa do cliente (regra OU já alinhada com o app) + admin vê tudo.
   - UPDATE/DELETE: só admin.

**Bug encontrado durante teste**: a primeira versão usava `TO anon` na policy de insert anônimo — bloqueava inserts legítimos. Corrigido removendo `TO anon` (default fica `{public}`, segurança preservada porque `cliente_id IS NULL` já restringe corretamente).

**Validação automatizada** (rodada via curl com publishable key):
- ✅ Anônimo insere orçamento com `cliente_id NULL` → 201
- ✅ Anônimo tenta insert com `cliente_id` falsificado → 42501 (RLS bloqueia)
- ✅ Anônimo SELECT em `clientes`/`orcamentos` → array vazio (não vê dados de ninguém)
- ✅ Anônimo INSERT em `clientes` (tentativa de escalation) → bloqueado
- ✅ `auth.role()` retorna `'anon'` confirmando role mapping

**Pendente de teste manual** (precisa de credencial, eu não consigo automatizar):
- Login admin → SELECT/UPDATE em `orcamentos` deve continuar funcionando
- Cadastro de cliente novo + login + ver dashboard
- Cliente add/remove veículos
- Cliente atual: a regra "OU" do `ClientDashboard` (`cliente_id = self OR (NULL AND placa IN ...)`) precisa ser confirmada visualmente

**Lembrete pra criar mais admins no futuro**: o cadastro normal (`/cadastro`) cria `is_admin = false`. Para promover, rodar `UPDATE clientes SET is_admin = true WHERE id = '<uuid>'` direto no SQL Editor (o trigger só permite isso quem já é admin, mas no SQL Editor você é `postgres`/`service_role` e bypassa). Bypass de RLS no SQL Editor é esperado e seguro nesse contexto.

### 2026-05-03 — Trigger handle_new_user + recovery + Cadastro UPDATE

**Contexto**: Após habilitar RLS, o fluxo `Cadastro.jsx` quebrou — `signUp` cria `auth.users` mas se a sessão não estiver ativa (caso típico com email confirmation), o INSERT subsequente em `clientes` é bloqueado pela policy. Resultado: usuários "órfãos" sem row em `clientes`, FK pra `cliente_id` em `veiculos` e `orcamentos` falhando.

**Solução adotada (padrão canônico Supabase)**: trigger `on_auth_user_created` em `auth.users` que chama `public.handle_new_user()` (SECURITY DEFINER) — auto-cria a row em `clientes` com nome/whatsapp vazios assim que `auth.users` recebe um INSERT. O fluxo de cadastro depois faz **UPDATE** da row já existente.

**SQL rodado** (pelo usuário):
1. `CREATE FUNCTION public.handle_new_user()` SECURITY DEFINER + `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users`.
2. Recovery: `INSERT INTO clientes ... SELECT u.id, '', '' FROM auth.users u LEFT JOIN clientes c ON c.id = u.id WHERE c.id IS NULL ON CONFLICT DO NOTHING;` — criou rows faltantes pros usuários órfãos.

**Mudança em `Cadastro.jsx`**:
- Trocado o `INSERT` em `clientes` por `UPDATE` (linha 72-79). RLS aceita porque `id = auth.uid()` e o user agora tem sessão (email confirmation foi desligado em paralelo).

**Decisão de UX**: email confirmation ficou DESLIGADO temporariamente. Voltará no futuro com template customizado e SMTP próprio (ex: SendGrid).

### 2026-05-03 — Sessão persistente: Hero não jogava cliente logado pra /login

**Sintoma**: Cliente logado clicava "Voltar ao Site" → "Área do Cliente" → caía na tela de login de novo. Parecia que tinha deslogado, mas a sessão estava intacta no localStorage — o link da Hero era hardcoded pra `/login`.

**Fix em `Hero.jsx`**: useEffect com `supabase.auth.getUser()` + `onAuthStateChange` mantém o user em state. Botão renderiza condicionalmente: `'Minha Área' → /cliente` se logado, `'Área do Cliente' → /login` se não.

**Defesa extra em `Login.jsx`**: useEffect on mount checa sessão; se já existe, `navigate('/cliente')` direto. Cobre o caso de alguém colar a URL de login estando logado.

### 2026-05-03 — Editar perfil + coluna endereco

**SQL rodado pelo usuário**: `ALTER TABLE public.clientes ADD COLUMN endereco text;` — coluna nullable adicionada.

**Mudanças em `ClientDashboard.jsx`**:
- Botão "✏️ Editar" no canto direito do card "Seus Dados" alterna entre modo leitura e edição.
- Campos editáveis: nome, whatsapp (com formatador), endereço.
- Campos bloqueados (mostrados mas com `disabled`): email (mexer = mudar chave de login), CPF (único por pessoa, validação de algoritmo virá depois).
- "Cancelar" descarta mudanças, "Salvar" faz UPDATE em `clientes` e refeed via `fetchDados`. RLS aceita porque `id = auth.uid()`.
- Card de leitura agora mostra também o endereço (gridColumn: '1 / -1' pra ocupar a linha inteira).

**Mudança em `PDFGenerator.jsx`**:
- Auto-fill do PDF agora também puxa `endereco` da tabela `clientes` quando há `cliente_id`.

### 2026-05-03 — Distinção nome legal vs nome social

**Decisão de UX (alinhada com o usuário)**:
- `nome` (legal, RG/CPF): preenchido no cadastro, **NUNCA editável** pela UI.
- `nome_social` (preferido, Lei 13.762/2016): editável, opcional. Quando preenchido, vira o nome de exibição (saudação no dashboard etc.).
- `cpf`: preenchido no cadastro, NUNCA editável.
- `email`: vinculado ao login, NÃO editável.

**SQL rodado**: `ALTER TABLE public.clientes ADD COLUMN nome_social text;`

**Mudanças em `ClientDashboard.jsx`**:
- Saudação "Olá, X!" agora usa `nome_social || nome`.
- Card "Seus Dados" mostra tanto Nome quanto Nome Social (com "(não informado)" se vazio).
- Form de edição: nome legal e CPF aparecem `disabled`; campos editáveis = nome_social, whatsapp, endereço.

**PDF**: continua usando `nome` (legal) por ser documento oficial. Decisão deliberada — não usar nome_social no PDF de orçamento.

**Conta antiga do usuário (admin) sem CPF**: criada antes do trigger; recovery preencheu com strings vazias. Para consertar: deletar via Supabase Dashboard → Auth → Users e refazer cadastro, OU editar a row direto pelo Table Editor preenchendo o CPF na mão. Cadastros novos (após trigger) já trazem tudo certo.

### 2026-05-03 — Botão "Solicitar Serviço" no ClientDashboard

**Motivação**: cliente logado não precisa preencher nome/email/whatsapp/placa de novo no form da landing — esses dados já estão salvos. Atalho direto no dashboard reduz fricção e mantém os orçamentos automaticamente vinculados ao `cliente_id`.

**UI**: bloco verde no `ClientDashboard.jsx` (entre "Seus Dados" e "Meus Veículos") com botão "+ Solicitar Serviço". Ao abrir, mostra mini-form com:
- **Veículo**: dropdown com os carros do cliente (escolhe a placa); pré-seleciona o `is_principal`
- **Tipo de serviço**: mesmo dropdown do BudgetForm
- **Descrição**: textarea (obrigatória)
- **Data + horário**: opcionais (mesmo padrão de horários do BudgetForm)

Botão fica `disabled` se o cliente não tem nenhum veículo cadastrado, com texto trocado para "Cadastre um veículo primeiro".

**Submit**: INSERT em `orcamentos` com `cliente_id = user.id` (RLS permite via `orcamentos_insert_auth`), nome/email/whatsapp puxados de `cliente`/`user`. Depois faz `fetchDados` e fecha o form com mensagem de sucesso.

### 2026-05-03 — Prioridade no ClientDashboard

**Mudança em `ClientDashboard.jsx`**: o histórico de serviços agora mostra a coluna "Prioridade" no início de cada linha, igual ao admin. Reaproveita a mesma engine `calcularPrioridade()` (consistência visual + de regras). Sort também por prioridade desc → id desc (urgentes no topo). Sem filtros de prioridade na visão do cliente — clientes têm poucos orçamentos, filtros seriam overkill.

### 2026-05-07 — Validação de CPF no Cadastro

**Arquivo novo**: `frontend/src/lib/cpf.js` exporta `validarCPF(cpf)` — algoritmo clássico dos dígitos verificadores: remove formatação, rejeita strings vazias e CPFs com todos os dígitos iguais (`'00000000000'`...`'99999999999'`), valida 1º e 2º dígitos verificadores via mod 11.

**Integração em `Cadastro.jsx`**: antes do `signUp`, chama `validarCPF(formData.cpf)`. Se retornar `false`, mostra "CPF inválido. Por favor, verifique o número digitado." e aborta. Sem dependência externa — pura lógica local, instantânea.

**Não cobre**: validação contra Receita Federal (precisaria API paga) — só pega CPFs com dígitos verificadores corretos. Para nossos fins, suficiente.

### 2026-05-07 — Validação de CPF no cadastro

**Contexto**: Anteriormente o sistema aceitava qualquer string como CPF durante o cadastro, o que poderia poluir o banco com dados inválidos.

**Mudanças**:
- Criado utilitário `frontend/src/lib/cpf.js` com o algoritmo de validação dos dígitos verificadores.
- Integrado no `Cadastro.jsx`: agora, antes de realizar o `signUp` no Supabase, a validação é executada. Caso inválido, a operação é abortada e um erro amigável é exibido na tela (`CPF inválido. Por favor, verifique o número digitado.`).
- A validação bloqueia CPFs com sequências repetidas (ex: `111.111.111-11`) e aqueles cujo dígito verificador não bate matematicamente.
