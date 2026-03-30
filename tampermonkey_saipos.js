// ==UserScript==
// @name         Integração SAIPOS x FilaLab (Leitura Dinâmica)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extração passiva de pedidos Kanban e Retorno Automático
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

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function scanKanban() {
        if (!window.location.hash.includes("/kanban/search-customer")) return;

        const mainContainer = document.querySelector('div.scrollbar[scrollable="true"]');
        if (!mainContainer) return;

        const children = Array.from(mainContainer.children);
        
        let inCozinha = false;
        let inAguardando = false;
        let inSaiu = false;

        const pedidosAtivos = [];
        const motoboysNaRuaSet = new Set();
        let filaCount = 0;

        children.forEach(el => {
            if (el.tagName.toLowerCase() === 'h3' || el.querySelector('h3')) {
                const titleText = el.textContent.toLowerCase();
                inCozinha = titleText.includes('cozinha');
                inAguardando = titleText.includes('aguardando entrega');
                inSaiu = titleText.includes('saiu para entrega');
                return;
            }

            if (el.tagName.toLowerCase() === 'label' && el.classList.contains('p-l-25')) {
                if (inCozinha || inAguardando) {
                    filaCount++;
                    const textoCard = el.innerText || "";
                    const linhas = textoCard.split('\n').map(l => l.trim()).filter(l => l);
                    
                    if (linhas.length > 0) {
                        const cabecalho = linhas[0].split('-');
                        const idPedido = cabecalho[0] ? cabecalho[0].trim() : "0";
                        const nomeCliente = cabecalho[1] ? cabecalho[1].trim() : "Desconhecido";
                        
                        let enderecoStr = "";
                        linhas.forEach(linha => {
                            if (linha.length > 15 && !linha.includes('R$') && !linha.includes('/') && !linha.includes('Pago') && !linha.includes('Nº')) {
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
                }

                if (inSaiu) {
                    const entregadorMatches = el.querySelectorAll('span');
                    entregadorMatches.forEach(span => {
                        if (span.innerHTML.includes('Entregador:')) {
                            const nomeMatch = span.textContent.replace('Entregador:', '').trim();
                            const motoboyPuro = nomeMatch.split('\n')[0].trim();
                            if (motoboyPuro) {
                                motoboysNaRuaSet.add(motoboyPuro);
                            }
                        }
                    });
                }
            }
        });

        const hashAtual = JSON.stringify(pedidosAtivos);
        if (hashAtual !== cacheCozinhaAguardando) {
            cacheCozinhaAguardando = hashAtual;
            enviarAPI({
                action: 'update_kanban',
                loja: LOJA_NOME,
                pedidos_fila: pedidosAtivos,
                entregas_na_fila: filaCount
            });
        }

        const motoboysNaRuaList = Array.from(motoboysNaRuaSet);
        
        motoboysNaRuaCache.forEach(antigoMotoboy => {
            if (!motoboysNaRuaList.includes(antigoMotoboy)) {
                console.log(`🛎️ [FILALAB] Motoboy ${antigoMotoboy} sumiu da entrega! Enviando retorno...`);
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
            onload: function(response) {},
            onerror: function(error) {
                console.error("Erro no envio do FilaLab:", error);
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

        const config = { childList: true, subtree: true, characterData: true };
        const callback = function(mutationsList) {
            if (window.location.hash.includes("/kanban/search-customer")) {
                clearTimeout(timerID);
                timerID = setTimeout(() => {
                    scanKanban();
                }, 1500);
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        console.log("👁️ [FILALAB SAIPOS] Mutation Observer Ativado no Kanban.");
    }

    setTimeout(startObserver, 3000);
})();
