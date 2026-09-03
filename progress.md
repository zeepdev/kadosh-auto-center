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

### 2026-05-07 — Upload de fotos de serviço + notificação por e-mail

**Contexto**: O mecânico precisava de uma forma de registrar o progresso do serviço com fotos e notificar o cliente automaticamente.

**Mudanças**:
- Criado `UpdatePhotoModal.jsx` — modal no admin para upload de foto (Supabase Storage, bucket `fotos_servico`) + descrição do serviço.
- Criado endpoint `POST /api/send-update-email` no `server.js` — envia e-mail via Resend com foto embedded, template HTML dark com branding Kadosh.
- Tabela `atualizacoes_servico` criada no Supabase (id, orcamento_id FK, cliente_id FK, foto_url, descricao, created_at).
- Fluxo: mecânico seleciona foto → upload → registro no banco → e-mail automático ao cliente com link para o painel.

### 2026-05-07 — Galeria estática na landing page

**Contexto**: A galeria usava um widget do Instagram que parou de funcionar.

**Mudanças**:
- `Gallery.jsx` refeito com grid estático 2x2 usando `foto1-4.jpeg` em `public/`.
- Fotos reais da oficina colocadas no diretório.
- Array morto de `images` removido.

### 2026-05-07 — Emissão de Nota Fiscal (InvoiceModal — SIMULADO)

**Mudanças**:
- Criado `InvoiceModal.jsx` — modal completo com seleção de tipo (NFS-e, NF-e, ambas), valores, CPF/CNPJ do tomador.
- Auto-fill do CPF se o orçamento tiver `cliente_id`.
- **Status: SIMULADO** — UI completa mas sem API real. Aguarda integração com Focus NFe ou similar.

### 2026-05-07 — Consulta de veículo no admin (ViewVehicleModal)

**Mudanças**:
- Criado `ViewVehicleModal.jsx` no admin — botão 🚘 ao lado de cada orçamento.
- Inicialmente com dados simulados (hardcoded).

### 2026-05-07 — Modo TV (TvDashboard)

**Mudanças**:
- Criado `TvDashboard.jsx` — carrossel fullscreen para exibição na TV da oficina.
- Busca avisos da tabela `avisos` no Supabase, troca a cada 10s, recarrega a cada 5 min.
- Indicadores de progresso (pontinhos).
- Rota `/tv` adicionada ao App.jsx.

### 2026-05-07 — Carrossel de Avisos (AvisosCarousel)

**Mudanças**:
- Criado `AvisosCarousel.jsx` — carrossel na landing page com avisos/promoções.
- Dados da tabela `avisos` no Supabase (url da imagem, created_at).
- Auto-play a cada 8s, botões prev/next, indicadores clicáveis.

### 2026-05-08 — Deploy em produção (Vercel + Render)

**Mudanças**:
- **Frontend → Vercel**: configurado `vercel.json` com rewrite `/api/*` → Render.
- **Backend → Render**: serviço web rodando `node server.js` a partir de `frontend/`.
- Variáveis de ambiente configuradas em ambas as plataformas.
- URLs de produção: `https://kadosh-auto-center.vercel.app` (frontend) e `https://kadosh-auto-center.onrender.com` (backend).

### 2026-05-08 — Notificação automática de orçamento para admins

**Mudanças**:
- Criado endpoint `POST /api/send-budget-notification` no `server.js`.
- Template HTML dark com dados do cliente, veículo, serviço e link para o painel admin.
- Integrado no `BudgetForm.jsx` — disparo fire-and-forget (não bloqueia o insert).
- **Limitação**: Resend free tier só envia para o dono da conta (`isaqueduarte07@gmail.com`). Código para busca dinâmica de admins está pronto mas comentado — ativar quando verificar domínio próprio.

### 2026-05-08 — Integração da API de Placas paga (apiplacas.com.br)

