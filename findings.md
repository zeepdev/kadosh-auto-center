# 🔎 Findings

*Estado real do projeto, schema, restrições e contexto técnico.*

---

## Estado real vs. protocolo (atualizado em 2026-05-07)

O projeto evoluiu além da arquitetura A.N.T (3-camadas) descrita em `gemini.md`:
- **Supabase** absorveu as responsabilidades da Camada 3 (Tools): auth, persistência, queries, storage (bucket `avisos`) e envios de e-mails customizados via SMTP (Resend).
- O backend de consulta de placa está rodando no **Render.com**.
- O frontend está em produção na **Vercel** (`https://kadosh-auto-center.vercel.app/`).
- O servidor local ativo é `oficina-kadosh/frontend/server.js` (Express, consulta de placa em cascata).

---

## Schema atual do Supabase (verificado em 2026-05-07)

### `clientes`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK, FK → `auth.users.id` |
| `nome` | text | Nome legal (RG/CPF). Locked após cadastro |
| `nome_social` | text | Nome preferido (Lei 13.762/2016). Editável |
| `cpf` | text | Locked após cadastro |
| `whatsapp` | text | NOT NULL. Editável |
| `endereco` | text | Nullable. Editável |
| `is_admin` | bool | Default FALSE. Não-admin não pode mudar (trigger) |

### `veiculos`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | int | PK |
| `cliente_id` | UUID | FK → `clientes.id` |
| `placa` | text | |
| `marca`, `modelo`, `ano` | text | |
| `is_principal` | bool | |

### `orcamentos`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | int | PK |
| `created_at` | timestamptz | |
| `cliente_id` | UUID | Nullable. NULL = orçamento anônimo da landing |
| `nome`, `email`, `telefone`, `whatsapp`, `cep`, `placa` | text | Snapshot do form |
| `servicoDesejado`, `descricao`, `avaliacaoSite`, `dataAgendamento` | text | |
| `status` | text | Default `'Pendente'`. Outros: `'Agendado'`, `'Finalizado'` |

---

## Segurança no Supabase (RLS habilitado em 2026-05-07)

### Função utilitária
- `public.is_admin(uid)` — `SECURITY DEFINER`, bypassa RLS para checar `clientes.is_admin` sem recursão.

### Triggers
- `prevent_is_admin_change_trigger` (BEFORE UPDATE em `clientes`) — impede não-admin de alterar a própria flag `is_admin` (defesa contra escalation).
- `on_auth_user_created` (AFTER INSERT em `auth.users`) — chama `public.handle_new_user()` que auto-cria a row em `clientes` com nome/whatsapp vazios. O cadastro depois faz UPDATE.

### Policies por tabela

**`clientes`**:
- SELECT: própria row (`id = auth.uid()`) OU admin
- INSERT: só com `id = auth.uid()` (signup)
- UPDATE: própria row OU admin
- DELETE: só admin

**`veiculos`**:
- SELECT/UPDATE/DELETE: dono (`cliente_id = auth.uid()`) OU admin
- INSERT: só com `cliente_id = auth.uid()`

**`orcamentos`**:
- INSERT (anônimo, qualquer role): `cliente_id IS NULL` obrigatório
- INSERT (logado): `cliente_id = auth.uid()` OU `cliente_id IS NULL`
- SELECT: próprios + anônimos com placa do cliente (regra OU) + admin vê tudo
- UPDATE/DELETE: só admin

**Validado via curl com publishable key**: anônimo é bloqueado em todas tentativas de escalation; insert anônimo legítimo passa.

---

## Configurações / credenciais (importante pra continuar)

### Admin atual
- Email: `kadoshautocenter7@gmail.com`
- UUID: `9993df3c-7955-47aa-9d87-1e7d3a6f252d`
- `is_admin = true` em `clientes`
- Senha: somente o usuário (dono da oficina) sabe

### Email confirmation (Supabase Auth)
- **ATIVADO** (em Authentication → Providers → Email).
- A integração com `Cadastro.jsx` agora funciona perfeitamente mesmo com a confirmação ligada, pois o formulário repassa a responsabilidade de atualizar os dados do cliente e inserir o veículo para o backend `/api/complete-registration`, que utiliza a chave `SERVICE_ROLE` (bypassa o RLS).

