# Plano de Automação Backend: Integração Sisfood

Este documento descreve o plano arquitetural para remover a dependência do Tampermonkey (Client-Side) e migrar a lógica de "Baixa de Pedidos" (Dispatch) do Sisfood 100% para o backend (Supabase Edge Functions).

## 🎯 Objetivo
Permitir que o sistema FilaLab envie comandos de baixa para o Sisfood automaticamente na nuvem, sem necessitar que a tela do Sisfood esteja aberta em um computador rodando scripts de navegador.

## 🛠️ Arquitetura Escolhida (Opção A)
**Engenharia Reversa da API Interna (HTTP Requests) via Supabase Edge Functions.**
- **Custo:** Gratuito (dentro da cota de 500k invocações/mês do Supabase Free).
- **Performance:** Instantâneo e levíssimo.
- **Isolamento:** Não afeta a CPU/RAM do banco de dados (PostgreSQL), pois roda no ambiente serverless (Deno Deploy) na borda do Supabase.

## 🔍 O Que Já Descobrimos (Baseado no `tampermonkey_ITAQUA.js`)
1. **Endpoint de Baixa:** O Sisfood utiliza a rota `[URL_BASE]/statusPedidosLote`.
2. **Payload da Requisição:** Os dados enviados via POST (x-www-form-urlencoded) são:
   `pedidos={ID_DO_PEDIDO_CODIFICADO}&status=entrega&cod_motoboy={ID_INTERNO_DO_MOTOBOY}`
3. **Mapeamento de ID do Motoboy:** O Tampermonkey atualmente vasculha o HTML da página (as tags `<select>` e `<button>`) para encontrar o código interno do motoboy baseado no nome dele.

## ⚠️ O Que Falta Descobrir (Próximos Passos)
Para que o Supabase consiga realizar essa requisição na nuvem, ele precisa se autenticar (obter o *Cookie* de sessão do usuário logado) e ler a tela inicial para extrair os IDs internos dos motoboys.

**Ação Pendente (A cargo do Usuário):**
1. Abrir o Sisfood em uma aba anônima (ou sair da conta atual).
2. Abrir as Ferramentas de Desenvolvedor (F12) e ir na aba **Network (Rede)**.
3. Fazer o login manualmente.
4. Capturar e documentar:
   - A **URL de Login**.
   - O **Payload (Dados)** enviados no Login (provavelmente `username` e `password`).
   - Os **Headers** de resposta (para sabermos como o cookie de sessão, ex: `PHPSESSID`, é entregue).

## 🚀 Como a Edge Function Vai Funcionar (Fluxo Final)
Quando um pedido for despachado no FilaLab, a Edge Function será acionada e executará os seguintes passos em milissegundos:
1. **POST /login:** Envia as credenciais fixas e recebe o cookie de sessão ativo.
2. **GET /painel:** Usa o cookie para acessar o painel principal, lê o HTML e extrai dinamicamente o `cod_motoboy` desejado.
3. **POST /statusPedidosLote:** Envia a requisição de baixa com os IDs extraídos, completando o ciclo.