**Mudanças**:
1. **`server.js`** — Provedor `consultarAPIPlacas` atualizado para retornar TODOS os dados brutos da API em campo `extra` (FIPE, restrições, chassi, specs técnicas, documentação).
2. **`placaApi.js`** — Helper frontend repassa o campo `extra`.
3. **`ViewVehicleModal.jsx`** — Redesenhado completamente: seções accordion com Identificação, Specs Técnicas, Chassi/Documentação, Restrições, Tabela FIPE expandível.
4. **`ClientDashboard.jsx`** — Preview compacto ao adicionar veículo: marca/modelo/ano, FIPE, restrições, specs.
5. **`Cadastro.jsx`** — Mesmo preview compacto na tela de registro.
- Token `API_PLACAS_TOKEN` configurado no `.env` e no Render.
- Cascata reduzida para: SINESP → API Placas (removidos API Brasil e Placa FIPE que nunca funcionaram).

### 2026-05-08 — Cache persistente de consultas de placa (Supabase)

**Mudanças**:
- Tabela `cache_placas` no Supabase (placa TEXT PK, dados JSONB, created_at TIMESTAMPTZ).
- Funções `cacheGet(placa)` e `cacheSet(placa, dados)` no `server.js`.
- `initCachePlacas()` verifica/cria a tabela no startup.
- Cache sem expiração — 1ª consulta chama API (cobra), consultas subsequentes retornam do cache (grátis).
- Endpoint `/api/status` mostra stats do cache (total de placas, lista).
- Substituiu o cache em memória (Map) que se perdia a cada restart.

### 2026-05-08 — CNPJ do admin + senha resetada

**Mudanças**:
- Campo `cpf` do admin (`kadoshautocenter7@gmail.com`) atualizado com CNPJ `61.004.527/0001-89` via API admin.
- Senha da conta admin resetada via Supabase Admin API.
- Pendências de prioridade baixa (TikTok, pasta tools/) verificadas como já resolvidas.

### 2026-05-08 — Integração Real com Asaas (NFS-e)

**Contexto**: Substituição da simulação de nota fiscal por uma integração real com a API do Asaas para emissão de Notas Fiscais de Serviço.

**Mudanças**:
- **Backend (`server.js`)**:
  - Adicionado helper `asaasRequest` para chamadas autenticadas.
  - Implementada lógica `getOrCreateAsaasCustomer` para evitar duplicidade de clientes no Asaas.
  - Criado endpoint `POST /api/invoice/emit` para agendamento de notas.
  - Criado endpoint `GET /api/invoice/:id/status` para consulta de PDF/XML.
- **Frontend (`InvoiceModal.jsx`)**:
  - Substituída a simulação `setTimeout` por chamadas reais ao backend.
  - Adicionado formulário completo com Nome, CPF/CNPJ, E-mail, Valor e Descrição.
  - Implementada tela de sucesso com ID da nota e badge de status (Agendada, Autorizada, etc.).
  - Adicionado tratamento de erros específicos da API do Asaas.
- **Configuração**:
  - Adicionadas variáveis `ASAAS_API_KEY` e `ASAAS_ENV` ao `.env`.
  - Sistema preparado para alternar entre Sandbox e Produção apenas via variável de ambiente.

### 2026-05-27 — Layout Hero/Footer e Aba Pacotes (Esqueleto UI)

**Contexto**: Sessão de ajustes visuais e adição de nova feature (planos/pacotes) a pedido do usuário.

**Mudanças e Fixes**:
1. **Fix Server.js**: Removida importação duplicada de `Readable` (`stream`) que estava causando crash no backend ao processar o endpoint de correção de IA (`/api/ai/fix-text`).
2. **Botões de Contato (Home e Footer)**:
   - Adicionado botão de **📍 Localização** no componente `Hero.jsx`, abaixo de "Solicitar Orçamento" e "Minha Área". Estilização unificada com fundo transparente e borda vermelha (`#dc2743`).
   - Adicionado botão de **💬 WhatsApp** no `Footer.jsx`, puxando o número do `oficina.js`. A cor de fundo verde foi removida para herdar a cor do tema dos outros ícones (vermelho).
