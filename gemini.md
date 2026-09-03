# 🏛️ Gemini — Constituição do Projeto Kadosh

---

## 🚀 QUICKSTART (leia primeiro)

### Stack atual
- **Frontend**: React 19 + Vite 8 + React Router v7 + Supabase JS (`@supabase/supabase-js`)
- **Backend (APIs)**: Express 5 em `oficina-kadosh/frontend/server.js` (ESM — `"type": "module"` no package.json)
- **Banco + Auth**: Supabase (`https://qrzqvvvscruohlgypmvb.supabase.co`)
- **E-mails**: Resend (notificações de orçamento → admin, atualizações de serviço → cliente)
- **PDFs**: `@react-pdf/renderer`
- **Consulta de placa**: SINESP (gratuito) → API Placas/wdapi2.com.br (paga, token configurado)
- **Cache**: Tabela `cache_placas` no Supabase (persistente, sem expiração)

### URLs de Produção
- **Frontend**: `https://kadosh-auto-center.vercel.app`
- **Backend**: `https://kadosh-auto-center.onrender.com`

### Como rodar localmente
A partir de `oficina-kadosh/frontend/`, em **2 terminais**:
```bash
# Terminal 1: Vite dev server (proxy /api → 3001)
npm run dev

# Terminal 2: Backend (APIs de placa + e-mails)
npm run server
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001 (status em `/api/status`)

`.env` está em `frontend/.env` com: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `API_PLACAS_TOKEN`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Estrutura de pastas
```
oficina-kadosh/
├── AI_HANDOVER.md          ← Documentação principal para continuidade
├── gemini.md               ← VOCÊ ESTÁ AQUI (constituição + quickstart)
├── findings.md             ← Schema, segurança, decisões, SQL rodado
├── task_plan.md            ← Checklist do que está feito vs pendente
├── progress.md             ← Log cronológico detalhado
├── modelo.png              ← Referência visual do layout do PDF
│
└── frontend/
    ├── server.js           ← Express: APIs de placa (c/ cache) + e-mails Resend
    ├── vercel.json          ← Rewrites /api/* → Render
    ├── package.json
    ├── .env                ← Variáveis de ambiente (NÃO commitado)
    ├── public/
    │   └── foto1-4.jpeg    ← Fotos da galeria estática
    │
    └── src/
        ├── App.jsx          ← Roteamento (react-router-dom)
        ├── main.jsx         ← Entry point
        ├── index.css        ← CSS global (variáveis, reset, tema dark)
        ├── App.css          ← CSS de layout e componentes
        │
        ├── config/
        │   └── oficina.js   ← Dados fixos da oficina (CNPJ, endereço, contatos)
        │
        ├── lib/
        │   ├── supabase.js  ← Client Supabase
        │   ├── placaApi.js  ← Helper consulta de placa (c/ tratamento de erros)
        │   ├── prioridade.js← Engine de classificação automática (4 níveis)
        │   └── cpf.js       ← Validação algorítmica de CPF
        │
        └── components/
            ├── Hero.jsx, AvisosCarousel.jsx, Services.jsx
            ├── Gallery.jsx, BudgetForm.jsx, AboutUs.jsx
            ├── ClientDashboard.jsx, TvDashboard.jsx
            ├── Auth/ (Login, Cadastro, ForgotPassword, ResetPassword)
            └── Admin/ (AdminDashboard, PDFGenerator, UpdatePhotoModal,
                        InvoiceModal, ViewVehicleModal)
```

### Rotas do app
| Rota | Componente | Acesso |
|---|---|---|
| `/` | Landing Page | Público |
| `/cadastro` | Cadastro.jsx | Público |
| `/login` | Login.jsx | Público |
| `/esqueci-senha` | ForgotPassword.jsx | Público |
| `/reset-password` | ResetPassword.jsx | Público |
| `/cliente` | ClientDashboard.jsx | Autenticado |
| `/admin` | AdminDashboard.jsx | Autenticado + `is_admin = true` |
| `/tv` | TvDashboard.jsx | Público (tela da oficina) |
| `/pacotes` | Pacotes.jsx | Público (Landing page de pacotes) |

### Admin atual
- Email: `kadoshautocenter7@gmail.com`
- UUID: `9993df3c-7955-47aa-9d87-1e7d3a6f252d`
- CNPJ: `61.004.527/0001-89`
- Para criar mais admins: criar usuário no Supabase Dashboard → Auth → Users, depois `UPDATE clientes SET is_admin = true WHERE id = '<uuid>'` no SQL Editor.

---

## 🔁 Como Retomar o Projeto (qualquer modelo/IA)

Se você é uma IA recém-chamada para continuar este projeto, **leia estes arquivos nesta ordem**:

1. **`AI_HANDOVER.md`** — Documentação principal completa (stack, schema, features, pendências)
2. **`gemini.md`** (este arquivo) — quickstart, constituição, regras
3. **`findings.md`** — Schema atualizado do Supabase, segurança (RLS), decisões
4. **`task_plan.md`** — Checklist do que está feito vs próximas tarefas
5. **`progress.md`** — Log cronológico detalhado

**Antes de mudar código**: confirme que o estado descrito ainda bate com o código atual.

**Sempre que terminar uma tarefa**: anote em `progress.md`, atualize `task_plan.md`, atualize `AI_HANDOVER.md` e `findings.md` se mudou schema/decisão.

---

## 1. Esquemas de Dados (referência histórica)

### Payload original do Formulário de Orçamento (Entrada — campos do BudgetForm)
```json
{
  "nome": "string",
  "email": "string",
  "telefone": "string",
  "whatsapp": "string",
  "cep": "string",
  "placa": "string",
  "servicoDesejado": "string",
  "descricao": "string",
  "avaliacaoSite": "string (Reutilizada sob o capô para progresso: 'passo | etapa')",
  "dataAgendamento": "string"
}
```

### ⚠️ ATENÇÃO: o destino mudou
A constituição original mandava enviar pro Google Sheets. **Hoje a persistência é no Supabase** (tabela `orcamentos`). Veja `findings.md` para o schema atual.

---

## 2. Regras Comportamentais

- **Design do Site**: Moderno, premium, focado em alta conversão. Tipografia legível, cores que passam confiança (tons escuros + destaque vermelho `#dc2743`), animações fluidas (glassmorphism, hover states).
- **Backend/Automação**: Requisições assíncronas, validação de dados.
- **Tratamento de Erro**: Frontend avisa o cliente educadamente; mensagens específicas (não engolir erro com "tente de novo").
- **Comunicação com o usuário (dono)**: Português brasileiro, informal, com opções claras quando há trade-offs. Pergunta antes de instalar pacotes pesados ou fazer ações destrutivas.

---

## 3. Invariantes Arquiteturais (estado real)

- **Não seguir mais** A.N.T 3-camadas estrita (gemini.md original mandava). Supabase substituiu Camada 3.
- LLMs **não** tomam decisões em runtime aqui — toda lógica é determinística.
- Frontend é Vite/React SPA.
- O servidor Express em `frontend/server.js` é o único componente backend (APIs de placa + e-mails).
- Deploy: Vercel (frontend) + Render (backend).

---

## 4. Convenções de código

- **Sem comentários WHAT** (só WHY quando não-óbvio).
- **JSX inline styles** dominam o projeto (não tem CSS modules ou Tailwind). Mantém o padrão.
- **Cores temáticas**: `#dc2743` (vermelho Kadosh), `#0a0505` (background dark), `#4ade80` (verde sucesso/CTA secundário), `#aaa` (texto auxiliar).
- **Glassmorphism**: classe `.glass` (em `index.css`).
- **Toda mudança de schema no Supabase** precisa ser registrada em `findings.md` (seção schema) E acompanhada das policies RLS necessárias.
- **Rastreamento de Progresso**: Para evitar falhas de migração pela falta da RPC `exec_sql`, reutilizamos a coluna `avaliacaoSite` na tabela `orcamentos` para empacotar o progresso em tempo real do veículo no formato `"passo | etapa"` (ex: `"2 | Desmontagem do motor"`). 
  - Passo 0: Recebido
  - Passo 1: Diagnóstico
  - Passo 2: Manutenção
  - Passo 3: Fase Final
  - Passo 4: Finalizado (quando status é "Finalizado")
- **Fluxo de Caixa & ErrorBoundary**: Abas do painel admin devem ser envolvidas em `<ErrorBoundary moduleName="...">` para prevenir tela preta no React 19. Sempre utilizar `safeArray()` e `formatIsoDate()` para ler listas e datas de lançamentos financeiros. O Extrato Geral (`subTab === 'extrato'`) unifica todos os lançamentos passados e o rascunho de hoje em lista plana para busca ágil.

---

## 5. Log de Manutenção

*(Histórico cronológico vive em `progress.md`. Resumo em `task_plan.md`.)*
