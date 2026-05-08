# 🛠️ Oficina Kadosh — AI Handover Documentation

> **Última atualização:** 2026-05-08  
> Este documento é a referência principal para qualquer IA (ou humano) que for continuar o desenvolvimento. Leia-o **inteiro** antes de abrir código.

---

## 🚀 Visão Geral do Projeto

**Produto:** Sistema completo de gestão para o **Kadosh Auto Center** (oficina mecânica em Goiânia-GO).

**Escopo:** Site institucional público + Área do Cliente (autenticada) + Painel Administrativo + Backend de APIs + Sistema de notificações por e-mail.

**URL de produção:**
- **Frontend:** `https://kadosh-auto-center.vercel.app`
- **Backend (API):** `https://kadosh-auto-center.onrender.com`

---

## 🧱 Stack Tecnológica

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | SPA com CSS Vanilla (dark theme + glassmorphism) |
| **Backend/DB** | Supabase | Auth, Postgres, Storage (bucket `fotos_servico`), RLS |
| **Servidor Node** | Express 5 | Proxy para APIs de placa + endpoints de e-mail (porta `:3001` local) |
| **E-mails** | Resend | Notificações de orçamento (→ admin) e atualizações de serviço (→ cliente) |
| **Notas Fiscais** | Asaas | Emissão de NFS-e (R$ 0,49/nota) via API REST |
| **PDF** | @react-pdf/renderer | Geração de orçamentos profissionais em PDF |
| **Deploy** | Vercel (frontend) + Render (backend) | `vercel.json` faz rewrite `/api/*` → Render |

### Dependências Principais (`package.json`)
```
@supabase/supabase-js  ^2.105.1
@react-pdf/renderer    ^4.5.1
react-router-dom       ^7.14.2
resend                 ^6.12.3
express                ^5.2.1
sinesp-api             ^3.0.0
dotenv                 ^16.4.5
cors                   ^2.8.6
```

---

## 🗂️ Estrutura de Diretórios

```
oficina-kadosh/
├── AI_HANDOVER.md              ← VOCÊ ESTÁ AQUI
├── progress.md                 ← Log cronológico detalhado de tudo que foi feito
├── task_plan.md                ← Checklist de tarefas (concluídas + pendentes)
├── findings.md                 ← Schema do banco, decisões de design, SQL rodado
├── gemini.md                   ← Quickstart original (legado, mas ainda útil)
├── protocolo_vlaeg.md          ← Protocolo de metodologia de desenvolvimento
├── modelo.png                  ← Referência visual do layout do PDF
│
└── frontend/
    ├── server.js               ← Servidor Express (APIs de placa + e-mails Resend)
    ├── vercel.json             ← Config de deploy (rewrites /api → Render)
    ├── package.json
    ├── .env                    ← Variáveis de ambiente (NÃO commitado)
    ├── public/
    │   └── foto1-4.jpeg        ← Fotos da galeria estática da landing page
    │
    └── src/
        ├── App.jsx             ← Roteamento principal (react-router-dom)
        ├── main.jsx            ← Entry point
        ├── index.css           ← CSS global (variáveis, reset, tema dark)
        ├── App.css             ← CSS do layout e componentes
        │
        ├── config/
        │   └── oficina.js      ← Dados fixos da oficina (CNPJ, endereço, contatos)
        │
        ├── lib/
        │   ├── supabase.js     ← Instância do client Supabase
        │   ├── placaApi.js     ← Fetch helper p/ consulta de placa (c/ tratamento de erros)
        │   ├── prioridade.js   ← Engine de classificação automática (4 níveis)
        │   └── cpf.js          ← Validação algorítmica de CPF (dígitos verificadores)
        │
        └── components/
            ├── Hero.jsx                ← Banner principal (detecta sessão → "Minha Área" ou "Área do Cliente")
            ├── AvisosCarousel.jsx      ← Carrossel de avisos/promoções (dados do Supabase, tabela `avisos`)
            ├── Services.jsx            ← Seção de serviços oferecidos
            ├── Gallery.jsx             ← Grid de fotos estáticas da oficina (foto1-4.jpeg)
            ├── BudgetForm.jsx          ← Form de orçamento público (anônimo ou logado, notifica admin por e-mail)
            ├── AboutUs.jsx             ← Seção sobre nós / contato / redes sociais
            ├── ClientDashboard.jsx     ← Dashboard completo do cliente autenticado
            ├── TvDashboard.jsx         ← Modo TV (carrossel fullscreen para exibição na oficina)
            │
            ├── Auth/
            │   ├── Login.jsx           ← Login (Supabase Auth, redireciona se já logado)
            │   ├── Cadastro.jsx        ← Registro (c/ validação de CPF, trigger auto-cria row em clientes)
            │   ├── ForgotPassword.jsx  ← Esqueci minha senha
            │   └── ResetPassword.jsx   ← Redefinir senha
            │
            └── Admin/
                ├── AdminDashboard.jsx  ← Painel admin (lista de orçamentos, filtros, prioridade, ações)
                ├── PDFGenerator.jsx    ← Gerador de PDF profissional (auto-fill via cliente_id)
                ├── UpdatePhotoModal.jsx← Upload de foto + notificação por e-mail ao cliente
                ├── InvoiceModal.jsx    ← Modal de emissão de NFS-e (Integrado com Asaas)
                └── ViewVehicleModal.jsx ← Detalhes técnicos completos do veículo via API Placas (API real integrada)
```