3. **Nova Feature: Pacotes (Esqueleto Visual)**:
   - Criado componente `Pacotes.jsx` servindo como vitrine (cards).
   - O background hero utiliza imagem do usuário (`/images/pacotes-capa.png`).
   - Criado componente de detalhes do pacote `PacoteDetalhes.jsx` acessível via rotas `/pacotes/:id`.
   - Incluído link "📦 Pacotes" em `Navbar.jsx`.
   - **Nota de Negócio**: A página está rodando com *textos "Lorem Ipsum"* e dados mockados (R$ 299,90 e R$ 799,90) aguardando as confirmações de regras, benefícios e combos de desconto por parte da equipe financeira do Kadosh Auto Center. A conexão de envio real para o backend também está pendente disso.

### 2026-06-16 — Simplificação de Formulário e Barra de Acompanhamento do Veículo

**Contexto**: O dono solicitou a redução da quantidade de campos exibidos inicialmente no formulário de orçamento público para diminuir a fricção do cliente, bem como a implementação de uma barra de rastreamento do veículo no painel do cliente, similar ao rastreamento de entregas.

**Mudanças**:
1. **Formulário de Orçamento Simplificado (`BudgetForm.jsx` & `index.css`)**:
   - Redesenhado o formulário público para exibir inicialmente apenas os campos essenciais: *Nome Completo*, *WhatsApp* (em linha com *Placa do Veículo*) e *Descrição do Problema*.
   - Adicionado o botão tracejado `.btn-outline` "Detalhar Orçamento (Opcional)" que exibe/oculta os outros campos (*Telefone*, *E-mail*, *CEP*, *Serviço Desejado*, *Data e Horário Desejado*) usando uma animação suave de fade-in (`.animate-fade-in-fast`).
   - Removido o campo "Avaliação do Site (1 a 5)". O formulário envia o valor padrão `'5'` sob o capô para compatibilidade com o banco de dados.

2. **Acompanhamento de Serviços Ativos (`ClientDashboard.jsx`)**:
   - Criada a seção **Progresso do Serviço em Tempo Real** no topo do painel do cliente. Esta seção é exibida dinamicamente caso o cliente possua serviços ativos (status diferente de "Finalizado").
   - A barra exibe 5 marcos horizontais (*Recebido*, *Diagnóstico*, *Manutenção*, *Fase Final*, *Pronto*).
   - Um ícone de carro dinâmico move-se horizontalmente ao longo da linha de progresso baseado no passo e muda de estado (quebrado `🚗💥` → em conserto `🚗🔧` → consertado e brilhando `🚗✨`).

3. **Gerenciamento de Etapa de Serviço (`AdminDashboard.jsx`)**:
   - Inseridos seletores de progresso diretamente na coluna **Status** para atendimentos que não estão finalizados.
   - O administrador pode escolher o **Passo do Progresso** (de 0 a 3) e preencher o texto da **Etapa Atual** em tempo real. O estado é salvo de forma empacotada no formato `"passo | etapa"` na antiga coluna `avaliacaoSite` do banco, evitando a necessidade de realizar alterações de DDL (`ALTER TABLE`) que poderiam falhar sem a função `exec_sql` habilitada no Supabase.
   - Quando o status geral do serviço é marcado como "Finalizado", o passo 4 ("Serviço Concluído") é preenchido automaticamente para o cliente.

4. **Validação**:
   - O projeto foi testado e compilado com sucesso executando `npm run build`.
   - Compatibilidade reversa de banco: registros antigos com a coluna `avaliacaoSite` vazia ou com notas numéricas antigas são graciosamente interpretados como passo 0 (Pendente) ou passo 4 (Finalizado).

### 2026-06-16 — Correção do Google Drive e Integração do Google reCAPTCHA v3

