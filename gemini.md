# 🏛️ Gemini — Constituição do Projeto Kadosh

---

## 🚀 QUICKSTART (leia primeiro)

### Stack atual
- **Frontend**: React 19 + Vite + React Router v7 + Supabase JS (`@supabase/supabase-js`)
- **Backend (placa)**: Express em `oficina-kadosh/frontend/server.js` (CommonJS no `package.json` é ESM por causa de `"type": "module"` — usar `import 'dotenv/config'`).
- **Banco + Auth**: Supabase (`https://qrzqvvvscruohlgypmvb.supabase.co`)
- **PDFs**: `@react-pdf/renderer`
- **Plate lookup**: `sinesp-api` (instável) com fallback API Brasil → Placa FIPE.

### Como rodar localmente
A partir de `oficina-kadosh/frontend/`, em **2 terminais**:
```bash
# Terminal 1: Vite dev server (proxy /api → 3001)
npm run dev

# Terminal 2: API de placa
npm run server
```
- Frontend: http://localhost:5173
- API placa: http://localhost:3001 (status em `/api/status`)

`.env` está em `frontend/.env`. SINESP funciona sem token; API Brasil e Placa FIPE precisam de tokens (atualmente vazios).

### Estrutura de pastas
```
oficina-kadosh/
├── gemini.md              ← VOCÊ ESTÁ AQUI (constituição + quickstart)
├── findings.md            ← schema, segurança, decisões, bugs pendentes
├── task_plan.md           ← fases + checklist do que falta
├── progress.md            ← log cronológico do que foi feito
├── frontend/              ← APP REAL (React/Vite + Express de placa)
│   ├── src/
│   │   ├── App.jsx, main.jsx
│   │   ├── components/
│   │   │   ├── Hero.jsx, Services.jsx, Gallery.jsx, AboutUs.jsx
│   │   │   ├── BudgetForm.jsx          ← form da landing
│   │   │   ├── ClientDashboard.jsx     ← /cliente
│   │   │   ├── Auth/Login.jsx, Cadastro.jsx
│   │   │   └── Admin/AdminDashboard.jsx, PDFGenerator.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js     ← client init
│   │   │   ├── placaApi.js     ← chama /api/placa/:placa
│   │   │   └── prioridade.js   ← engine de classificação automática
│   │   └── config/
│   │       └── oficina.js      ← dados FIXOS da oficina (CNPJ, endereço, contatos)
│   ├── server.js          ← Express: cascata SINESP/API Brasil/Placa FIPE
│   ├── .env               ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, tokens
│   └── package.json       ← scripts: dev, server, build
└── tools/                 ← ⚠️ LEGADO. NÃO USE. SQLite + Google Sheets, descontinuado.
```

### Rotas do app
- `/` — landing (Hero + Services + Gallery + BudgetForm + AboutUs)
- `/cadastro` — registro de cliente (cria `auth.users` + UPDATE `clientes`)
- `/login` — login cliente (Supabase Auth)
- `/cliente` — dashboard do cliente (perfil, veículos, solicitar serviço, histórico)
- `/admin` — painel admin (lista orçamentos, mudar status, gerar PDF)

### Admin atual
- Email: `kadoshautocenter7@gmail.com`
- UUID: `9993df3c-7955-47aa-9d87-1e7d3a6f252d`
- Pra criar mais admins: criar usuário em Supabase Dashboard → Auth → Users, depois `INSERT INTO clientes (id, nome, whatsapp, is_admin) VALUES (...)` no SQL Editor (bypassa RLS porque é role `postgres`).

---

## 🔁 Como Retomar o Projeto (qualquer modelo/IA)

Se você é uma IA recém-chamada para continuar este projeto, **leia estes 4 arquivos nesta ordem**:

1. **`gemini.md`** (este arquivo) — quickstart, constituição, regras
2. **`findings.md`** — schema atualizado do Supabase, segurança (RLS), decisões importantes, bugs pendentes
3. **`task_plan.md`** — checklist do que está feito vs próximas tarefas
4. **`progress.md`** — log cronológico detalhado com referências `arquivo:linha`

**Antes de mudar código**: confirme que o estado descrito ainda bate com o código atual (o app evolui — coisas podem ter sido refatoradas entre sessões).

**Sempre que terminar uma tarefa**: anote em `progress.md` (com data ISO `YYYY-MM-DD`), atualize `task_plan.md` (marque ✅), atualize `findings.md` se mudou schema/decisão importante.

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
  "avaliacaoSite": "string",
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
- Frontend é Vite/React.
- O servidor de placa em `frontend/server.js` é o único componente Express vivo.
- Pasta `tools/` é legado abandonado (SQLite + Sheets) — pode ser removida em limpeza futura.

---

## 4. Convenções de código

- **Sem comentários WHAT** (só WHY quando não-óbvio).
- **JSX inline styles** dominam o projeto (não tem CSS modules ou Tailwind). Mantém o padrão.
- **Cores temáticas**: `#dc2743` (vermelho Kadosh), `#0a0505` (background dark), `#4ade80` (verde sucesso/CTA secundário), `#aaa` (texto auxiliar).
- **Glassmorphism**: classe `.glass` (em `index.css`).
- **Toda mudança de schema no Supabase** precisa ser registrada em `findings.md` (seção schema) E acompanhada das policies RLS necessárias.

---

## 5. Log de Manutenção

*(Histórico cronológico vive em `progress.md`. Resumo em `task_plan.md`.)*