### Tokens das APIs de placa
Em `oficina-kadosh/frontend/.env`:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — chaves do Supabase (publishable key formato `sb_publishable_*`)
- `API_BRASIL_TOKEN` — vazio (cadastro pendente)
- `PLACA_FIPE_TOKEN` — vazio (cadastro pendente)
- API Placas (apiplacas.com.br) — em análise no cadastro do usuário; quando liberado, integrar como provedor adicional na cascata + reduzir timeout de 10s → 5s.

---

## Provedores de placa (em `frontend/server.js`)

Cascata: SINESP → API Brasil → Placa FIPE.

- **SINESP** (via `sinesp-api` npm) — gratuito, sem token, **instável** (frequentemente fora do ar). Por isso a cascata existe.
- **API Brasil** (`gateway.apibrasil.io`) — pago, plano free com 100 req/dia, requer `API_BRASIL_TOKEN`.
- **Placa FIPE** (`api.placafipe.com.br`) — pago, requer `PLACA_FIPE_TOKEN`.

Cada chamada tem timeout de 10s; cascata acumula erros para diagnóstico.

---

## Histórico Recente de Entregas (Fase G - Implantação e Extras)

1. **Deploy Completo**: Frontend hospedado na Vercel com roteamento SPA configurado (`vercel.json`). API de consulta de placas rodando no Render.
2. **Sistema de "Esqueci Minha Senha"**: Fluxo finalizado com telas `/esqueci-senha` e `/reset-password`.
3. **E-mails Profissionais**: Supabase configurado com servidor SMTP do **Resend** (`onboarding@resend.dev`) disparando templates em HTML customizados (com logo e identidade visual Kadosh).
4. **Painel de TV (Digital Signage)**: Criada rota `/tv` em tela cheia para a recepção da oficina e carrossel na página inicial.
   - Banco de dados: bucket público `avisos` no Supabase Storage + tabela `avisos` para listagem.
   - Upload de artes feito diretamente pelo `/admin` de forma segura (RLS ativado para `storage.objects`).
5. **Correções Rápidas**: Link do TikTok arrumado (`@kadosh.auto.center`), botões com design "premium glass" vermelho, e botão de "Excluir Orçamento" inserido no painel de admin.

## Bugs/melhorias pendentes (priorizados, atualizados 2026-05-07)

1. **Conta admin atual sem CPF preenchido** — criada antes do trigger `handle_new_user`.
2. **API Placas** (apiplacas.com.br) — no backend do Render, a cascata SINESP -> API Placas já está implementada e funcional. Pode haver necessidade de reduzir o timeout se o SINESP estiver demorando demais.
3. **Limpeza de código** — A pasta `oficina-kadosh/tools/` (SQLite antigo) e as referências ao array de imagens estáticas em `Gallery.jsx` podem ser apagadas para limpar o repositório.

## Validações já implementadas

- **CPF**: `frontend/src/lib/cpf.js` exporta `validarCPF(cpf)` — dígitos verificadores + rejeita sequências repetidas. Usado em `Cadastro.jsx` antes do `signUp`. Não valida contra Receita Federal (precisaria API paga).
- **WhatsApp**: máscara `(XX) XXXXX-XXXX` em `BudgetForm.jsx` e no edit profile. Validação simples de comprimento (11 dígitos).
- **Placa**: máscara `AAA-0A00` em `BudgetForm.jsx`.
- **CEP**: máscara `00000-000` em `BudgetForm.jsx`.

---

## Decisões importantes (registro)

- **Filtro "OU" no histórico do cliente**: cliente vê orçamentos com `cliente_id = self` OR (`cliente_id IS NULL` AND `placa IN (suas placas)`). Permite "reivindicar" orçamentos anônimos antigos pela placa. Risco aceito: se o carro for vendido, o novo dono veria os orçamentos antigos do anterior.
- **Prioridade calculada on-the-fly** (não persistida): ajustes em `frontend/src/lib/prioridade.js` (palavras-chave / categorias) reclassificam orçamentos antigos automaticamente.
- **PDF usa nome legal** (não nome social): documento oficial precisa bater com RG/CPF. Nome social só aparece em UI/saudação.
- **CPF nunca editável pela UI**: definido no cadastro, fica para sempre. Validação algorítmica virá depois.
- **Dados fixos da oficina centralizados** em `frontend/src/config/oficina.js`. Mudar telefone/CNPJ futuramente = editar só esse arquivo.
