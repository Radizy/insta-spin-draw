// ==UserScript==
// @name         Integração SAIPOS x FilaLab (Mapa Tracking)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Interceptador de Rotas e GPS para FilaLab
// @match        https://conta.saipos.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 [FILALAB SAIPOS MAP] Extrator de Mapas Ativado!");

    // ==========================================
    // CONFIGURAÇÕES INJETADAS PELO FILALAB
    // ==========================================
    const LOJA_NOME = "{{NOME_DA_LOJA}}"; 
    const WEBHOOK_URL = "{{WEBHOOK_URL}}";
    const API_KEY = "{{API_KEY}}"; 

    // Guardar último pacote enviado para não causar sobrecarga
    let ultimoHashMapa = "";

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
                console.error("Erro no envio do Mapa FilaLab:", error);
            }
        });
    }

    // Interceptar requisições (Fetch e XHR)
    const interceptarXHR = () => {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function() {
            this.addEventListener('load', function() {
                // Captura a rota de routing principal da Saipos onde os pontos estão amarrados
                if (this._url && this._url.includes('/delivery_routing')) {
                    try {
                        const resposta = JSON.parse(this.responseText);
                        
                        let pedidos = [];
                        let motoboys = [];

                        if (Array.isArray(resposta)) {
                            resposta.forEach(route => {
                                if (route.sale_order && Array.isArray(route.sale_order)) {
                                    route.sale_order.forEach(so => {
                                        const address = so.sale && so.sale.customer_address;
                                        if (address && address.lat_lng) {
                                            // Saipos curiosamente salva como "Longitude, Latitude" no backend apesar do nome
                                            // Exemplo: "-46.34799, -23.4551"
                                            const coords = address.lat_lng.split(',').map(c => c.trim());
                                            
                                            if (coords.length === 2) {
                                                pedidos.push({
                                                    id: so.sale.id_sale,
                                                    cliente: 'Entrega (' + (so.sale.sale_number || so.sale.id_sale) + ')',
                                                    lat: parseFloat(coords[1]), // Lat é o segundo item no Brasil (-23)
                                                    lng: parseFloat(coords[0]), // Lng é o primeiro item (-46)
                                                    endereco: address.address || ''
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }

                        // Ignorar se vazio
                        if(pedidos.length === 0) return;

                        const hashAtual = JSON.stringify({p: pedidos});
                        if (hashAtual !== ultimoHashMapa) {
                            ultimoHashMapa = hashAtual;
                            console.log("[FILALAB] 🗺️ Nova Rota Interceptada: " + pedidos.length + " pontos de entrega.");
                            enviarAPI({
                                action: 'map_sync',
                                loja: LOJA_NOME,
                                pedidos: pedidos,
                                motoboys: [] // Deixa motoboys vazios pois o Saipos usa Firebase via Socket pros motoboys.
                            });
                        }
                    } catch (e) {
                         // Evita crash de parser json
                    }
                }
            });
            return originalSend.apply(this, arguments);
        };
    };

    // Inicia a interceptação invisível ao fundo
    interceptarXHR();
})();
