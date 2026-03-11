// ==UserScript==
// @name         Integração SISFOOD x FilaLab (LOJA ITAQUA)
// @namespace    http://tampermonkey.net/
// @version      7.0 - ITAQUA
// @description  Lê a fila de "Itaqua" e manda pro FilaLab
// @match        https://app.sisfood.com.br/*/pdv*
// @grant        none
// ==/UserScript==

(function() {
    const API_FILALAB = "https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/sisfood-webhook";
    
    // NOME CRAVADO DA LOJA PARA ESTE COMPUTADOR!
    const LOJA_FIXA = "Itaquaquecetuba";
    let ultimaContagemFila = -1;

    // Interceptador de Rede invisivel
    const XHR = XMLHttpRequest.prototype;
    const send = XHR.send;

    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            if (this._url && this._url.includes('/listarJson')) {
                try {
                    const data = JSON.parse(this.responseText);
                    let contagemFila = 0;
                    
                    if (data.pedidos && Array.isArray(data.pedidos)) {
                        data.pedidos.forEach(pedido => {
                            const status = pedido[4]; 
                            if (status === "Fila" || status === "fila") {
                                contagemFila++;
                            }
                        });
                    }

                    if (contagemFila !== ultimaContagemFila) {
                        console.log(`🟢 [FILALAB ITAQUA] Fila: ${contagemFila} pedidos. Disparando Supabase!`);
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila);
                    }
                } catch(err) {
                    console.error("❌ [FILALAB] Erro ao ler JSON:", err);
                }
            }
        });
        return send.apply(this, arguments);
    };

    const open = XHR.open;
    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    async function enviarFilaLab(lojaNome, filaCount) {
        try {
            const resposta = await fetch(API_FILALAB, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loja: lojaNome, fila: filaCount, sistema: "SISFOOD_V7" })
            });
            if (resposta.ok) {
                 console.log(`✅ [FILALAB ITAQUA] Sucesso! Banco atualizado (${filaCount}).`);
            }
        } catch (e) {
            console.error("❌ [FILALAB] Erro de Rede:", e);
        }
    }
})();
