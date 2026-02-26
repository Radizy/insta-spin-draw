
# 🔄 ATUALIZAÇÃO COMPLETA DO SISTEMA FILALAB

====================================================
1️⃣ RESET DE EXPEDIENTE (SUBSTITUI RESET DIÁRIO)
====================================================

## ❌ REMOVER COMPORTAMENTO ANTIGO

O botão "Reset Diário" NÃO deve mais:

- Excluir histórico
- Apagar entregas
- Limpar dados da unidade
- Excluir qualquer informação

---

## ✅ NOVO NOME

"Reset Diário" → "Reset de Expediente"

Local: Configurações

---

## 🎯 NOVO COMPORTAMENTO

Ao clicar em "Reset de Expediente":

1. NÃO excluir nenhum dado.
2. NÃO alterar histórico.
3. NÃO apagar registros.

Deve apenas:

- Desativar todos os motoboys ativos
- Se algum estiver com status "em_entrega":
    → Alterar status para "disponivel"
- Manter histórico intacto
- Manter analytics intacto

---

## 🔧 Lógica esperada

UPDATE entregadores
SET ativo = false;

UPDATE entregadores
SET status = 'disponivel'
WHERE status = 'em_entrega';

---

## 📌 Resultado

Após reset:

- Nenhum motoboy ativo
- Todos aguardando novo check-in
- Histórico preservado
- Sistema pronto para novo expediente

Primeiro motoboy deve clicar em:
"Check-in"

---

====================================================
2️⃣ BOTÃO "REMOVER DA FILA" NA ABA EM ENTREGA
====================================================

## 🎯 OBJETIVO

Adicionar botão:

"Remover da Fila"

Dentro da aba:
Em Entrega

---

## ✅ COMPORTAMENTO

Quando clicar em "Remover da Fila":

- Motoboy deve sair da aba "Em Entrega"
- Status deve mudar para: 'disponivel'
- Deve aparecer automaticamente na aba "Disponíveis"
- Mesmo padrão visual já existente
- Não excluir histórico
- Não apagar entregas anteriores

---

## 🔧 Lógica esperada

UPDATE entregadores
SET status = 'disponivel'
WHERE id = motoboy_id;

---

## �� REGRAS

- Não alterar entregas passadas
- Não apagar registro do dia
- Apenas mudar status atual

---

====================================================
3️⃣ ATUALIZAÇÃO — ANALYTICS PRO
====================================================

## ❗ PROBLEMA

Analytics Pro não permite filtro por horário.

---

## ✅ CORREÇÃO

Adicionar filtro completo:

- Data inicial
- Hora inicial
- Data final
- Hora final

Igual ao histórico padrão.

---

## 🎯 Exemplo de uso

01/02/2026 às 08:00
até
01/02/2026 às 18:30

---

## 🔧 Ajuste obrigatório

Substituir filtro simples por:

datetime_inicio
datetime_fim

Queries devem usar:

hora_saida BETWEEN datetime_inicio AND datetime_fim

---

## 🔐 REGRA CRÍTICA

Sempre filtrar por:

WHERE unidade_id = unidadeAtual

Nunca comparar unidades.
Nunca usar dados globais.

---

====================================================
4️⃣ MÓDULO — 🎓 MODO TREINAMENTO
====================================================

## 🎯 OBJETIVO

Botão:
🎓 Modo Treinamento

Quando ativado:

- Tutorial passo a passo
- Overlay explicativo
- Bloqueio de cliques fora do fluxo
- Destaque nos botões
- Dados 100% fictícios
- Nenhum impacto em produção

---

## 🔐 REGRAS

1. Não alterar dados reais.
2. Não salvar no histórico real.
3. Não impactar analytics.
4. Permitir sair a qualquer momento.
5. Exibir banner fixo:
   "Você está em ambiente de treinamento"

---

## 🧠 ESTRUTURA

Estado global:

isTrainingMode = true | false

Ao ativar:

- Criar motoboys fictícios
- Criar fila fictícia
- Simular entregas
- Bloquear acesso a dados reais

---

## 🎓 TREINAMENTO OPERADOR

### Tutorial 1 — Chamar Entrega

1. Clique em "Chamar o próximo"
2. Coloque quantidade de entrega
3. Selecione tipo de bag
4. Informe se tem bebida
5. Clique em "Chamar"

---

### Tutorial 2 — Mover para Em Entrega

Clique em Ações
Clique em "Mover para Em Entrega"

---

### Tutorial 3 — Remover da Fila

Clique em "Remover da fila"

---

### Tutorial 4 — Reset de Expediente

Clique em Configurações
Clique em "Reset de Expediente"

Sistema apenas simula ação.

---

## 🎉 FINAL

Exibir:

🎉 Parabéns, você concluiu o treinamento básico!

Botão:
"Finalizar Treinamento"

Desativar modo treinamento.

---

====================================================
✅ RESULTADO FINAL ESPERADO
====================================================

✔ Reset seguro sem apagar dados  
✔ Histórico preservado  
✔ Analytics com filtro por data e hora  
✔ Botão remover da fila na aba Em Entrega  
✔ Mudança correta para status disponível  
✔ Tutorial guiado completo  
✔ Ambiente fictício isolado  
✔ Sistema mais profissional e seguro  

Stack:
React + TypeScript + Supabase

