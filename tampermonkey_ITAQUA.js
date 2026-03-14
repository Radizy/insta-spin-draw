// ==UserScript==
// @name         Integração SISFOOD x FilaLab (LOJA ITAQUA) - v11.2 (Static)
// @namespace    http://tampermonkey.net/
// @version      11.3
// @description  Lê a fila do Sisfood e DESPACHA via FilaLab (Itaqua - Lote Nativo + Anti-Zumbi)
// @match        https://app.sisfood.com.br/*
// @grant        none
// ==/UserScript==

(function() {
    console.log("🚀 [FILALAB ITAQUA v11.3] Iniciado!");
    const API_FILALAB = "https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/sisfood-webhook";
    const SUPABASE_URL = "https://kegbvaikqelwezpehlhf.supabase.co";
    const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2J2YWlrcWVsd2V6cGVobGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDc4MzUsImV4cCI6MjA4NzIyMzgzNX0.hIRjDR4D6p8RAsnWMhkF1stRDr_oa0yMsqukCPADyh0";
    
    // CONFIGURAÇÃO DA UNIDADE
    const LOJA_FIXA = "Itaquaquecetuba";
    const UNIDADE_ID = "14bb566c-c8d0-4b96-8da7-8eecea2d6738";
    
    let ultimaHashFila = "";
    let ultimaContagemFila = -1;
    
    window._filaAtualSisfood = [];

    // ----- [PARTE 1: LEITURA] Interceptador de Rede para sincronizar a fila -----
    const XHR = XMLHttpRequest.prototype;
    const send = XHR.send;

    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            if (this._url && this._url.includes('/listarJson')) {
                try {
                    const data = JSON.parse(this.responseText);
                    let contagemFila = 0;
                    const pedidosNaFila = [];
                    window._filaAtualSisfood = [];
                    
                    if (data.pedidos && Array.isArray(data.pedidos)) {
                        data.pedidos.forEach(pedido => {
                            const status = pedido[4]; 
                            if (status === "Fila" || status === "fila") {
                                contagemFila++;
                                
                                // Captura ROBUSTA do ID Interno (Database ID)
                                let idDeVerdade = pedido[0];
                                [14, 15, 13, 11, 10].forEach(idx => {
                                    if (pedido[idx] && typeof pedido[idx] === 'number' && pedido[idx] > idDeVerdade) {
                                        idDeVerdade = pedido[idx];
                                    }
                                });

                                pedidosNaFila.push({
                                    id: idDeVerdade,
                                    id_interno: idDeVerdade,
                                    comanda: pedido[7] || pedido[0],
                                    hora_entrada: pedido[2] || '', 
                                    cliente: pedido[3] ? pedido[3].split(' / ')[0].trim() : 'Desconhecido',
                                    telefone: pedido[3] && pedido[3].includes('/') ? pedido[3].split(' / ')[1].trim() : '',
                                    endereco: pedido[9] || ''
                                });
                                // Popula Array Zumbi Lock da V11 (Salva as DUAS Variações de ID pra Segurança)
                                window._filaAtualSisfood.push(String(pedido[0]).trim());
                                window._filaAtualSisfood.push(String(idDeVerdade).trim());
                            }
                        });
                    }

                    const hashAtual = JSON.stringify(pedidosNaFila);

                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log("🟢 [FILALAB ITAQUA] Fila: " + contagemFila + " pedidos. Atualizando...");
                        ultimaHashFila = hashAtual;
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila, pedidosNaFila);
                    }
                } catch(err) {
                    console.error("❌ [FILALAB ITAQUA] Erro ao ler JSON:", err);
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

    async function enviarFilaLab(lojaNome, filaCount, pedidosFila) {
        try {
            await fetch(API_FILALAB, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    loja: lojaNome, 
                    unidade_id: UNIDADE_ID,
                    fila: filaCount, 
                    pedidos_fila: pedidosFila, 
                    sistema: "SISFOOD_V11_2" 
                })
            });
        } catch (e) {
            console.error("❌ [FILALAB ITAQUA] Erro de Rede:", e);
        }
    }

    // ----- [PARTE 2: ESCRITA] Polling de Comandos Pendentes (DESPACHO EM MASSA) -----
    
    function findMotoboyIdByName(targetName) {
        const normalTarget = targetName.toLowerCase().trim();
        const forms = document.querySelectorAll("select option");
        for(let opt of forms) {
             if(opt.textContent.toLowerCase().includes(normalTarget)) {
                 return opt.value;
             }
        }
        const btns = document.querySelectorAll("button, div.card, span");
        for(let b of btns) {
             if(b.textContent.toLowerCase().includes(normalTarget)) {
                 if(b.value) return b.value;
             }
        }
        return null; // Caso não encontre retorna nulo
    }

    async function patchSupabaseStatus(cmdId, status) {
        await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?id=eq." + cmdId, {
             method: 'PATCH',
             headers: {
                 "apikey": ANON_KEY,
                 "Authorization": "Bearer " + ANON_KEY,
                 "Content-Type": "application/json"
             },
             body: JSON.stringify({ status: status })
        });
    }

    async function despacharPedidoNoSisfood(cmd) {
         return new Promise(async (resolve) => {
             const codigosLimpos = cmd.cod_pedido_interno.replace(/\s+/g, '');
             
             // TRAVA ANTI-ZUMBI V11.2 - Impede RESSURREIÇÃO
             if (window._filaAtualSisfood && !window._filaAtualSisfood.includes(codigosLimpos)) {
                 console.warn("🛡️ [FILALAB Zumbi-Lock] O pedido " + codigosLimpos + " não está na lista visual. Marcando FilaLab como IGNORADO.");
                 await patchSupabaseStatus(cmd.id, 'IGNORADO');
                 return resolve(true);
             }

             const idMotoboy = findMotoboyIdByName(cmd.nome_motoboy);
             if(!idMotoboy) {
                  console.warn("[FILALAB ITAQUA] Motoboy não encontrado: " + cmd.nome_motoboy);
                  return resolve(false);
             }
             
             const urlDespacho = window.location.pathname.replace('/tela', '').replace('/pdv', '') + "/statusPedidosLote";
             const arrayPedidosFormatado = encodeURIComponent("[" + codigosLimpos + "]"); // <--- O Segredo de ITAQUA (COM COLCHETES)

             const form = "pedidos="+arrayPedidosFormatado+"&status=entrega&cod_motoboy="+encodeURIComponent(idMotoboy);
             console.log("🚀 [FILALAB ITAQUA] Despachando ID " + codigosLimpos + "...");

             const xhr = new XMLHttpRequest();
             xhr.open("POST", urlDespacho, true);
             xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
             xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

             xhr.onreadystatechange = async function () {
                  if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                       await patchSupabaseStatus(cmd.id, 'EXECUTADO');
                       console.log("✅ [FILALAB ITAQUA] Pedido " + codigosLimpos + " despachado!");
                       resolve(true);
                  } else if (this.readyState === XMLHttpRequest.DONE) {
                       resolve(false);
                  }
             }
             xhr.send(form);
         });
    }

    async function pollComandos() {
         try {
             const resp = await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_id=eq." + UNIDADE_ID, {
                 headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
             });
             
             if(resp.ok) {
                 const comandos = await resp.json();
                 for(let cmd of comandos) {
                     await despacharPedidoNoSisfood(cmd);
                     await new Promise(r => setTimeout(r, 800)); // Delay p/ não sobrecarregar
                 }
             }
         } catch(e) {}
    }

    // Polling Speed Restaurado para 4 Segundos
    setInterval(pollComandos, 4000);
})();
