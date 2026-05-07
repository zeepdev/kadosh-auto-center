# 🔎 Findings

*Estado real do projeto, schema, restrições e contexto técnico.*

---

## Estado real vs. protocolo (atualizado em 2026-05-07)

O projeto evoluiu além da arquitetura A.N.T (3-camadas) descrita em `gemini.md`:
- **Supabase** absorveu as responsabilidades da Camada 3 (Tools): auth, persistência, queries. Não há mais Google Sheets nem SQLite.
- A pasta `oficina-kadosh/tools/` contém código **legado** (SQLite + Google Sheets em `tools/server.js`) que **não está mais em uso**. Pode ser removida em uma limpeza futura.
- O servidor ativo é `oficina-kadosh/frontend/server.js` (Express, consulta de placa em cascata).

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
- **DESLIGADO** atualmente (em Authentication → Providers → Email).
- Razão: com email confirmation ON, `signUp` não retorna sessão, e o UPDATE em `clientes` no `Cadastro.jsx` falha por RLS (auth.uid() é NULL).
- A reativação no futuro deve vir junto com SMTP próprio (SendGrid/Gmail) e template customizado.

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

## Bugs/melhorias pendentes (priorizados, atualizados 2026-05-07)

1. **Conta admin atual sem CPF preenchido** — criada antes do trigger `handle_new_user`. Recovery preencheu com strings vazias. Para consertar: editar a row direto pelo Supabase Table Editor preenchendo o CPF.
2. **API Placas** (apiplacas.com.br) — integrar quando token for liberado + reduzir timeouts.
3. **`Gallery.jsx`** — define array `images` que não é usado (renderiza só widget Elfsight). Limpar.
4. **Pasta `oficina-kadosh/tools/`** — código legado (SQLite + Sheets), não usado. Remover inteira.
5. **`AboutUs.jsx:20`** — link do TikTok aponta para `tiktok.com` genérico (sem URL real do perfil).
6. **Email confirmation** — quando reativar, customizar template + configurar SMTP próprio.
7. **Implantação (Fase G)** — projeto roda só local. Falta deploy.

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
