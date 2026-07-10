# Documentação do Módulo de Fluxo de Caixa

Este documento descreve detalhadamente o módulo de **Fluxo de Caixa Diário e Consolidado** desenvolvido para o painel administrativo da **Oficina Kadosh Auto Center**.

---

## 📋 Sumário
1. [Visão Geral](#1-visão-geral)
2. [Interface e Funcionalidades](#2-interface-e-funcionalidades)
3. [Automação e Regras de Negócio](#3-automação-e-regras-de-negócio)
4. [Persistência de Rascunho (Auto-save)](#4-persistência-de-rascunho-auto-save)
5. [Integração e Organização no Google Drive](#5-integração-e-organização-no-google-drive)
6. [Painel Consolidado Mensal/Anual](#6-painel-consolidado-mensalanual)
7. [Guia de Configuração (Passo a Passo)](#7-guia-de-configuração-passo-a-passo)
8. [Estrutura de Arquivos Modificados](#8-estrutura-de-arquivos-modificados)

---

## 1. Visão Geral
O módulo substitui o controle manual e manuscrito de fechamento diário realizado pelos colaboradores. Ele centraliza:
- Registro de todas as **Entradas** e **Saídas** do dia.
- Divisão dos saldos em três contas financeiras reais da empresa: **Fundo de Caixa (Romanos)**, **Dinheiro na Empresa (Cofre)** e **Fundo de Reserva (Kadosh)**.
- Geração automática de relatórios em **PDF**.
- Salvamento automático do PDF em subpasta dedicada no **Google Drive**.
- Visualização e histórico consolidado acumulado mês a mês dos últimos 5 anos.

---

## 2. Interface e Funcionalidades
O painel administrativo está dividido em duas abas integradas:
- **📝 Fechamento Diário**: Onde o operador insere os dados do dia corrente.
- **📊 Consolidado Mensal / Anual**: Onde se visualiza os relatórios agrupados de meses e anos com gráficos de barras rápidos.

---

## 3. Automação e Regras de Negócio

### Entradas (Mapeamento de Contas)
As entradas possuem duas colunas de seleção: **Método de Pagamento** e **Para Onde Foi**.
- Se o método for **Dinheiro**, o destino é travado automaticamente como **Caixa da Empresa** (bloqueado em cinza para o operador).
- Para outros métodos (PIX, Cartões, Banco), o operador pode selecionar se o valor foi para a conta **Mercado Pago KADOSH** ou **Mercado Pago ROMANOS**.
- **Destinação e Cálculo**:
  - `Mercado Pago ROMANOS` -> Direcionado para o **Fundo de Caixa (Romanos)**.
  - `Caixa da Empresa` -> Direcionado para o **Dinheiro na Empresa (Cofre)**.
  - `Mercado Pago KADOSH` -> Direcionado para o **Fundo de Reserva (Kadosh/Bancos)**.

### Saídas (Origem)
O operador informa de qual conta o dinheiro foi retirado na coluna **De Onde Saiu**:
- **Mercado Pago KADOSH**, **Mercado Pago ROMANOS** ou **Caixa da Empresa**.

### Conciliação de Saldos
No fechamento do dia, o sistema calcula os saldos **Esperados** com base nas fórmulas:
$$\text{Saldo Esperado} = \text{Saldo Anterior} + \text{Entradas na Conta} - \text{Saídas da Conta}$$

O operador digita o saldo **Final Declarado** fisicamente. Um botão prático permite preencher os valores esperados automaticamente com um clique para economizar tempo.

---

## 4. Persistência de Rascunho (Auto-save)
Para evitar perda de dados por fechamento acidental do navegador ou oscilação de internet:
- O formulário inteiro é salvo automaticamente no `localStorage` em tempo real.
- O botão **☀️ Iniciar Novo Dia** limpa os rascunhos antigos e herda automaticamente os saldos finais declarados do último fechamento como os novos saldos iniciais (Anteriores) do dia corrente.

---

## 5. Integração e Organização no Google Drive
Ao clicar no botão verde **Salvar Fechamento**:
1. Os dados são salvos no banco de dados (Supabase).
2. O PDF é gerado no navegador e enviado ao backend (`server.js`).
3. O backend verifica se a variável `GOOGLE_DRIVE_FLUXO_CAIXA_FOLDER_ID` está definida.
   - Se sim, ele envia o PDF diretamente para a subpasta correta de Fluxo de Caixa.
   - Se não, ele pesquisa se a pasta `FLUXO DE CAIXA` existe na pasta pai. Caso não exista, ele a cria automaticamente sob demanda.

---

## 6. Painel Consolidado Mensal/Anual
Apresenta relatórios consolidados em tempo real:
- Exibe o acumulado anual de Entradas, Saídas e Saldo Líquido do ano selecionado.
- Gráficos visuais mês a mês de Janeiro a Dezembro mostrando a proporção entre entradas e saídas.
- Suporta navegação histórica de até 5 anos.

---

## 7. Guia de Configuração (Passo a Passo)

### Configurar a Subpasta do Google Drive no Render:
Para fazer com que os PDFs caiam diretamente dentro da pasta específica de **FLUXO DE CAIXA** no Drive:
1. Acesse o painel do seu serviço web do backend no [Render.com](https://render.com).
2. Vá em **Settings** > **Environment** > **Environment Variables**.
3. Adicione uma nova variável de ambiente:
   - **Key:** `GOOGLE_DRIVE_FLUXO_CAIXA_FOLDER_ID`
   - **Value:** `1swePj9-0w7IIk70Xwxr49p7Fer4iwpEd`
4. Clique em **Save Changes**. O Render vai reiniciar o servidor e aplicar a configuração.

---

## 8. Estrutura de Arquivos Modificados

- **[FluxoCaixa.jsx](file:///c:/Users/isaqu/Desktop/automacao/oficina-kadosh/frontend/src/components/Admin/FluxoCaixa.jsx)**: Componente principal do painel. Gerencia estados de inputs, localStorage, cálculos, abas e lógica de submissão.
- **[FluxoCaixaPDF.jsx](file:///c:/Users/isaqu/Desktop/automacao/oficina-kadosh/frontend/src/components/Admin/FluxoCaixaPDF.jsx)**: Template de geração de PDF usando `@react-pdf/renderer`.
- **[server.js](file:///c:/Users/isaqu/Desktop/automacao/oficina-kadosh/frontend/server.js)**: Rota `/api/drive/upload` atualizada para ler a variável de ambiente e organizar em subpastas.
