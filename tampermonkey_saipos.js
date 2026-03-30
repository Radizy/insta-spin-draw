// ==UserScript==
// @name         Integração SAIPOS x FilaLab (Leitura Dinâmica)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extração passiva de pedidos Kanban e Retorno Automático - DOM atualizado
// @match        https://conta.saipos.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 [FILALAB SAIPOS] Iniciado em Modo Leitura!");

    // ==========================================
    // CONFIGURAÇÕES INJETADAS PELO FILALAB
    // ==========================================
    const LOJA_NOME = "{{NOME_DA_LOJA}}"; 
    const WEBHOOK_URL = "{{WEBHOOK_URL}}";
    const API_KEY = "{{API_KEY}}"; 

    // Estado local para evitar spam de rede
    let cacheCozinhaAguardando = ""; 
    let motoboysNaRuaCache = [];

    function scanKanban() {
        if (!window.location.hash.includes("/kanban/search-customer")) return;

        const mainContainer = document.querySelector('div.scrollbar[scrollable="true"]');
        if (!mainContainer) {
            console.log("[FILALAB] ⚠️ Container do Kanban não encontrado.");
            return;
        }

        const children = Array.from(mainContainer.children);
        
        let inCozinha = false;
        let inAguardando = false;
        let inSaiu = false;

        const pedidosAtivos = [];
        const motoboysNaRuaSet = new Set();
        let filaCount = 0;

        // Palavras-chave que identificam um label como CABEÇALHO DE SEÇÃO (não como pedido)
        // O Saipos mudou a estrutura: agora ambos (seções e pedidos) usam label.p-l-25
        const SECAO_KEYWORDS = ['cozinha', 'aguardando entrega', 'saiu para entrega', 'cancelado', 'encerrado', 'retirada'];

        children.forEach(el => {
            const tagName = el.tagName.toLowerCase();
            const isLabelPl25 = tagName === 'label' && el.classList.contains('p-l-25');
            const textContent = (el.textContent || '').trim().toLowerCase();
            const innerText = (el.innerText || '').trim();

            // === DETECTAR CABEÇALHO DE SEÇÃO ===
            // Cabeçalhos: texto curto contendo palavras-chave de status, com até 3 linhas
            // Pedidos: primeira linha no formato "123 - Nome Cliente"
            const isSecao = isLabelPl25 
                && SECAO_KEYWORDS.some(kw => textContent.includes(kw)) 
                && innerText.split('\n').length <= 3
                && !/^\d+/.test(innerText.trim()); // cabeçalho não começa com número

            // Suporte legado: h3 tags (caso o Saipos reverta)
            if (isSecao || tagName === 'h3' || el.querySelector('h3')) {
                inCozinha = textContent.includes('cozinha');
                inAguardando = textContent.includes('aguardando entrega');
                inSaiu = textContent.includes('saiu para entrega');
                return;
            }

            // === PROCESSAR CARD DE PEDIDO ===
            if (isLabelPl25 && (inCozinha || inAguardando || inSaiu)) {
                const linhas = innerText.split('\n').map(l => l.trim()).filter(l => l);
                
                if (linhas.length === 0) return;

                const primeiraLinha = linhas[0];
                // Pedidos têm formato "123 - Nome Cliente" na primeira linha
                const matchPedido = primeiraLinha.match(/^(\d+[\w]?)\s*[-–]\s*(.+)/);
                
                if (!matchPedido) return; // Não é um card de pedido, pula

                const idPedido = matchPedido[1].trim();
                const nomeCliente = matchPedido[2].trim();
                
                if (inCozinha || inAguardando) {
                    filaCount++;
                    let enderecoStr = "";
                    linhas.forEach(linha => {
                        // Endereço: linha longa sem valores monetários, datas, "Nº" ou número de pedido
                        if (
                            linha.length > 15 
                            && !linha.includes('R$') 
                            && !linha.includes('/') 
                            && !linha.includes('Pago') 
                            && !linha.includes('Nº')
                            && !/^\d+[-–]/.test(linha)
                        ) {
                            enderecoStr = linha;
                        }
                    });

                    pedidosAtivos.push({
                        id: idPedido,
                        id_interno: idPedido,
                        comanda: idPedido,
                        cliente: nomeCliente,
                        endereco: enderecoStr,
                        status: inCozinha ? "Cozinha" : "Aguardando"
                    });
                }

                if (inSaiu) {
                    el.querySelectorAll('span').forEach(span => {
                        if (span.innerHTML.includes('Entregador:')) {
                            const nomeMatch = span.textContent.replace('Entregador:', '').trim();
                            const motoboyPuro = nomeMatch.split('\n')[0].trim();
                            if (motoboyPuro) motoboysNaRuaSet.add(motoboyPuro);
                        }
                    });
                }
            }
        });

        console.log(`[FILALAB] 📊 Scan: ${pedidosAtivos.length} pedidos (Cozinha+Aguardando), ${motoboysNaRuaSet.size} motoboys na rua.`);

        const hashAtual = JSON.stringify(pedidosAtivos);
        if (hashAtual !== cacheCozinhaAguardando) {
            cacheCozinhaAguardando = hashAtual;
            console.log(`[FILALAB] 📤 Enviando ${pedidosAtivos.length} pedidos...`);
            enviarAPI({
                action: 'update_kanban',
                loja: LOJA_NOME,
                pedidos_fila: pedidosAtivos,
                entregas_na_fila: filaCount
            });
        } else {
            console.log("[FILALAB] ✅ Sem mudanças, nenhum envio necessário.");
        }

        const motoboysNaRuaList = Array.from(motoboysNaRuaSet);
        
        motoboysNaRuaCache.forEach(antigoMotoboy => {
            if (!motoboysNaRuaList.includes(antigoMotoboy)) {
                console.log(`🛎️ [FILALAB] Motoboy ${antigoMotoboy} retornou!`);
                enviarAPI({
                    action: 'motoboy_returned',
                    loja: LOJA_NOME,
                    motoboy: antigoMotoboy
                });
            }
        });

        motoboysNaRuaCache = motoboysNaRuaList;
    }

    function enviarAPI(payload) {
        GM_xmlhttpRequest({
            method: "POST",
            url: WEBHOOK_URL,
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                console.log("[FILALAB] API resp:", response.status, response.responseText.slice(0, 100));
            },
            onerror: function(error) {
                console.error("[FILALAB] Erro no envio:", error);
            }
        });
    }

    let timerID = null;
    function startObserver() {
        const targetNode = document.querySelector('body');
        if (!targetNode) {
            setTimeout(startObserver, 1000);
            return;
        }

        // MutationObserver para detectar mudanças no DOM
        const observer = new MutationObserver(function() {
            if (window.location.hash.includes("/kanban/search-customer")) {
                clearTimeout(timerID);
                timerID = setTimeout(scanKanban, 1500);
            }
        });

        observer.observe(targetNode, { childList: true, subtree: true, characterData: true });
        console.log("👁️ [FILALAB SAIPOS] Observer Ativado.");

        // Polling de segurança a cada 15s — garante envio mesmo sem mutações
        setInterval(() => {
            if (window.location.hash.includes("/kanban/search-customer")) {
                scanKanban();
            }
        }, 15000);

        // Faz um scan inicial imediato se já estiver no Kanban
        if (window.location.hash.includes("/kanban/search-customer")) {
            setTimeout(scanKanban, 2000);
        }
    }

    setTimeout(startObserver, 3000);
})();