---

## 🔐 Autenticação & Segurança

### Supabase Auth
- Login por **e-mail + senha** (confirmação de e-mail **DESLIGADA** temporariamente para zero-friction no dev).
- Trigger `on_auth_user_created` → `handle_new_user()` (SECURITY DEFINER) auto-cria row em `public.clientes` no signup.
- `Cadastro.jsx` faz **UPDATE** (não INSERT) na row já criada pelo trigger.

### Roles
- Campo `is_admin BOOLEAN DEFAULT FALSE` na tabela `clientes`.
- Admin principal: `kadoshautocenter7@gmail.com` (UUID: `9993df3c-7955-47aa-9d87-1e7d3a6f252d`).
- Função `public.is_admin(uid)` com SECURITY DEFINER para checagem segura.
- Trigger `prevent_is_admin_change_trigger` impede que não-admins alterem a coluna `is_admin`.

### Row Level Security (RLS)
Habilitado e com policies completas nas 3 tabelas principais:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `clientes` | Próprio ou admin | Só `id = auth.uid()` (via trigger) | Próprio ou admin | Só admin |
| `veiculos` | Dono ou admin | Só `cliente_id = auth.uid()` | Dono ou admin | Dono ou admin |
| `orcamentos` | Próprios + anônimos (placa match) + admin | Anônimo (`cliente_id IS NULL`) ou logado (`cliente_id = auth.uid()`) | Só admin | Só admin |

### Validação de CPF
- `frontend/src/lib/cpf.js` — algoritmo dos dígitos verificadores (mod 11).
- Bloqueia CPFs com todos os dígitos iguais (ex: `111.111.111-11`).
- Integrado no `Cadastro.jsx` — aborta signup se CPF inválido.

---

## 🔑 Contas Administrativas

- **E-mail:** `kadoshautocenter7@gmail.com`
- **Senha Atual:** `Zeepzada07.`
- **Permissão:** `is_admin = true` na tabela `clientes`.
- **CNPJ da Oficina:** `61.004.527/0001-89` (cadastrado no campo `cpf` da conta admin).

---

## 🧾 Integração de Notas Fiscais (Asaas)

O sistema está integrado com a API do **Asaas** para emissão de Notas Fiscais de Serviço (NFS-e).

### Funcionamento:
1. O backend (`server.js`) possui endpoints para cadastrar clientes no Asaas e agendar a emissão.
2. O ambiente é controlado pela variável `ASAAS_ENV` (`sandbox` ou `production`).
3. **Sandbox:** Utiliza a URL `api-sandbox.asaas.com`. Notas não têm valor fiscal.
4. **Custo:** R$ 0,49 por nota emitida (sem mensalidade).

