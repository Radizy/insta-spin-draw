// ==UserScript==
// @name         Integração SAIPOS x FilaLab (Leitura Dinâmica)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Extração passiva de pedidos Kanban + Retorno Automático. Suporta estrutura HTML atual do Saipos.
// @match        https://conta.saipos.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 [FILALAB SAIPOS] Iniciado em Modo Leitura! v2.1");

    // ==========================================
    // CONFIGURAÇÕES INJETADAS PELO FILALAB
    // ==========================================
    const LOJA_NOME = "{{NOME_DA_LOJA}}"; 
    const WEBHOOK_URL = "{{WEBHOOK_URL}}";
    const API_KEY = "{{API_KEY}}"; 

    let cacheCozinhaAguardando = ""; 
    let motoboysNaRuaCache = [];

    // Palavras-chave de seções do Kanban
    const SECAO_KEYWORDS = ['cozinha', 'aguardando entrega', 'saiu para entrega', 'cancelado', 'encerrado'];

    // Encontra o container do Kanban com múltiplos fallbacks
    function findKanbanContainer() {
        // Seletor primário (classe + atributo)
        let c = document.querySelector('div.scrollbar[scrollable="true"]');
        if (c && c.children.length > 0) return c;

        // Fallback: sobe a partir de um label de seção conhecido
        const sectionLabel = Array.from(document.querySelectorAll('label.p-l-25')).find(el => {
            const t = el.textContent.trim().toLowerCase();
            return SECAO_KEYWORDS.some(kw => t.startsWith(kw));
        });
        if (!sectionLabel) return null;

        let parent = sectionLabel.parentElement;
        for (let i = 0; i < 8 && parent; i++) {
            if (parent.getAttribute('scrollable') || parent.classList.contains('scrollbar')) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    function scanKanban() {
        if (!window.location.hash.includes("/kanban/search-customer")) return;

        const mainContainer = findKanbanContainer();
        if (!mainContainer) {
            console.log("[FILALAB] ⚠️ Container do Kanban não encontrado.");
            return;
        }

        const pedidosAtivos = [];
        const motoboysNaRuaSet = new Set();
        let filaCount = 0;
        let currentSection = null;

        // Itera os filhos DIRETOS do container:
        // - label.p-l-25 com texto de seção → cabeçalho
        // - div (geralmente div.simplebar-scroll-content) → contém os cards de pedido
        const directChildren = Array.from(mainContainer.children);

        directChildren.forEach(el => {
            const tagName = el.tagName.toLowerCase();
            const textLower = (el.textContent || '').trim().toLowerCase();
            const innerText = (el.innerText || '').trim();

            // === DETECTAR CABEÇALHO DE SEÇÃO ===
            if (tagName === 'label' && el.classList.contains('p-l-25')) {
                const isSectionHeader = SECAO_KEYWORDS.some(kw => textLower.includes(kw))
                    && !innerText.match(/^\d+\s*[-–]/); // pedido começa com número

                if (isSectionHeader) {
                    if (textLower.includes('cozinha')) currentSection = 'Cozinha';
                    else if (textLower.includes('aguardando entrega')) currentSection = 'Aguardando';
                    else if (textLower.includes('saiu para entrega')) currentSection = 'Saiu';
                    else currentSection = null;
                    return;
                }
            }

            // === PROCESSAR WRAPPER DE PEDIDOS (div filho do container) ===
            if (tagName === 'div' && currentSection) {
                // Os cards de pedido estão DENTRO desse div (estrutura simplebar)
                const orderCards = el.querySelectorAll('label.p-l-25');
                
                orderCards.forEach(card => {
                    const cardText = (card.innerText || '').trim();
                    const linhas = cardText.split('\n').map(l => l.trim()).filter(l => l);
                    if (linhas.length === 0) return;

                    // Pedidos: primeira linha = "123 - Nome Cliente"
                    const matchPedido = linhas[0].match(/^(\d+[\w]?)\s*[-–]\s*(.+)/);
                    if (!matchPedido) return;

                    const idPedido = matchPedido[1].trim();
                    const nomeCliente = matchPedido[2].trim();

                    if (currentSection === 'Cozinha' || currentSection === 'Aguardando') {
                        filaCount++;
                        let enderecoStr = "";
                        linhas.forEach(linha => {
                            if (
                                linha.length > 15
                                && !linha.includes('R$')
                                && !linha.includes('/')
                                && !linha.includes('Pago')
                                && !linha.includes('Nº')
                                && !/^\d+\s*[-–]/.test(linha)
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
                            status: currentSection
                        });
                    }

                    if (currentSection === 'Saiu') {
                        card.querySelectorAll('span').forEach(span => {
                            if (span.innerHTML.includes('Entregador:')) {
                                const motoboy = span.textContent.replace('Entregador:', '').trim().split('\n')[0].trim();
                                if (motoboy) motoboysNaRuaSet.add(motoboy);
                            }
                        });
                    }
                });

                // Também verifica labels diretos dentro do div (caso não use simplebar)
                Array.from(el.children).forEach(child => {
                    if (child.tagName.toLowerCase() === 'label' && child.classList.contains('p-l-25')) {
                        const cardText = (child.innerText || '').trim();
                        const linhas = cardText.split('\n').map(l => l.trim()).filter(l => l);
                        if (linhas.length === 0) return;
                        const matchPedido = linhas[0].match(/^(\d+[\w]?)\s*[-–]\s*(.+)/);
                        if (!matchPedido) return;
                        // Já processado por querySelectorAll acima, evita duplicata
                    }
                });
            }
        });

        console.log(`[FILALAB] 📊 Scan: ${pedidosAtivos.length} pedidos, seção atual: ${currentSection}`);

        const hashAtual = JSON.stringify(pedidosAtivos);
        if (hashAtual !== cacheCozinhaAguardando) {
            cacheCozinhaAguardando = hashAtual;
            console.log(`[FILALAB] 📤 Enviando ${pedidosAtivos.length} pedidos...`, pedidosAtivos.map(p => p.cliente));
            enviarAPI({
                action: 'update_kanban',
                loja: LOJA_NOME,
                pedidos_fila: pedidosAtivos,
                entregas_na_fila: filaCount
            });
        } else {
            console.log("[FILALAB] ✅ Sem mudanças.");
        }

        const motoboysNaRuaList = Array.from(motoboysNaRuaSet);
        motoboysNaRuaCache.forEach(antigoMotoboy => {
            if (!motoboysNaRuaList.includes(antigoMotoboy)) {
                console.log(`🛎️ [FILALAB] ${antigoMotoboy} retornou!`);
                enviarAPI({ action: 'motoboy_returned', loja: LOJA_NOME, motoboy: antigoMotoboy });
            }
        });
        motoboysNaRuaCache = motoboysNaRuaList;
    }

    function enviarAPI(payload) {
        GM_xmlhttpRequest({
            method: "POST",
            url: WEBHOOK_URL,
            headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
            data: JSON.stringify(payload),
            onload: function(r) {
                console.log("[FILALAB] 📬 Resp:", r.status, r.responseText.substring(0, 120));
            },
            onerror: function(e) {
                console.error("[FILALAB] ❌ Erro:", e);
            }
        });
    }

    let timerID = null;
    function startObserver() {
        const targetNode = document.querySelector('body');
        if (!targetNode) { setTimeout(startObserver, 1000); return; }

        const observer = new MutationObserver(function() {
            if (window.location.hash.includes("/kanban/search-customer")) {
                clearTimeout(timerID);
                timerID = setTimeout(scanKanban, 1500);
            }
        });

        observer.observe(targetNode, { childList: true, subtree: true });
        console.log("👁️ [FILALAB SAIPOS] Observer Ativado.");

        // Polling a cada 15s como fallback
        setInterval(() => {
            if (window.location.hash.includes("/kanban/search-customer")) scanKanban();
        }, 15000);

        // Scan inicial após 3s
        setTimeout(scanKanban, 3000);
    }

    setTimeout(startObserver, 3000);
})();