**Contexto**: O usuário relatou um erro de parsing de JSON ao enviar orçamentos para o Google Drive em produção. Adicionalmente, solicitou a implementação do Google reCAPTCHA v3 para proteção contra spam nos formulários de orçamento do site.

**Mudanças**:
1. **Correção e Migração do Google Drive (`server.js`)**:
   - Ajustada a decodificação da variável de ambiente `GOOGLE_CREDENTIALS_BASE64` para remover aspas externas inseridas automaticamente por plataformas de deploy (como Render).
   - Implementado suporte robusto e automático para ler a credencial tanto em formato JSON plano (texto corrido) quanto em Base64, evitando falhas de caractere inválido (`Unexpected token... is not valid JSON`).
   - Adicionada integração nativa via **OAuth 2.0 (com Refresh Token)** para contornar a nova restrição do Google (contas de serviço criadas recentemente possuem cota zero de armazenamento e não conseguem efetuar uploads em contas pessoais do Gmail). O sistema agora aceita as variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REFRESH_TOKEN` para autenticação baseada no usuário pessoal, mantendo fallback para Service Account.
   - Adicionado o parâmetro `supportsAllDrives: true` para garantir compatibilidade com Drives Compartilhados.
2. **Endpoint de Verificação do reCAPTCHA (`server.js`)**:
   - Criado o endpoint `POST /api/verify-recaptcha` no Express. Ele faz a chamada para `https://www.google.com/recaptcha/api/siteverify` usando a chave secreta cadastrada na variável de ambiente `RECAPTCHA_SECRET_KEY`.
   - Incluído um bypass de segurança que permite o funcionamento normal (retorna sucesso) caso a chave secreta não esteja preenchida localmente, evitando travar desenvolvedores em ambiente de desenvolvimento.
3. **Integração no Frontend (`index.html`, `BudgetForm.jsx` & `RevisaoDetalhes.jsx`)**:
   - Inserida a tag de script oficial do reCAPTCHA v3 carregando de forma assíncrona no cabeçalho do `index.html`.
   - Adicionada a validação do token nos dois formulários de solicitação públicos do site (`BudgetForm.jsx` e `RevisaoDetalhes.jsx`).
   - Se o reCAPTCHA falhar (score menor que 0.5), o formulário é travado e o usuário recebe um feedback de erro anti-spam. Caso o script seja bloqueado por adblock ou o servidor tenha problemas temporários, a validação é contornada de forma resiliente para não bloquear clientes legítimos.
4. **Variáveis de Ambiente (`.env`)**:
   - Adicionados os placeholders para `RECAPTCHA_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REFRESH_TOKEN` no arquivo de desenvolvimento.

### 2026-06-17 — Foto de Perfil do Cliente e Depoimentos

**Contexto**: O usuário solicitou que os clientes pudessem enviar sua própria foto de perfil (avatares de até 5MB) em suas contas e que estas fossem exibidas ao lado de seus depoimentos no carrossel de depoimentos do site.

**Mudanças**:
1. **Banco de Dados (Supabase)**:
   - Identificada a necessidade de adicionar a coluna `foto_url TEXT` na tabela `clientes` do Supabase para armazenar a referência pública do avatar.
2. **Painel do Cliente (`ClientDashboard.jsx`)**:
   - Adicionados estados `avatarFile` e `previewUrl` para gerenciar a seleção e pré-visualização de imagem.
   - Adicionado campo de upload de imagem para Foto de Perfil no modo de edição do perfil com validação limitando o arquivo a 5MB.
   - Atualizada a função `saveProfile` para fazer o upload da foto selecionada para o bucket público `fotos_servico` do Supabase Storage no caminho `avatars/{user_id}_{timestamp}.{ext}`, obtendo a URL pública e salvando-a na coluna `foto_url` da tabela `clientes`.
   - Renderizado o avatar circular do cliente ao lado da saudação "Olá, [Nome]!" no cabeçalho do painel do cliente, com fallback elegante (inicial do nome em círculo vermelho) se não houver foto.