### Próximos Passos (Produção):
- Alterar `ASAAS_ENV=production`.
- Inserir a `ASAAS_API_KEY` de produção.
- Configurar as informações fiscais da empresa no painel do Asaas (Certificado Digital, Série, etc).

---

## 📊 Schema do Banco de Dados (Supabase Postgres)

### Tabela `clientes`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID (PK, FK → auth.users) | Criada automaticamente pelo trigger |
| `nome` | TEXT | Nome legal (imutável pela UI) |
| `nome_social` | TEXT | Nome preferido, editável, usado na saudação |
| `cpf` | TEXT | Preenchido no cadastro, imutável pela UI |
| `email` | TEXT | Vinculado ao login, não editável |
| `whatsapp` | TEXT | Editável |
| `endereco` | TEXT | Editável |
| `is_admin` | BOOLEAN DEFAULT FALSE | Protegido por trigger anti-escalation |

### Tabela `veiculos`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL (PK) | |
| `cliente_id` | UUID (FK → auth.users) | |
| `placa` | TEXT | Formato ABC-1D23 |
| `marca` | TEXT | Preenchido via API de placa ou manualmente |
| `modelo` | TEXT | Idem |
| `ano` | TEXT | Idem |
| `is_principal` | BOOLEAN | Veículo principal do cliente |

### Tabela `orcamentos`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL (PK) | |
| `cliente_id` | UUID (FK, nullable) | NULL = orçamento anônimo (landing page) |
| `nome` | TEXT | |
| `email` | TEXT | |
| `telefone` | TEXT | |
| `whatsapp` | TEXT | |
| `cep` | TEXT | |
| `placa` | TEXT | |
| `servicoDesejado` | TEXT | Dropdown: Revisão / Motor / Suspensão / Estética / Outro |
| `descricao` | TEXT | |
| `dataAgendamento` | TEXT | Data + hora ou "Fora de Horário: motivo" |
| `avaliacaoSite` | TEXT | 1-5 (NPS caseiro) |
| `status` | TEXT | Gerenciado pelo admin |

### Tabela `atualizacoes_servico`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL (PK) | |
| `orcamento_id` | INTEGER (FK) | |
| `cliente_id` | UUID (FK, nullable) | |
| `foto_url` | TEXT | URL pública do Supabase Storage |
| `descricao` | TEXT | O que o mecânico fez |
| `created_at` | TIMESTAMP | |

### Tabela `avisos`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | SERIAL (PK) | |
| `url` | TEXT | URL da imagem do aviso/promoção (Supabase Storage) |
| `created_at` | TIMESTAMP | |

### Triggers & Functions
1. `handle_new_user()` — SECURITY DEFINER, chamada por trigger `on_auth_user_created` em `auth.users`.
2. `prevent_is_admin_change()` — BEFORE UPDATE em `clientes`, bloqueia escalation.
3. `is_admin(uid UUID)` — Função helper SECURITY DEFINER para uso nas RLS policies.

---

## 🔗 Rotas da Aplicação

| Rota | Componente | Acesso |
|---|---|---|
| `/` | Landing Page (Hero + Avisos + Services + Gallery + BudgetForm + AboutUs) | Público |
| `/login` | Login.jsx | Público |
| `/cadastro` | Cadastro.jsx | Público |
| `/esqueci-senha` | ForgotPassword.jsx | Público |
| `/reset-password` | ResetPassword.jsx | Público |
| `/cliente` | ClientDashboard.jsx | Autenticado |
| `/admin` | AdminDashboard.jsx | Autenticado + `is_admin = true` |
| `/tv` | TvDashboard.jsx | Público (tela de TV da oficina) |

---

## 📡 Endpoints do Backend (server.js)

O servidor Express roda em `:3001` localmente. Em produção, está no Render e o Vercel faz rewrite de `/api/*`.

### `GET /api/placa/:placa`
- **Função:** Consulta dados do veículo pela placa.
- **Cascata:** SINESP → API Placas (apiplacas.com.br).
- **Timeout:** 5s por provedor.
- **Resposta:** `{ success, data: { placa, marca, modelo, ano, cor, municipio, uf, fonte } }`

