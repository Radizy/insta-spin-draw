// ==UserScript==
// @name         Integração SISFOOD x FilaLab (LOJA SUZANO) - v14.0 (Com Seleção de Bags)
// @namespace    http://tampermonkey.net/
// @version      14.0
// @description  Lê a fila do Sisfood, Chamar e Despachar direto no Sisfood com Seleção de Bags (Normal, Trem, etc), Enter inteligente, Baixa 2x2 e Comanda Diária
// @match        https://app.sisfood.com.br/*
// @grant        none
// ==/UserScript==

(function() {
    console.log("🚀 [FILALAB SUZANO v14.0] Painel Rápido com Bags Cadastradas Iniciado!");

    const API_FILALAB = "https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/sisfood-webhook";
    const SUPABASE_URL = "https://kegbvaikqelwezpehlhf.supabase.co";
    const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2J2YWlrcWVsd2V6cGVobGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDc4MzUsImV4cCI6MjA4NzIyMzgzNX0.hIRjDR4D6p8RAsnWMhkF1stRDr_oa0yMsqukCPADyh0";
    
    // CONFIGURAÇÃO DA UNIDADE (ISOLAMENTO GARANTIDO)
    const LOJA_FIXA = "Suzano";
    const UNIDADE_ID = "f84d6f35-cf8f-48fd-965d-1d6d2fe0a204";
    
    let ultimaHashFila = "";
    let ultimaContagemFila = -1;
    
    window._filaAtualSisfood = [];
    window._pedidosFilaSisfood = [];
    window._retryCountsComandas = {};
    window._retryCountsMotoboy = {};
    window._motoboysDisponiveis = [];
    window._comandasNaFilaHUD = [];
    window._bagsDisponiveis = [];
    window._bagSelecionada = null;

    // ==========================================
    // 🎨 HUD VISUAL EXPANDIDO COM DESPACHO RÁPIDO & BAGS
    // ==========================================
    function initHud() {
        if (document.getElementById('filalab-hud')) return;

        const hud = document.createElement('div');
        hud.id = 'filalab-hud';
        hud.innerHTML = `
            <style>
                #filalab-hud {
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                    width: 400px;
                    max-height: 550px;
                    background: rgba(17, 24, 39, 0.96);
                    backdrop-filter: blur(8px);
                    color: #f3f4f6;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 12px;
                    border-radius: 12px;
                    box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: all 0.25s ease;
                }
                #filalab-hud.minimized {
                    max-height: 40px;
                    width: 240px;
                }
                #filalab-hud-header {
                    padding: 10px 14px;
                    background: rgba(31, 41, 55, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    user-select: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                #filalab-hud-title {
                    font-weight: 600;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #fff;
                }
                .filalab-dot {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 8px #10b981;
                }
                .filalab-dot.pulse {
                    animation: filalabPulse 1.5s infinite;
                }
                @keyframes filalabPulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
                #filalab-hud-body {
                    padding: 12px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .filalab-card-box {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .filalab-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .filalab-input {
                    background: rgba(0, 0, 0, 0.35);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    color: #fff;
                    padding: 8px 10px;
                    font-size: 13px;
                    outline: none;
                    width: 100%;
                    box-sizing: border-box;
                    transition: border 0.2s;
                }
                .filalab-input:focus {
                    border-color: #10b981;
                    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
                }
                .filalab-select {
                    background: #1f2937;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px;
                    color: #fff;
                    padding: 7px 10px;
                    font-size: 12px;
                    outline: none;
                    width: 100%;
                    cursor: pointer;
                    box-sizing: border-box;
                }
                .filalab-chips-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    min-height: 24px;
                    align-items: center;
                    padding: 4px 2px;
                }
                .filalab-chip {
                    background: rgba(16, 185, 129, 0.18);
                    border: 1px solid rgba(16, 185, 129, 0.4);
                    color: #34d399;
                    font-weight: 600;
                    font-size: 12px;
                    padding: 3px 8px;
                    border-radius: 5px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    animation: filalabFadeIn 0.2s ease;
                }
                .filalab-chip-remove {
                    cursor: pointer;
                    color: #f87171;
                    font-weight: bold;
                    font-size: 11px;
                    padding: 0 2px;
                    border-radius: 3px;
                }
                .filalab-chip-remove:hover {
                    background: rgba(239, 68, 68, 0.2);
                }
                @keyframes filalabFadeIn {
                    from { transform: scale(0.85); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .filalab-btn-primary {
                    background: linear-gradient(135deg, #059669, #10b981);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }
                .filalab-btn-primary:hover {
                    opacity: 0.92;
                    transform: translateY(-1px);
                }
                .filalab-btn-primary:active {
                    transform: translateY(0);
                }
                .filalab-btn-secondary {
                    background: rgba(255, 255, 255, 0.08);
                    color: #e5e7eb;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 5px 8px;
                    font-size: 11px;
                    cursor: pointer;
                }
                .filalab-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
                .filalab-hud-row {
                    font-size: 11px;
                    color: #9ca3af;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #filalab-hud-logs {
                    max-height: 130px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column-reverse;
                    gap: 4px;
                    padding-right: 2px;
                }
                .filalab-hud-log {
                    display: flex;
                    gap: 6px;
                    font-size: 11px;
                    line-height: 1.3;
                    padding: 4px 6px;
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.03);
                }
                .filalab-hud-log.success { color: #34d399; background: rgba(16, 185, 129, 0.12); font-weight: 500; }
                .filalab-hud-log.warn { color: #fbbf24; background: rgba(245, 158, 11, 0.12); }
                .filalab-hud-log.error { color: #f87171; background: rgba(239, 68, 68, 0.12); }
                .filalab-hud-log.info { color: #60a5fa; background: rgba(59, 130, 246, 0.1); }
            </style>
            
            <div id="filalab-hud-header" title="Clique para minimizar ou expandir">
                <div id="filalab-hud-title">
                    <span class="filalab-dot pulse" id="filalab-status-dot"></span>
                    <span>FilaLab Suzano <span style="font-size:10px; color:#10b981; font-weight:normal;">v14.0</span></span>
                </div>
                <span id="filalab-hud-toggle" style="color: #9ca3af; font-size: 14px; font-weight: bold;">_</span>
            </div>

            <div id="filalab-hud-body">
                <!-- FORMULÁRIO DE DESPACHO RÁPIDO DIRETO NA TELA DO SISFOOD -->
                <div class="filalab-card-box">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="filalab-label">🏍️ Chamar & Baixar Pedidos</span>
                        <button id="filalab-btn-refresh-motos" class="filalab-btn-secondary" title="Atualizar lista de motoboys e bags">🔄 Atualizar Fila</button>
                    </div>

                    <!-- SELEÇÃO DE MOTOBOY -->
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <select id="filalab-motoboy-select" class="filalab-select">
                            <option value="">Carregando motoboys...</option>
                        </select>
                    </div>

                    <!-- QUADRADOS SELECIONÁVEIS DE BAGS (NORMAL, TREM, ETC.) -->
                    <div id="filalab-bags-container" style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 10px; color: #9ca3af; text-transform: uppercase;">Tipo de BAG:</span>
                        <div id="filalab-bags-cards" style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <div style="font-size: 11px; color: #6b7280;">Carregando bags...</div>
                        </div>
                    </div>

                    <!-- CAMPO DE DIGITAÇÃO DE COMANDA (ENTER ADICIONA / ENTER VAZIO DESPACHA) -->
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <input id="filalab-comandas-input" class="filalab-input" type="text" placeholder="Digite a comanda e aperte Enter..." />
                        
                        <!-- CHIPS VISUAIS DE COMANDAS ACUMULADAS -->
                        <div id="filalab-chips-area" class="filalab-chips-container">
                            <span style="font-size: 10px; color: #6b7280; font-style: italic;">
                                Digite o nº e dê [Enter] para empilhar. Dê [Enter] vazio para despachar.
                            </span>
                        </div>
                    </div>

                    <button id="filalab-btn-despachar" class="filalab-btn-primary">
                        <span>🚀 Chamar Motoboy & Baixar (2 em 2)</span>
                    </button>
                </div>

                <!-- STATUS DA FILA DO SISFOOD -->
                <div class="filalab-hud-row">
                    <span id="filalab-hud-info">Fila Sisfood: 0 pedidos | Monitorando</span>
                    <span style="font-size:10px; color:#6b7280;">Lote Máx: 2</span>
                </div>

                <!-- FEED DE EVENTOS RECENTES COM NÚMERO DIÁRIO -->
                <div id="filalab-hud-logs">
                    <div class="filalab-hud-log info">🟢 Integração v14.0 pronta (Bags cadastradas ativas)</div>
                </div>
            </div>
        `;

        document.body.appendChild(hud);

        // Ações de Toggle e Botões
        const header = document.getElementById('filalab-hud-header');
        header.addEventListener('click', () => {
            hud.classList.toggle('minimized');
            const toggle = document.getElementById('filalab-hud-toggle');
            toggle.textContent = hud.classList.contains('minimized') ? '▲' : '_';
        });

        const btnRefresh = document.getElementById('filalab-btn-refresh-motos');
        btnRefresh.addEventListener('click', (e) => {
            e.stopPropagation();
            carregarMotoboysDisponiveis();
            carregarBagsDisponiveis();
        });

        const btnDespachar = document.getElementById('filalab-btn-despachar');
        btnDespachar.addEventListener('click', (e) => {
            e.stopPropagation();
            executarDespachoManualHUD();
        });

        const inputComandas = document.getElementById('filalab-comandas-input');
        inputComandas.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const texto = inputComandas.value.trim();
                
                if (texto) {
                    adicionarComandasHUD(texto);
                    inputComandas.value = '';
                } else {
                    executarDespachoManualHUD();
                }
            }
        });

        // Carrega os motoboys e as bags da franquia
        carregarMotoboysDisponiveis();
        carregarBagsDisponiveis();
    }

    // ==========================================
    // 🎒 CARREGAMENTO E RENDERIZAÇÃO DAS BAGS CADASTRADAS
    // ==========================================
    async function carregarBagsDisponiveis() {
        try {
            // 1. Busca franquia_id da unidade
            const uResp = await fetch(SUPABASE_URL + "/rest/v1/unidades?id=eq." + UNIDADE_ID + "&select=id,franquia_id", {
                headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
            });
            if (!uResp.ok) return;
            const uData = await uResp.json();
            const franquiaId = uData[0]?.franquia_id;
            if (!franquiaId) return;

            // 2. Busca bags cadastradas para a franquia
            const bResp = await fetch(SUPABASE_URL + "/rest/v1/franquia_bag_tipos?franquia_id=eq." + franquiaId + "&ativo=eq.true&order=created_at.asc", {
                headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
            });

            if (bResp.ok) {
                const bags = await bResp.json();
                if (bags && bags.length > 0) {
                    window._bagsDisponiveis = bags;
                    if (!window._bagSelecionada) {
                        window._bagSelecionada = bags[0].nome;
                    }
                    renderizarBagsHUD();
                } else {
                    // Fallback se não tiver nenhuma cadastrada
                    window._bagsDisponiveis = [{ nome: 'Bag Normal', icone_url: null }];
                    window._bagSelecionada = 'Bag Normal';
                    renderizarBagsHUD();
                }
            }
        } catch (e) {
            console.error("Erro ao carregar bags:", e);
        }
    }

    function renderizarBagsHUD() {
        const cardsArea = document.getElementById('filalab-bags-cards');
        if (!cardsArea) return;

        const bags = window._bagsDisponiveis || [];
        if (bags.length === 0) {
            cardsArea.innerHTML = '<div style="font-size: 11px; color: #6b7280;">Nenhuma bag cadastrada</div>';
            return;
        }

        let html = '';
        bags.forEach(bag => {
            const isSelected = window._bagSelecionada === bag.nome;
            const borderStyle = isSelected 
                ? 'border: 2px solid #10b981; background: rgba(16, 185, 129, 0.22); color: #fff; font-weight: 700; box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);' 
                : 'border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.04); color: #9ca3af; font-weight: normal;';

            let iconeHtml = '🎒';
            const nomeLower = (bag.nome || '').toLowerCase();
            if (bag.icone_url) {
                iconeHtml = `<img src="${bag.icone_url}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 3px;" />`;
            } else if (nomeLower.includes('trem') || nomeLower.includes('metro')) {
                iconeHtml = '🚆';
            } else if (nomeLower.includes('pizza') || nomeLower.includes('grande')) {
                iconeHtml = '🍕';
            }

            html += `
                <div class="filalab-bag-card" data-bag-nome="${bag.nome}" style="flex: 1; min-width: 90px; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; user-select: none; transition: all 0.15s; ${borderStyle}">
                    <span>${iconeHtml}</span>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bag.nome}</span>
                </div>
            `;
        });

        cardsArea.innerHTML = html;

        cardsArea.querySelectorAll('.filalab-bag-card').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                window._bagSelecionada = el.getAttribute('data-bag-nome');
                renderizarBagsHUD();
            });
        });
    }

    // Atualiza a área de chips visuais das comandas acumuladas
    function renderizarChipsComandas() {
        const area = document.getElementById('filalab-chips-area');
        const btn = document.getElementById('filalab-btn-despachar');
        if (!area) return;

        if (!window._comandasNaFilaHUD || window._comandasNaFilaHUD.length === 0) {
            area.innerHTML = `
                <span style="font-size: 10px; color: #6b7280; font-style: italic;">
                    Digite o nº e dê [Enter] para empilhar. Dê [Enter] vazio para despachar.
                </span>
            `;
            if (btn) btn.innerHTML = `<span>🚀 Chamar Motoboy & Baixar (2 em 2)</span>`;
            return;
        }

        let html = '';
        window._comandasNaFilaHUD.forEach((comanda, idx) => {
            html += `
                <span class="filalab-chip">
                    #${comanda}
                    <span class="filalab-chip-remove" data-index="${idx}" title="Remover esta comanda">✕</span>
                </span>
            `;
        });

        html += `
            <span id="filalab-btn-limpar-chips" style="font-size: 10px; color: #9ca3af; text-decoration: underline; cursor: pointer; margin-left: 6px;">
                Limpar (${window._comandasNaFilaHUD.length})
            </span>
        `;

        area.innerHTML = html;

        area.querySelectorAll('.filalab-chip-remove').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(el.getAttribute('data-index'), 10);
                if (!isNaN(index)) {
                    window._comandasNaFilaHUD.splice(index, 1);
                    renderizarChipsComandas();
                }
            });
        });

        const btnLimpar = document.getElementById('filalab-btn-limpar-chips');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', (e) => {
                e.stopPropagation();
                window._comandasNaFilaHUD = [];
                renderizarChipsComandas();
            });
        }

        if (btn) {
            btn.innerHTML = `<span>🚀 Chamar Motoboy & Baixar (${window._comandasNaFilaHUD.length} comanda${window._comandasNaFilaHUD.length > 1 ? 's' : ''})</span>`;
        }
    }

    function adicionarComandasHUD(texto) {
        if (!texto) return;
        const partes = texto.split(/[, ; \n]+/).map(s => s.trim().replace(/^#+/, '')).filter(Boolean);
        
        partes.forEach(num => {
            if (!window._comandasNaFilaHUD.includes(num)) {
                window._comandasNaFilaHUD.push(num);
            }
        });

        renderizarChipsComandas();
    }

    function hudLog(msg, type = "info") {
        try {
            initHud();
            const container = document.getElementById('filalab-hud-logs');
            if (!container) return;

            const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const item = document.createElement('div');
            item.className = `filalab-hud-log ${type}`;
            item.innerHTML = `<span style="opacity:0.6;">${timeStr}</span> <span>${msg}</span>`;

            container.appendChild(item);

            while (container.children.length > 20) {
                container.removeChild(container.firstChild);
            }
        } catch (e) {
            console.error("Erro no HUD:", e);
        }
    }

    function hudUpdateInfo(text) {
        try {
            initHud();
            const info = document.getElementById('filalab-hud-info');
            if (info) info.textContent = text;
        } catch (e) {}
    }

    // ==========================================
    // 🏍️ CARREGAMENTO E ATUALIZAÇÃO DA FILA DE MOTOBOYS
    // ==========================================
    async function carregarMotoboysDisponiveis() {
        const select = document.getElementById('filalab-motoboy-select');
        if (!select) return;

        try {
            const resp = await fetch(SUPABASE_URL + "/rest/v1/entregadores?unidade_id=eq." + UNIDADE_ID + "&status=eq.disponivel&ativo=eq.true&order=fila_posicao.asc", {
                headers: {
                    "apikey": ANON_KEY,
                    "Authorization": "Bearer " + ANON_KEY
                }
            });

            if (resp.ok) {
                const motoboys = await resp.json();
                window._motoboysDisponiveis = motoboys || [];

                const valorAnterior = select.value;
                select.innerHTML = '';
                
                if (motoboys.length === 0) {
                    select.innerHTML = '<option value="">Nenhum motoboy disponível</option>';
                } else {
                    motoboys.forEach((m, idx) => {
                        const opt = document.createElement('option');
                        opt.value = m.id;
                        opt.textContent = `${idx + 1}º ${m.nome}`;
                        select.appendChild(opt);
                    });

                    if (valorAnterior && select.querySelector(`option[value="${valorAnterior}"]`)) {
                        select.value = valorAnterior;
                    }
                }
            }
        } catch (e) {
            console.error("Erro ao carregar motoboys:", e);
        }
    }

    setInterval(carregarMotoboysDisponiveis, 12000);

    // ==========================================
    // 🚀 EXECUÇÃO DE DESPACHO RÁPIDO DO PAINEL HUD
    // ==========================================
    async function executarDespachoManualHUD() {
        const input = document.getElementById('filalab-comandas-input');
        const select = document.getElementById('filalab-motoboy-select');
        const btn = document.getElementById('filalab-btn-despachar');
        if (!select || !btn) return;

        if (input && input.value.trim()) {
            adicionarComandasHUD(input.value.trim());
            input.value = '';
        }

        const comandasArray = [...window._comandasNaFilaHUD];

        if (comandasArray.length === 0) {
            hudLog("⚠️ Nenhuma comanda adicionada! Digite o número e dê Enter.", "warn");
            if (input) input.focus();
            return;
        }

        const motoboyId = select.value;
        if (!motoboyId) {
            hudLog("⚠️ Nenhum motoboy selecionado na lista!", "warn");
            return;
        }

        const motoboyObj = (window._motoboysDisponiveis || []).find(m => String(m.id) === String(motoboyId));
        const nomeMotoboy = motoboyObj ? motoboyObj.nome : select.options[select.selectedIndex]?.text.replace(/^\d+º\s*/, '');
        const bagNomeFinal = window._bagSelecionada || 'Bag Normal';

        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Despachando...</span>`;

        hudLog(`🏍️ Chamando ${nomeMotoboy} [${bagNomeFinal}] com comandas [#${comandasArray.join(', #')}]...`, "info");

        window._comandasNaFilaHUD = [];
        renderizarChipsComandas();

        try {
            // 1. Atualiza status do entregador para 'chamado' com tipo_bag selecionado
            await fetch(SUPABASE_URL + "/rest/v1/entregadores?id=eq." + motoboyId, {
                method: 'PATCH',
                headers: {
                    "apikey": ANON_KEY,
                    "Authorization": "Bearer " + ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: 'chamado', tipo_bag: bagNomeFinal })
            });

            // 2. Insere histórico para TV e relatórios com tipo_bag
            await fetch(SUPABASE_URL + "/rest/v1/historico_entregas", {
                method: 'POST',
                headers: {
                    "apikey": ANON_KEY,
                    "Authorization": "Bearer " + ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    entregador_id: motoboyId,
                    unidade: LOJA_FIXA,
                    unidade_id: UNIDADE_ID,
                    hora_saida: new Date().toISOString(),
                    quantidade_entregas: comandasArray.length,
                    tipo_bag: bagNomeFinal
                })
            });

            // 3. Insere cada comanda em sisfood_comandos (com comanda_diaria)
            for (const comanda of comandasArray) {
                const idResolvido = resolverIdPedido(comanda);
                const codPedidoInterno = idResolvido || comanda;

                await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos", {
                    method: 'POST',
                    headers: {
                        "apikey": ANON_KEY,
                        "Authorization": "Bearer " + ANON_KEY,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        unidade_nome: LOJA_FIXA,
                        unidade_id: UNIDADE_ID,
                        cod_pedido_interno: String(codPedidoInterno),
                        comanda_diaria: String(comanda),
                        nome_motoboy: nomeMotoboy,
                        status: 'PENDENTE'
                    })
                });
            }

            carregarMotoboysDisponiveis();

            // Volta para a primeira bag por padrão para a próxima corrida
            if (window._bagsDisponiveis && window._bagsDisponiveis.length > 0) {
                window._bagSelecionada = window._bagsDisponiveis[0].nome;
                renderizarBagsHUD();
            }

            // Dispara polling imediatamente para dar baixa no Sisfood
            setTimeout(pollComandos, 300);

        } catch (e) {
            console.error("Erro ao despachar no HUD:", e);
            hudLog("❌ Falha ao registrar chamado no FilaLab", "error");
        } finally {
            btn.disabled = false;
            renderizarChipsComandas();
            if (input) input.focus();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHud);
    } else {
        initHud();
    }

    // ==========================================
    // 🔍 UTILITÁRIOS ROBUSTOS DE SANITIZAÇÃO E BUSCA
    // ==========================================

    function normalizeText(txt) {
        if (!txt) return '';
        return String(txt)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function sanitizeComanda(s) {
        if (s === null || s === undefined) return '';
        let str = String(s).trim().replace(/^#+/, '').trim();
        if (/^0+[1-9]/.test(str)) {
            str = str.replace(/^0+/, '');
        }
        return str.toLowerCase();
    }

    function findMotoboyIdByName(targetName) {
        if (!targetName) return null;
        const targetNorm = normalizeText(targetName);
        if (!targetNorm) return null;
        const targetParts = targetNorm.split(' ').filter(p => p.length > 1);

        const selects = Array.from(document.querySelectorAll("select"));
        selects.sort((a, b) => {
            const aName = (a.name + ' ' + a.id).toLowerCase();
            const bName = (b.name + ' ' + b.id).toLowerCase();
            const aHas = aName.includes('motoboy') || aName.includes('entregador');
            const bHas = bName.includes('motoboy') || bName.includes('entregador');
            return bHas - aHas;
        });

        for (let sel of selects) {
            for (let opt of sel.options) {
                const optVal = String(opt.value || '').trim();
                if (!optVal || optVal === '0' || optVal === '-1' || optVal === 'null') continue;

                const optNorm = normalizeText(opt.textContent);
                if (!optNorm) continue;

                if (optNorm === targetNorm) return optVal;
                if (optNorm.includes(targetNorm) || targetNorm.includes(optNorm)) return optVal;
                if (targetParts.length > 0 && targetParts.every(part => optNorm.includes(part))) {
                    return optVal;
                }
            }
        }

        const elements = document.querySelectorAll("button, div[data-id], div.card, span.motoboy, [data-motoboy]");
        for (let el of elements) {
            const val = el.getAttribute('data-id') || el.getAttribute('data-motoboy') || el.value;
            if (!val || val === '0') continue;

            const elNorm = normalizeText(el.textContent);
            if (!elNorm) continue;

            if (elNorm === targetNorm || elNorm.includes(targetNorm) || targetNorm.includes(elNorm)) {
                return String(val).trim();
            }
            if (targetParts.length > 0 && targetParts.every(part => elNorm.includes(part))) {
                return String(val).trim();
            }
        }

        return null;
    }

    // ==========================================
    // 📡 [PARTE 1: LEITURA] Interceptador de Rede (/listarJson)
    // ==========================================
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
                    window._pedidosFilaSisfood = [];
                    
                    if (data.pedidos && Array.isArray(data.pedidos)) {
                        data.pedidos.forEach(pedido => {
                            const status = pedido[4]; 
                            if (status === "Fila" || status === "fila") {
                                contagemFila++;
                                
                                let idDeVerdade = pedido[0];
                                [14, 15, 13, 11, 10].forEach(idx => {
                                    if (pedido[idx] && typeof pedido[idx] === 'number' && pedido[idx] > idDeVerdade) {
                                        idDeVerdade = pedido[idx];
                                    }
                                });

                                const numComanda = pedido[7] || pedido[0];

                                pedidosNaFila.push({
                                    id: idDeVerdade,
                                    id_interno: idDeVerdade,
                                    comanda: numComanda,
                                    hora_entrada: pedido[2] || '', 
                                    cliente: pedido[3] ? pedido[3].split(' / ')[0].trim() : 'Desconhecido',
                                    telefone: pedido[3] && pedido[3].includes('/') ? pedido[3].split(' / ')[1].trim() : '',
                                    endereco: pedido[9] || ''
                                });

                                window._filaAtualSisfood.push(String(pedido[0]).trim());
                                window._filaAtualSisfood.push(String(idDeVerdade).trim());
                                window._pedidosFilaSisfood.push({
                                    id_interno: String(idDeVerdade).trim(),
                                    comanda: String(numComanda).trim()
                                });
                            }
                        });
                    }

                    hudUpdateInfo(`Fila Sisfood: ${contagemFila} pedidos | Monitorando`);

                    const hashAtual = JSON.stringify(pedidosNaFila);
                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log("🟢 [FILALAB SUZANO] Fila atualizada: " + contagemFila + " pedidos.");
                        ultimaHashFila = hashAtual;
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila, pedidosNaFila);
                    }
                } catch(err) {
                    console.error("❌ [FILALAB SUZANO] Erro ao ler JSON da fila:", err);
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
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': ANON_KEY
                },
                body: JSON.stringify({ 
                    loja: lojaNome, 
                    unidade_id: UNIDADE_ID,
                    fila: filaCount, 
                    pedidos_fila: pedidosFila, 
                    sistema: "SISFOOD_V14_0" 
                })
            });
        } catch (e) {
            console.error("❌ [FILALAB SUZANO] Erro de Rede ao enviar Fila:", e);
        }
    }

    // ==========================================
    // 🚀 [PARTE 2: ESCRITA] Despacho em Lotes de 2 em 2
    // ==========================================

    async function patchSupabaseStatus(cmdId, status, obs = null) {
        const payload = { status: status };
        if (obs) payload.observacao = obs;
        try {
            await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?id=eq." + cmdId, {
                method: 'PATCH',
                headers: {
                    "apikey": ANON_KEY,
                    "Authorization": "Bearer " + ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Erro ao atualizar Supabase:", e);
        }
    }

    function resolverIdPedido(codRaw) {
        if (!codRaw) return null;
        const codLimpo = String(codRaw).trim();
        const fila = window._pedidosFilaSisfood || [];

        const matchId = fila.find(p => p.id_interno === codLimpo);
        if (matchId) return matchId.id_interno;

        const targetSanit = sanitizeComanda(codLimpo);
        if (targetSanit) {
            const matchComanda = fila.find(p => sanitizeComanda(p.comanda) === targetSanit);
            if (matchComanda) {
                return matchComanda.id_interno;
            }
        }

        if (codLimpo.length >= 6 && /^\d+$/.test(codLimpo)) {
            return codLimpo;
        }

        return null;
    }

    function despacharSubLoteNoSisfood(nomeMotoboy, idMotoboy, idsChunk, comandosChunk) {
        return new Promise((resolve) => {
            const urlDespacho = window.location.pathname.replace('/tela', '') + "/statusPedidosLote";
            const idsFormatados = idsChunk.join(',');
            const arrayPedidosFormatado = encodeURIComponent(idsFormatados); 
            const form = "pedidos=" + arrayPedidosFormatado + "&status=entrega&cod_motoboy=" + encodeURIComponent(idMotoboy);

            const visualComandas = comandosChunk.map(c => {
                if (c.comanda_diaria) return '#' + c.comanda_diaria;
                const match = (window._pedidosFilaSisfood || []).find(p => p.id_interno === c.cod_pedido_interno);
                if (match && match.comanda) return '#' + match.comanda;
                return '#' + c.cod_pedido_interno;
            }).join(', ');

            console.log(`🚀 [FILALAB SUZANO] Despachando Sub-lote 2x2 (${visualComandas}) para ${nomeMotoboy}...`);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", urlDespacho, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.onreadystatechange = async function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        if (this.responseText && (this.responseText.includes('<!DOCTYPE') || this.responseText.includes('<html') || this.responseText.includes('login'))) {
                            console.error("❌ [FILALAB SUZANO] Sessão do Sisfood expirou!");
                            hudLog("❌ Sessão do Sisfood expirou! Faça login.", "error");
                            return resolve(false);
                        }

                        let erroSisfood = false;
                        try {
                            const jsonResp = JSON.parse(this.responseText);
                            if (jsonResp && (jsonResp.status === false || jsonResp.erro === true || jsonResp.error)) {
                                erroSisfood = true;
                                console.error("❌ [FILALAB SUZANO] Sisfood recusou:", jsonResp);
                            }
                        } catch (e) {}

                        if (!erroSisfood) {
                            for (let cmd of comandosChunk) {
                                await patchSupabaseStatus(cmd.id, 'EXECUTADO');
                            }
                            console.log(`✅ [FILALAB SUZANO] Sub-lote [${visualComandas}] baixado!`);
                            hudLog(`✅ Comanda(s) [${visualComandas}] despachada(s) ➔ ${nomeMotoboy}`, "success");
                            resolve(true);
                        } else {
                            hudLog(`❌ Sisfood rejeitou baixa das comandas [${visualComandas}]`, "error");
                            resolve(false);
                        }
                    } else {
                        hudLog(`❌ Erro no Sisfood: HTTP ${this.status}`, "error");
                        resolve(false);
                    }
                }
            };
            xhr.send(form);
        });
    }

    async function despacharGrupoNoSisfood(nomeMotoboy, comandos) {
        const idsResolvidos = [];
        const comandosParaAtualizar = [];

        for (let cmd of comandos) {
            const codRaw = cmd.cod_pedido_interno ? cmd.cod_pedido_interno.replace(/\s+/g, '') : '';
            const idResolvido = resolverIdPedido(codRaw);
            const numVisual = cmd.comanda_diaria ? '#' + cmd.comanda_diaria : '#' + codRaw;

            if (idResolvido) {
                idsResolvidos.push(idResolvido);
                comandosParaAtualizar.push(cmd);
                delete window._retryCountsComandas[cmd.id];
            } else {
                window._retryCountsComandas[cmd.id] = (window._retryCountsComandas[cmd.id] || 0) + 1;
                const tentativas = window._retryCountsComandas[cmd.id];

                if (tentativas > 15) {
                    hudLog(`⚠️ Comanda ${numVisual} não apareceu no Sisfood após 1 min. Cancelada.`, "warn");
                    await patchSupabaseStatus(cmd.id, 'IGNORADO', 'Expirou aguardando aparecer na fila do Sisfood');
                    delete window._retryCountsComandas[cmd.id];
                } else {
                    hudLog(`⏳ Aguardando comanda ${numVisual} aparecer na tela (${tentativas}/15)...`, "info");
                }
            }
        }

        if (idsResolvidos.length === 0) {
            return false;
        }

        const idMotoboy = findMotoboyIdByName(nomeMotoboy);
        if (!idMotoboy) {
            console.warn(`🛑 [FILALAB SUZANO] TRAVA ATIVA: Motoboy "${nomeMotoboy}" não encontrado no DOM.`);
            hudLog(`🛑 Despacho travado: Motoboy "${nomeMotoboy}" não localizado na tela!`, "warn");

            const refreshBtn = document.querySelector('button[title*="Atualizar"], a[title*="Atualizar"], .btn-refresh');
            if (refreshBtn) {
                try { refreshBtn.click(); } catch (e) {}
            }

            window._retryCountsMotoboy[nomeMotoboy] = (window._retryCountsMotoboy[nomeMotoboy] || 0) + 1;
            if (window._retryCountsMotoboy[nomeMotoboy] > 6) {
                hudLog(`❌ Motoboy "${nomeMotoboy}" não encontrado no Sisfood!`, "error");
                for (let cmd of comandosParaAtualizar) {
                    await patchSupabaseStatus(cmd.id, 'ERRO_MOTOBOY_NAO_ENCONTRADO', `Motoboy ${nomeMotoboy} não encontrado`);
                }
                delete window._retryCountsMotoboy[nomeMotoboy];
            }
            return false;
        }

        delete window._retryCountsMotoboy[nomeMotoboy];

        // DIVISÃO EM LOTES DE NO MÁXIMO 2 EM 2
        const LOTE_MAX = 2;
        for (let i = 0; i < comandosParaAtualizar.length; i += LOTE_MAX) {
            const chunkComandos = comandosParaAtualizar.slice(i, i + LOTE_MAX);
            const chunkIds = idsResolvidos.slice(i, i + LOTE_MAX);

            await despacharSubLoteNoSisfood(nomeMotoboy, idMotoboy, chunkIds, chunkComandos);

            if (i + LOTE_MAX < comandosParaAtualizar.length) {
                await new Promise(r => setTimeout(r, 700));
            }
        }

        return true;
    }

    // ==========================================
    // ⏱️ [PARTE 3: POLLING] Varredura Periódica de Comandos
    // ==========================================
    async function pollComandos() {
        try {
            const resp = await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_id=eq." + UNIDADE_ID, {
                headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
            });
            
            if (resp.ok) {
                const comandos = await resp.json();
                if (!comandos || comandos.length === 0) return;

                const grupos = {};
                for (let cmd of comandos) {
                    const motoboyKey = cmd.nome_motoboy || 'Sem Motoboy';
                    if (!grupos[motoboyKey]) {
                        grupos[motoboyKey] = [];
                    }
                    grupos[motoboyKey].push(cmd);
                }

                for (let nomeMotoboy in grupos) {
                    const cmdsGrupo = grupos[nomeMotoboy];
                    await despacharGrupoNoSisfood(nomeMotoboy, cmdsGrupo);
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        } catch (e) {
            console.error("Erro no polling de comandos:", e);
        }
    }

    setInterval(pollComandos, 4000);
})();
