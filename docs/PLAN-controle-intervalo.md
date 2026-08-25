# 📋 PLAN: Módulo Janta & Ponto (Controle de Equipe Interna)

**Slug**: `controle-intervalo`  
**Status**: 🟢 Aprovado pelo Usuário — Pronto para Implementação

---

## 🎯 1. Especificações Confirmadas

1. **Nome da Aba no Menu**: `Janta & Ponto` (ou ícone com rótulo Janta & Ponto).
2. **Posicionamento**: Exatamente entre as abas **Roteirista** e **Pagamento** no Header (`Layout.tsx`), com estilo e destaque visual especial.
3. **Público**: Funcionários internos da loja (pizzaiolos, atendentes, cozinha, forno, etc.), 100% isolado dos motoboys, separado por unidade e franquia.
4. **Campos de Cadastro do Funcionário**:
   - `Nome`
   - `Cargo / Função`
   - `Ativo / Inativo`
5. **Fluxo Operacional Diário (1 Toque)**:
   - 🟢 **1. Check-in (Chegada)**: Funcionário chega e clica em seu card com 1 toque. Registra o horário exato de chegada.
   - 🟡 **2. Saída para Janta**: Ao sair para jantar, clica para marcar a saída. O card entra em status "Em Janta" com um **cronômetro rodando em tempo real** (`00:23 min`).
   - 🔵 **3. Retorno da Janta**: Ao voltar, clica em retornar. O sistema calcula e salva a duração total do intervalo.
6. **Encerramento / Reset Diário**:
   - O reset diário existente nas configurações encerra o turno do dia, consolida no histórico e prepara o painel limpo para o próximo dia útil.
7. **Planilha / Tabela de Relatório**:
   - Colunas: **Data / Dia**, **Funcionário**, **Cargo**, **Horário de Chegada (Check-in)**, **Horário de Saída (Janta)**, **Horário de Retorno**, **Tempo Total de Janta**.
   - Filtros por data (Hoje, 7 dias, Mês, Personalizado), busca por funcionário/cargo.
   - Botão para exportar/baixar em **Excel (.xlsx)** e **CSV**.
8. **Permissões**:
   - Operadores e Admins da respectiva unidade/franquia podem cadastrar funcionários e registrar os pontos.

---

## 🧱 2. Plano de Arquitetura Técnica

### 🗄️ A. Banco de Dados (Supabase Migration)
Criar migração SQL com as tabelas:
- `funcionarios_internos`:
  - `id` (uuid, primary key)
  - `franquia_id` (uuid)
  - `unidade` (text)
  - `nome` (text)
  - `cargo` (text)
  - `ativo` (boolean default true)
  - `created_at` (timestamptz)
- `registros_ponto_intervalo`:
  - `id` (uuid, primary key)
  - `funcionario_id` (uuid, references funcionarios_internos)
  - `franquia_id` (uuid)
  - `unidade` (text)
  - `data_referencia` (date)
  - `checkin_at` (timestamptz)
  - `saida_janta_at` (timestamptz)
  - `retorno_janta_at` (timestamptz)
  - `tempo_total_janta_minutos` (integer)
  - `status` (text: 'ausente', 'trabalhando', 'em_janta', 'finalizado')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### 🎨 B. Frontend & Interface
1. **Layout & Rotas**:
   - Inserir a rota `/janta-ponto` (ou `/intervalo`) em `App.tsx` e `routeChunks.tsx`.
   - Adicionar o item no `navItems` do `src/components/Layout.tsx` entre `Roteirista` e `Pagamento`, estilizado com destaque e ícone (ex: `UtensilsCrossed` ou `Clock`).
2. **Página Principal `src/pages/JantaPonto.tsx`**:
   - **Cabeçalho da Página**: Título, data atual, botão de "Cadastrar Funcionário", botão de "Ver Planilha / Relatório".
   - **Grid de Cards de Funcionários**:
     - Card com foto/iniciais, nome, cargo, status visual.
     - Botão dinâmico conforme o estado atual:
       - Se *Não Chegou*: Botão verde `Cheguei (Check-in)`.
       - Se *Trabalhando*: Botão amarelo `Sair para Janta`.
       - Se *Em Janta*: Cronômetro ativo em tempo real (`Jantando há XX min`) + Botão azul `Retornar da Janta`.
       - Se *Janta Concluída*: Indicador `Janta Realizada (XX min)`.
3. **Modal de Cadastro de Funcionário**:
   - Cadastro simples e rápido: Nome e Cargo.
   - Lista para editar ou desativar funcionários da unidade.
4. **Aba / Modal de Planilha e Relatório**:
   - Tabela organizada com ordenação e filtros.
   - Exportação XLSX / CSV com data, horários formatados (HH:mm) e tempo total calculado.
5. **Integração com Reset Diário**:
   - Adicionar rotina na função de reset para atualizar o status dos registros de ponto abertos para o dia anterior e preparar o novo dia.
