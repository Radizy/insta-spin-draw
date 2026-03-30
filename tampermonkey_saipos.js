// ==UserScript==
// @name         Integração SAIPOS x FilaLab (Leitura Dinâmica)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Extração passiva de pedidos Kanban + Retorno Automático. Totalmente agnóstico de classes CSS.
// @match        https://conta.saipos.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 [FILALAB SAIPOS] Iniciado em Modo Leitura! v3.0 (Agnóstico)");

    // ==========================================
    // CONFIGURAÇÕES INJETADAS PELO FILALAB
    // ==========================================
    const LOJA_NOME = "{{NOME_DA_LOJA}}"; 
    const WEBHOOK_URL = "{{WEBHOOK_URL}}";
    const API_KEY = "{{API_KEY}}"; 

    let cacheCozinhaAguardando = ""; 
    let motoboysNaRuaCache = [];

    const SECAO_KEYWORDS = ['cozinha', 'aguardando entrega', 'saiu para entrega'];

    // Novo sistema de busca de container baseada apenas no texto visível
    function findKanbanContainer() {
        const allElements = document.querySelectorAll('*');
        let headerEl = null;

        for (let el of allElements) {
            if (el.children.length > 2) continue; // Busca apenas folhas ou quase-folhas
            const txt = (el.textContent || '').trim().toLowerCase();
            if ((txt.startsWith('cozinha') || txt.startsWith('aguardando entrega')) && txt.length < 25) {
                headerEl = el;
                break;
            }
        }

        if (!headerEl) return null;

        // O container é o ancestral que agrupa MÚLTIPLAS colunas.
        // Ele deve conter tanto a palavra "cozinha" quanto "aguardando entrega" em seu texto.
        let parent = headerEl.parentElement;
        for (let i = 0; i < 10 && parent; i++) {
            if (parent.children.length >= 3) {
                const pText = (parent.textContent || '').toLowerCase();
                if (pText.includes('cozinha') && pText.includes('aguardando entrega')) {
                    // Prevenção extra: não retornar o body inteiro
                    if (parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
                        return parent;
                    }
                }
            }
            parent = parent.parentElement;
        }
        return null;
    }

    function scanKanban() {
        if (!window.location.hash.includes("/kanban/search-customer")) return;

        const mainContainer = findKanbanContainer();
        if (!mainContainer) {
            console.log("[FILALAB] ⚠️ Container do Kanban não encontrado (v3.0).");
            return;
        }

        const pedidosAtivos = [];
        const motoboysNaRuaSet = new Set();
        let filaCount = 0;
        let currentSection = null;

        // Limpa filhos de comentários ou nós de texto vazios para ficar com os elementos reais
        const directChildren = Array.from(mainContainer.children);

        directChildren.forEach(el => {
            const textLower = (el.textContent || '').trim().toLowerCase();
            const innerText = (el.innerText || '').trim();

            // 1. É um cabeçalho de seção?
            const isSectionHeader = SECAO_KEYWORDS.some(kw => textLower.startsWith(kw))
                                    && !/^\d+\s*[-–]\s/.test(innerText); // Não é card de pedido

            if (isSectionHeader) {
                if (textLower.startsWith('cozinha')) currentSection = 'Cozinha';
                else if (textLower.startsWith('aguardando entrega')) currentSection = 'Aguardando';
                else if (textLower.startsWith('saiu para entrega')) currentSection = 'Saiu';
                else currentSection = null;
                return;
            }

            // 2. Se não for cabeçalho, processamos como um wrapper de pedidos
            if (currentSection) {
                const processedIds = new Set();
                const checkNodes = [el, ...Array.from(el.querySelectorAll('*'))];

                // Removemos elementos genéricos/grandes demais para focar nos pequenos cards
                checkNodes.forEach(node => {
                    const nodeText = (node.innerText || '').trim();
                    const linhas = nodeText.split('\n').map(l => l.trim()).filter(l => l);
                    
                    if (linhas.length === 0 || linhas.length > 25) return; // Ignora containers pais muito grandes

                    // Pedidos no Saipos sempre começam com "NUMERO - NOME"
                    const matchPedido = linhas[0].match(/^(\d+[\w]?)\s*[-–]\s*(.+)/);
                    if (!matchPedido) return;

                    const idPedido = matchPedido[1].trim();
                    if (processedIds.has(idPedido)) return; // Evita pegar duplicado no filho e no pai
                    
                    processedIds.add(idPedido);
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
                        node.querySelectorAll('*').forEach(childNode => {
                            if (childNode.innerHTML && childNode.innerHTML.includes('Entregador:')) {
                                const motoboy = childNode.textContent.replace('Entregador:', '').trim().split('\n')[0].trim();
                                if (motoboy) motoboysNaRuaSet.add(motoboy);
                            }
                        });
                    }
                });
            }
        });

        console.log(`[FILALAB] 📊 Scan v3.0: ${pedidosAtivos.length} pedidos (Cozinha+Aguardando), ${motoboysNaRuaSet.size} motoboys na rua.`);

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
            console.log("[FILALAB] ✅ Kanban sem mudanças.");
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
                console.log("[FILALAB] 📬 Resp:", r.status);
            },
            onerror: function(e) {
                console.error("[FILALAB] ❌ Erro na API:", e);
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

        setInterval(() => {
            if (window.location.hash.includes("/kanban/search-customer")) scanKanban();
        }, 15000);

        setTimeout(scanKanban, 3000);
    }

    setTimeout(startObserver, 3000);
})();