### `POST /api/send-update-email`
- **Função:** Envia e-mail ao cliente quando o mecânico registra uma atualização de serviço (com foto opcional).
- **Body:** `{ clientEmail, clientName, carInfo, descricao, fotoUrl }`
- **Serviço:** Resend (`onboarding@resend.dev` — plano gratuito).
- **Template:** HTML inline, tema dark com branding Kadosh.

### `POST /api/send-budget-notification`
- **Função:** Notifica administradores quando um novo orçamento é recebido.
- **Body:** `{ nome, email, telefone, whatsapp, placa, servicoDesejado, descricao, dataAgendamento }`
- **Limitação atual:** Plano gratuito do Resend só permite envio para o dono da conta (`isaqueduarte07@gmail.com`). O código para buscar todos os admins do Supabase está **pronto, mas comentado** — descomentar quando verificar domínio próprio no Resend.

### `GET /api/status`
- **Função:** Health check que mostra status dos provedores de placa configurados.

---

## ⚙️ Variáveis de Ambiente

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=                          # Vazio em dev (usa proxy Vite), URL do Render em prod
```

### Backend (`frontend/.env` — mesmo arquivo, lido pelo `server.js`)
```env
RESEND_API_KEY=re_...                  # Chave da API Resend para envio de e-mails
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Service role key (bypassa RLS, usado para buscar admins)
API_PLACAS_TOKEN=                      # Token da apiplacas.com.br (opcional, fallback)
ASAAS_API_KEY=                         # Chave da API do Asaas
ASAAS_ENV=sandbox                      # 'sandbox' ou 'production'
```

### Render (variáveis de ambiente no dashboard)
```
RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ASAAS_API_KEY, ASAAS_ENV
```

---

## 🏗️ Features Implementadas (Detalhado)

### 1. Landing Page Pública
- **Hero** com detecção de sessão (botão muda entre "Minha Área" e "Área do Cliente").
- **Carrossel de Avisos** (dados da tabela `avisos` no Supabase, auto-play a cada 8s, botões prev/next, indicadores clicáveis).
- **Seção de Serviços** oferecidos.
- **Galeria** estática (grid 4 fotos `foto1-4.jpeg`).
- **Formulário de Orçamento** público (anônimo ou logado): máscaras de WhatsApp/CEP/Placa, validação, checkbox "fora de horário", dropdown de horários, dispara notificação e-mail para admin.
- **Sobre Nós** com links para redes sociais + WhatsApp.

### 2. Sistema de Autenticação Completo
- Login, Cadastro (com validação de CPF), Esqueci Senha, Redefinir Senha.
- Sessão persistente (detectada em `Hero.jsx` e `Login.jsx`).
- Trigger auto-cria perfil no cadastro.

### 3. Dashboard do Cliente (`/cliente`)
- **Dados pessoais** com edição inline (nome social, WhatsApp, endereço). Nome legal, CPF e e-mail são read-only.
- **Gestão de veículos**: adicionar por placa (consulta API), remover, marcar como principal.
- **Solicitar serviço**: mini-form pré-preenchido com dados do perfil e dropdown dos veículos cadastrados.
- **Histórico de serviços**: lista com badge de prioridade, ordenado por prioridade desc → id desc.

### 4. Painel Administrativo (`/admin`)
- **Login via Supabase Auth** (senha hardcoded foi removida). Verifica `is_admin` após login, faz `signOut` se não for admin.
- **Lista de orçamentos**: busca textual + filtros por prioridade (EXTREMA/ALTA/MÉDIA/BAIXA) com contadores.
- **Sistema de prioridade automática** (`prioridade.js`): 4 níveis com keyword matching + fallback por categoria. Calculada on-the-fly (não persistida).
- **Ações por orçamento**: mudar status, gerar PDF, upload de foto com notificação, consultar veículo, emitir NF.
- **Geração de PDF profissional** (`PDFGenerator.jsx`): header com dados da oficina, auto-fill de CPF/veículo/endereço via `cliente_id`, bloco de prioridade colorido, termos de garantia.

### 5. Upload de Fotos + Notificação (`UpdatePhotoModal.jsx`)
- Mecânico seleciona foto + escreve descrição do que foi feito.
- Foto é enviada ao Supabase Storage (bucket `fotos_servico`).
- Registro salvo na tabela `atualizacoes_servico`.
- E-mail automático enviado ao cliente via Resend com a foto embedded e link para o painel.

### 6. Emissão de Nota Fiscal (`InvoiceModal.jsx`)
- Integração funcional com Asaas para emissão de NFS-e.

### 7. Modo TV (`/tv`)
- Carrossel fullscreen para exibição na TV da oficina.
- Busca avisos do Supabase, troca a cada 10s, recarrega a cada 5 min.
- Indicadores de progresso (pontinhos).

### 8. Consulta de Placas
- Servidor Express com cascata SINESP → API Placas.
- `placaApi.js` no frontend trata erros de JSON, body vazio, servidor offline.
- Timeout de 5s por provedor.

---

## 📋 Pendências & TODO

### 🔴 Prioridade Alta
1. **Verificar domínio no Resend** — para poder enviar e-mails para qualquer admin (hoje limitado ao dono da conta).

### 🟡 Prioridade Média
2. **Reativar confirmação de e-mail** no Supabase com SMTP próprio (Resend ou SendGrid) + template customizado.

### 🟢 Prioridade Baixa / Cleanup
6. ~~**Corrigir link do TikTok** em `AboutUs.jsx`~~ — ✅ CONCLUÍDO. Já aponta para `@kadosh.auto.center`.
7. ~~**Remover pasta `oficina-kadosh/tools/`**~~ — ✅ CONCLUÍDO. Pasta já removida.
8. **Descomentar busca dinâmica de admins** no endpoint `send-budget-notification` (linhas 368-373 do `server.js`) quando verificar domínio no Resend.

---

## 💡 Como Rodar Localmente

```bash
cd frontend/