3. **Carrossel de Depoimentos (`Testimonials.jsx`)**:
    - Modificada a consulta ao banco de dados no Supabase para buscar os depoimentos realizando um join na tabela de clientes: `.select('*, clientes(foto_url)')`.
    - Atualizada a renderização dos cards de depoimento para exibir a foto do cliente caso ela exista, preservando o fallback original da letra inicial caso a foto não exista ou seja um depoimento anônimo.

### 2026-07-10 — Módulo de Fluxo de Caixa Diário e Consolidado

**Contexto**: Implementação completa do controle e fechamento diário do fluxo de caixa com automação por contas, backup de rascunhos, histórico consolidado de 5 anos e envio organizado ao Google Drive.

**Mudanças**:
1. **Modelagem e Interface Diária (`FluxoCaixa.jsx`)**:
   - Criação da sub-aba **Fechamento Diário** contendo a data do caixa, saldo anterior (detalhado por conta), entradas, saídas, valores finais declarados e observações.
   - **Automação de Contas**:
     - *Entradas*: Separadas as colunas de *Método de Pagamento* e *Para Onde Foi*. Selecionar "Dinheiro" trava automaticamente o destino como "Caixa da Empresa". Outros métodos permitem escolher entre "Mercado Pago KADOSH" e "Mercado Pago ROMANOS".
     - *Saídas*: Coluna de seleção da conta de origem ("De Onde Saiu") entre "Mercado Pago KADOSH", "Mercado Pago ROMANOS" e "Caixa da Empresa".
   - **Persistência de Rascunho**: O formulário é salvo em tempo real no `localStorage` sob a chave `kadosh_fluxo_caixa_draft` para evitar perda de dados.
   - **Botão Novo Dia**: Reseta os lançamentos correntes com caixa zerado e herda os saldos finais declarados do fechamento anterior.
   - **Remoção de Validação HTML5**: Retirada a obrigatoriedade nativa (`required`) dos inputs das listas para evitar que o navegador bloqueasse a submissão silenciosamente caso houvesse linhas vazias na tabela. A validação agora ocorre via JavaScript de forma controlada.

2. **Relatório em PDF e Conciliação (`FluxoCaixaPDF.jsx`)**:
   - Desenvolvido template do relatório diário em PDF com a tabela de **Conciliação de Contas** comparando o saldo inicial anterior, a movimentação líquida (entradas - saídas), o saldo esperado e o saldo final declarado para cada uma das 3 contas individualmente.
   - Exibição de totais e métodos formatados profissionalmente.

3. **Painel Consolidado de 5 Anos (`FluxoCaixa.jsx` - Aba Consolidado)**:
   - Adicionada aba **Consolidado Mensal / Anual** com navegação por anos que calcula o somatório acumulado e exibe o desempenho com gráficos de barras horizontais em CSS.

4. **Upload para Google Drive (`server.js`)**:
   - Rota `/api/drive/upload` estendida com suporte ao parâmetro `subFolder`.
   - Adicionado suporte à variável de ambiente `GOOGLE_DRIVE_FLUXO_CAIXA_FOLDER_ID` no Render, que permite o envio direto para o ID da pasta do Drive de Fluxo de Caixa (`1swePj9-0w7IIk70Xwxr49p7Fer4iwpEd`), contornando limitações de listagem de escopo da API Google OAuth 2.0.

5. **Deploy**:
   - Realizado deploy das alterações na Vercel (frontend) e no Render (backend) com sincronização em tempo real no branch `main` do GitHub.

### 2026-09-03 — Correção de Tela Preta no Fluxo de Caixa e Resiliência

**Contexto**: Diagnóstico e resolução de tela preta / travamento de renderização ao entrar no Fluxo de Caixa.

**Causas Identificadas e Corrigidas**:
1. **Duplicação de Renderização (`AdminDashboard.jsx`)**:
   - Removida a duplicação dos blocos de abas de `<FluxoCaixa />` e `<MecanicosManager />`.
   - Implementado suporte a `initialTab` e sincronização automática com parâmetros de busca na URL (`?tab=fluxo_caixa`).
