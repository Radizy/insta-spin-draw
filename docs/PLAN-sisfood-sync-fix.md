# 📋 PLAN: Correção das Baixas no Sisfood (Simples e Direto)

**Slug**: `sisfood-sync-fix`  
**Status**: 🟡 Aguardando sua aprovação para começar  
**Loja de Teste**: Itaquaquecetuba (depois expandimos para as outras)

---

## 🔒 1. Confirmação sobre o Isolamento entre Lojas

> **SIM, o isolamento continua 100% seguro!**  
> Cada loja tem um código único (`unidade_id`) no banco de dados.  
> O script de Itaquá só lê comandos de Itaquá. O de Suzano só lê Suzano. O de Poá só lê Poá.  
> **Não há nenhum risco de uma loja puxar ou baixar pedidos de outra.**

---

## 🔍 2. O que está acontecendo hoje (Em palavras simples)

1. **Apressar a digitação da comanda**:
   - O Sisfood demora cerca de 10 segundos para recarregar a tela dele.
   - O operador digita no FilaLab a comanda antes desse tempo.
   - O FilaLab não acha o código secreto longo do Sisfood e manda só o número digitado (ex: `45`). O Sisfood não entende ou baixa outro pedido velho que tinha esse número.

2. **Pedido saindo sem motoboy**:
   - Se o script não achar o nome do motoboy na tela naquele segundo exato (por causa de um espaço, acento ou tela carregando), ele estava mandando o pedido para entrega **com o campo de motoboy vazio**. O Sisfood aceitava e despachava o pedido "órfão".

3. **Supabase mostra "EXECUTADO" mas não saiu**:
   - O script achava que qualquer resposta do Sisfood era sucesso, mesmo se o Sisfood tivesse dado erro de senha ou recusado a baixa.

---

## 🛠️ 3. O que vamos fazer para consertar (3 Passos)

### Passo 1: Trava de Segurança do Motoboy
- O script fica **proibido** de despachar qualquer pedido se não tiver o motoboy 100% confirmado.
- Se o motoboy não for achado na tela, o pedido **não sai sem motoboy**. O sistema avisa o erro em vez de fazer besteira.

### Passo 2: Espera Inteligente da Comanda
- Se o operador digitou uma comanda que ainda não apareceu na tela do Sisfood, o script não tenta chutar o número.
- Ele espera a tela do Sisfood piscar/atualizar (os 10 segundos normais), pega o código correto do pedido e aí sim despacha certinho.

### Passo 3: Avisador Visual na Tela do Sisfood (Mini Painel)
- Vamos colocar um quadradinho discreto no cantinho da tela do Sisfood que mostra:
  - 🟢 **Verde**: Conectado e funcionando.
  - Exemplo: *"Comanda #12 despachada para João (OK)"*.
  - 🔴 **Vermelho**: Se der algum problema (ex: *"Motoboy Pedro não encontrado no Sisfood"*).
  - Assim, quem estiver na loja sabe na hora se o pedido foi dado baixa ou não, sem precisar abrir o Supabase.

---

## 🚀 4. Como vamos aplicar (Sem quebrar a operação)

1. **Primeiro**: Atualizamos e testamos somente o script de **Itaquá** (`tampermonkey_ITAQUA.js`).  
   - ✅ **CONCLUÍDO (v12.0)**: Trava anti-órfão, resolução inteligente de comanda e Mini-HUD visual implementados e validados!
2. **Segundo**: Testar na loja de Itaquá instalando a v12.0 no Tampermonkey do navegador.
3. **Terceiro**: Com tudo aprovado e validado, replicamos para Suzano e Poá.