# Terminal 1 — Backend (APIs de placa + e-mails)
npm run server
# → Roda em http://localhost:3001

# Terminal 2 — Frontend (React + Vite)
npm run dev
# → Roda em http://localhost:5173 (proxy /api → :3001)
```

### Pré-requisitos
- Node.js instalado
- Arquivo `frontend/.env` configurado com as variáveis do Supabase e Resend
- `npm install` já rodado em `frontend/`

---

## 🚀 Deploy

### Frontend → Vercel
- Projeto conectado ao repo.
- `vercel.json` faz rewrite: `/api/*` → `https://kadosh-auto-center.onrender.com/api/$1`.
- Variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### Backend → Render
- Serviço Web rodando `node server.js` a partir de `frontend/`.
- Variáveis de ambiente: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `API_PLACAS_TOKEN`.

---

## 📝 Decisões de Design Importantes

1. **Prioridade on-the-fly**: Não é persistida no banco. Calculada sempre que exibida. Vantagem: ajustar regras reclassifica orçamentos antigos automaticamente.
2. **Nome social vs legal**: `nome` (legal, imutável) é usado no PDF (documento oficial). `nome_social` (editável) é usado na saudação e exibição.
3. **Orçamentos anônimos**: Qualquer visitante pode submeter um orçamento sem cadastro. Se estiver logado, `cliente_id` é anexado automaticamente (spread condicional).
4. **Regra "OU" no histórico do cliente**: Mostra orçamentos com `cliente_id = meu_id` OU (`cliente_id IS NULL` AND placa é minha). Permite reivindicar orçamentos feitos como anônimo antes do cadastro.
5. **E-mail de notificação fire-and-forget**: O `BudgetForm` dispara o `fetch` para `/api/send-budget-notification` sem `await` — o sucesso do insert não depende do e-mail ser enviado.
6. **CPF validado localmente**: Não consulta Receita Federal (precisaria API paga). Só valida algoritmicamente os dígitos verificadores — suficiente para evitar erros de digitação.