2. **Rotas Dedicadas e Wildcard (`App.jsx`)**:
   - Adicionadas rotas `/fluxo-de-caixa`, `/fluxo_caixa` e `/caixa` apontando para `<AdminDashboard initialTab="fluxo_caixa" />`.
   - Adicionada rota de fallback `<Route path="*" element={<Navigate to="/" replace />} />`.
3. **Blindagem Contra Dados Nulos/Corrompidos (`FluxoCaixa.jsx`)**:
   - Implementados os helpers `safeArray` e `formatIsoDate`.
   - Sanitizadas todas as chamadas a `.split('-')`, `.reduce()`, `.filter()` e `.forEach()`.
   - Corrigido `loadDraft` para checagens seguras (`!= null` e `String(...)`).
   - Gerados IDs de canal únicos para evitar conflitos de Realtime no Supabase.
4. **Novo Componente de Recuperação (`ErrorBoundary.jsx`)**:
   - Criado componente de captura de erro para isolar falhas de renderização, com botões para tentar novamente e limpar cache local corrompido (`kadosh_fluxo_caixa_draft` / `kadosh_fluxo_caixa`).

### 2026-09-03 — Consulta Geral de Lançamentos (Extrato de Entradas e Saídas)

**Contexto**: Demanda da gerência/cliente para consultar todos os pagamentos e recebimentos em uma única visão centralizada, sem precisar abrir cada fechamento diário individualmente.

**Mudanças**:
1. **Nova Sub-Aba no Fluxo de Caixa (`FluxoCaixa.jsx`)**:
   - Implementada a sub-aba **🔍 Consultar Lançamentos (Extrato Geral)**.
   - Unificação de todas as entradas e saídas de todos os fechamentos passados + lançamentos do dia atual em tempo real.
   - Tabela responsiva com badges `🟢 Recebido` e `🔴 Pago`, data, forma de pagamento, conta e link para o PDF do fechamento.
2. **Filtros e Totalizadores Dinâmicos**:
   - Filtros por Tipo (Todos, Recebidos, Pagos), Período (Hoje, Este Mês, Mês Passado, Este Ano, Todo o Histórico ou Personalizado com range de datas), Conta bancária e Busca textual ampla.
   - Cards KPI em tempo real calculando Total Recebido, Total Pago, Saldo Líquido e Quantidade de Operações.
   - Paginação de alta performance com 50 itens por página.
3. **Exportação de Relatório (CSV)**:
   - Exportador nativo de planilha CSV/Excel formatada para auditorias e conferências financeiras.
4. **Rotas Dedicadas**:
   - Adicionadas rotas `/extrato` e `/lancamentos` no `App.jsx` com suporte a `initialSubTab` no `AdminDashboard.jsx`.

### 2026-09-03 — Relatório em PDF e Impressão de Comissões de Mecânicos

**Contexto**: Demanda da gerência para gerar e imprimir relatórios mensais de comissões (ex: mecânico Eduardo, período 01 a 30) para conferência e acerto com assinatura física.

**Mudanças**:
1. **Componente de Relatório em PDF (`ComissaoPDF.jsx`)**:
   - Desenvolvido documento profissional A4 via `@react-pdf/renderer`.
   - Cabeçalho oficial com dados da Kadosh Auto Center, identificação do mecânico com Chave PIX/CPF para facilitar transferência, cards de resumo e tabela analítica.
   - Termo de quitação formal com campos de assinatura do mecânico e da gerência.
2. **Integração no Painel (`MecanicosManager.jsx`)**:
   - Botões de ação **`📄 Baixar PDF`** e **`🖨️ Imprimir`** no topo dos filtros e no cabeçalho da tabela.
   - Opções de período: **Mês Fechado (01 a 30/31)** ou **Personalizado** (datas início e fim).
   - Cálculo individualizado e exato de comissão da cota-parte do mecânico selecionado.

