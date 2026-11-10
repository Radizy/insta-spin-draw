import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link as LinkIcon, Download, Code2, Copy, CheckCircle2, Smartphone, QrCode, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// Saipos script template (still file-based, uses placeholders)
import scriptSaiposRaw from '../../tampermonkey_saipos.js?raw';

const SUPABASE_URL_FILALAB = 'https://kegbvaikqelwezpehlhf.supabase.co';
const ANON_KEY_FILALAB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2J2YWlrcWVsd2V6cGVobGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDc4MzUsImV4cCI6MjA4NzIyMzgzNX0.hIRjDR4D6p8RAsnWMhkF1stRDr_oa0yMsqukCPADyh0';

interface WebhookConfigProps {
  overrideUnidadeId?: string;
}

export function WebhookConfig({ overrideUnidadeId }: WebhookConfigProps) {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const unidadeId = overrideUnidadeId || user?.unidadeId;

  const { data: franquiaConfig } = useQuery<any>({
    queryKey: ['franquia-config', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return null;
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      const config = (data?.config_pagamento as any) || {};
      return {
        config_pagamento: config,
        ...config
      };
    },
    enabled: !!user?.franquiaId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: unidadeModulo } = useQuery({
    queryKey: ['unidade-modulo-sisfood', unidadeId],
    queryFn: async () => {
      if (!unidadeId) return null;
      const { data, error } = await supabase
        .from('unidade_modulos')
        .select('*')
        .eq('unidade_id', unidadeId)
        .eq('modulo_codigo', 'sisfood_integration')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: saiposModulo } = useQuery({
    queryKey: ['unidade-modulo-saipos', unidadeId],
    queryFn: async () => {
      if (!unidadeId) return null;
      const { data, error } = await supabase
        .from('unidade_modulos')
        .select('*')
        .eq('unidade_id', unidadeId)
        .eq('modulo_codigo', 'saipos_integration')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: unitData } = useQuery({
    queryKey: ['unidade-detalhe-script', unidadeId, selectedUnit],
    queryFn: async () => {
      if (!unidadeId && !selectedUnit) return null;
      let query = supabase.from('unidades').select('id, nome_loja, slug');
      if (unidadeId) {
        query = query.eq('id', unidadeId);
      } else if (selectedUnit) {
        query = query.or(`slug.eq.${selectedUnit},nome_loja.eq.${selectedUnit}`);
      }
      const { data, error } = await query.maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!(unidadeId || selectedUnit),
  });

  const toggleMutation = useMutation({
    mutationFn: async (ativo: boolean) => {
      if (!unidadeId) return;

      if (unidadeModulo) {
        const { error } = await supabase
          .from('unidade_modulos')
          .update({ ativo })
          .eq('id', unidadeModulo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('unidade_modulos')
          .insert({
            unidade_id: unidadeId,
            modulo_codigo: 'sisfood_integration',
            ativo,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidade-modulo-sisfood', unidadeId] });
      toast.success('Configuração da unidade atualizada!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar módulo da unidade:', error);
      toast.error('Erro ao salvar configuração.');
    }
  });

  const toggleSaiposMutation = useMutation({
    mutationFn: async (ativo: boolean) => {
      if (!unidadeId) return;

      if (saiposModulo) {
        const { error } = await supabase
          .from('unidade_modulos')
          .update({ ativo })
          .eq('id', saiposModulo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('unidade_modulos')
          .insert({
            unidade_id: unidadeId,
            modulo_codigo: 'saipos_integration',
            ativo,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidade-modulo-saipos', unidadeId] });
      toast.success('Integração Saipos atualizada!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar Saipos:', error);
      toast.error('Erro ao salvar configuração.');
    }
  });

  if (!user || !unidadeId) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const modulosAtivos = franquiaConfig?.modulos_ativos || [];
  const isSisfoodGlobalAtivo = modulosAtivos.includes('sisfood_integration');
  const isSisfoodUnidadeAtivo = unidadeModulo?.ativo ?? false;

  const isSaiposGlobalAtivo = modulosAtivos.includes('saipos_integration');
  const isSaiposUnidadeAtivo = saiposModulo?.ativo ?? false;

  const copyScript = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopied(true);
    toast.success('Script copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getSisfoodScript = () => {
    const finalUnitId = unitData?.id || unidadeId;
    const finalLojaNome = unitData?.nome_loja || selectedUnit || user?.unidade || 'Loja';
    const finalLojaSlug = unitData?.slug || selectedUnit || user?.unidade || 'LOJA';
    const finalLojaTag = finalLojaSlug.toUpperCase();
    const versao = '14.1';

    if (!finalUnitId) {
      return `// Selecione uma loja no topo do painel para gerar o script.`;
    }

    return `// ==UserScript==
// @name         Integração SISFOOD x FilaLab (${finalLojaTag}) - v${versao} (Filtro Diário & Re-despacho)
// @namespace    http://tampermonkey.net/
// @version      ${versao}
// @description  Script gerado automaticamente pelo FilaLab para a loja ${finalLojaNome} com isolamento diário e re-despacho inteligente.
// @match        https://app.sisfood.com.br/*
// @grant        none
// ==/UserScript==

(function() {
    console.log("🚀 [FILALAB ${finalLojaTag} v${versao}] Filtro Diário & Re-despacho Inteligente Iniciado!");

    const API_FILALAB = "${SUPABASE_URL_FILALAB}/functions/v1/sisfood-webhook";
    const SUPABASE_URL = "${SUPABASE_URL_FILALAB}";
    const ANON_KEY = "${ANON_KEY_FILALAB}";
    
    // CONFIGURAÇÃO DA UNIDADE (ISOLAMENTO GARANTIDO)
    const LOJA_FIXA = "${finalLojaNome}";
    const UNIDADE_ID = "${finalUnitId}";
    
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
        hud.innerHTML = \`
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
                    <span>FilaLab ${finalLojaNome} <span style="font-size:10px; color:#10b981; font-weight:normal;">v${versao}</span></span>
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
                    <div class="filalab-hud-log info">🟢 Integração v${versao} pronta (Filtro Diário & Bags ativas)</div>
                </div>
            </div>
        \`;

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
                iconeHtml = \`<img src="\${bag.icone_url}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 3px;" />\`;
            } else if (nomeLower.includes('trem') || nomeLower.includes('metro')) {
                iconeHtml = '🚆';
            } else if (nomeLower.includes('pizza') || nomeLower.includes('grande')) {
                iconeHtml = '🍕';
            }

            html += \`
                <div class="filalab-bag-card" data-bag-nome="\${bag.nome}" style="flex: 1; min-width: 90px; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; user-select: none; transition: all 0.15s; \${borderStyle}">
                    <span>\${iconeHtml}</span>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${bag.nome}</span>
                </div>
            \`;
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
            area.innerHTML = \`
                <span style="font-size: 10px; color: #6b7280; font-style: italic;">
                    Digite o nº e dê [Enter] para empilhar. Dê [Enter] vazio para despachar.
                </span>
            \`;
            if (btn) btn.innerHTML = \`<span>🚀 Chamar Motoboy & Baixar (2 em 2)</span>\`;
            return;
        }

        let html = '';
        window._comandasNaFilaHUD.forEach((comanda, idx) => {
            html += \`
                <span class="filalab-chip">
                    #\${comanda}
                    <span class="filalab-chip-remove" data-index="\${idx}" title="Remover esta comanda">✕</span>
                </span>
            \`;
        });

        html += \`
            <span id="filalab-btn-limpar-chips" style="font-size: 10px; color: #9ca3af; text-decoration: underline; cursor: pointer; margin-left: 6px;">
                Limpar (\${window._comandasNaFilaHUD.length})
            </span>
        \`;

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
            btn.innerHTML = \`<span>🚀 Chamar Motoboy & Baixar (\${window._comandasNaFilaHUD.length} comanda\${window._comandasNaFilaHUD.length > 1 ? 's' : ''})</span>\`;
        }
    }

    function adicionarComandasHUD(texto) {
        if (!texto) return;
        const partes = texto.split(/[, ; \\n]+/).map(s => s.trim().replace(/^#+/, '')).filter(Boolean);
        
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
            item.className = \`filalab-hud-log \${type}\`;
            item.innerHTML = \`<span style="opacity:0.6;">\${timeStr}</span> <span>\${msg}</span>\`;

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
                        opt.textContent = \`\${idx + 1}º \${m.nome}\`;
                        select.appendChild(opt);
                    });

                    if (valorAnterior && select.querySelector(\`option[value="\${valorAnterior}"]\`)) {
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
        const nomeMotoboy = motoboyObj ? motoboyObj.nome : select.options[select.selectedIndex]?.text.replace(/^\\d+º\\s*/, '');
        const bagNomeFinal = window._bagSelecionada || 'Bag Normal';

        btn.disabled = true;
        btn.innerHTML = \`<span>⏳ Despachando...</span>\`;

        hudLog(\`🏍️ Chamando \${nomeMotoboy} [\${bagNomeFinal}] com comandas [#\${comandasArray.join(', #')}]...\`, "info");

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
                const idResolvido = resolverIdPedido(comanda, comanda);
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
            .replace(/[\\u0300-\\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ' ')
            .replace(/\\s+/g, ' ')
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

                    hudUpdateInfo(\`Fila Sisfood: \${contagemFila} pedidos | Monitorando\`);

                    const hashAtual = JSON.stringify(pedidosNaFila);
                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log("🟢 [FILALAB " + LOJA_FIXA.toUpperCase() + "] Fila atualizada: " + contagemFila + " pedidos.");
                        ultimaHashFila = hashAtual;
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila, pedidosNaFila);
                    }
                } catch(err) {
                    console.error("❌ [FILALAB " + LOJA_FIXA.toUpperCase() + "] Erro ao ler JSON da fila:", err);
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
                    sistema: "SISFOOD_V14_1" 
                })
            });
        } catch (e) {
            console.error("❌ [FILALAB " + LOJA_FIXA.toUpperCase() + "] Erro de Rede ao enviar Fila:", e);
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

    function resolverIdPedido(codRaw, comandaDiaria = null) {
        const fila = window._pedidosFilaSisfood || [];
        const codLimpo = codRaw ? String(codRaw).trim() : '';
        const comandaLimpa = comandaDiaria ? String(comandaDiaria).trim() : '';

        // 1. Tenta casar com ID interno exato que está ATUALMENTE na fila do Sisfood
        if (codLimpo) {
            const matchId = fila.find(p => String(p.id_interno).trim() === codLimpo);
            if (matchId) return matchId.id_interno;
        }

        // 2. Tenta casar pelo número da comanda diária que está na fila atual do Sisfood
        // Isso garante que se a comanda 8 já foi despachada mas AINDA está na fila, ela é resolvida para tentar despachar de novo!
        if (comandaLimpa) {
            const targetComanda = sanitizeComanda(comandaLimpa);
            if (targetComanda) {
                const matchComanda = fila.find(p => sanitizeComanda(p.comanda) === targetComanda);
                if (matchComanda) return matchComanda.id_interno;
            }
        }

        // 3. Tenta casar se codLimpo for o próprio número da comanda (ex: digitou "8")
        if (codLimpo) {
            const targetSanit = sanitizeComanda(codLimpo);
            if (targetSanit) {
                const matchComanda = fila.find(p => sanitizeComanda(p.comanda) === targetSanit);
                if (matchComanda) return matchComanda.id_interno;
            }
        }

        // 4. Se for ID interno longo (>= 6 dígitos) e não achou na fila, usa diretamente
        if (codLimpo.length >= 6 && /^\\d+$/.test(codLimpo)) {
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

            console.log(\`🚀 [FILALAB \${LOJA_FIXA.toUpperCase()}] Despachando Sub-lote 2x2 (\${visualComandas}) para \${nomeMotoboy}...\`);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", urlDespacho, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.onreadystatechange = async function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    if (this.status === 200) {
                        if (this.responseText && (this.responseText.includes('<!DOCTYPE') || this.responseText.includes('<html') || this.responseText.includes('login'))) {
                            console.error("❌ [FILALAB " + LOJA_FIXA.toUpperCase() + "] Sessão do Sisfood expirou!");
                            hudLog("❌ Sessão do Sisfood expirou! Faça login.", "error");
                            return resolve(false);
                        }

                        let erroSisfood = false;
                        try {
                            const jsonResp = JSON.parse(this.responseText);
                            if (jsonResp && (jsonResp.status === false || jsonResp.erro === true || jsonResp.error)) {
                                erroSisfood = true;
                                console.error("❌ [FILALAB " + LOJA_FIXA.toUpperCase() + "] Sisfood recusou:", jsonResp);
                            }
                        } catch (e) {}

                        if (!erroSisfood) {
                            for (let cmd of comandosChunk) {
                                await patchSupabaseStatus(cmd.id, 'EXECUTADO');
                            }
                            console.log(\`✅ [FILALAB \${LOJA_FIXA.toUpperCase()}] Sub-lote [\${visualComandas}] baixado!\`);
                            hudLog(\`✅ Comanda(s) [\${visualComandas}] despachada(s) ➔ \${nomeMotoboy}\`, "success");
                            resolve(true);
                        } else {
                            hudLog(\`❌ Sisfood rejeitou baixa das comandas [\${visualComandas}]\`, "error");
                            resolve(false);
                        }
                    } else {
                        hudLog(\`❌ Erro no Sisfood: HTTP \${this.status}\`, "error");
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
            const codRaw = cmd.cod_pedido_interno ? cmd.cod_pedido_interno.replace(/\\s+/g, '') : '';
            const idResolvido = resolverIdPedido(codRaw, cmd.comanda_diaria);
            const numVisual = cmd.comanda_diaria ? '#' + cmd.comanda_diaria : '#' + codRaw;

            if (idResolvido) {
                idsResolvidos.push(idResolvido);
                comandosParaAtualizar.push(cmd);
                delete window._retryCountsComandas[cmd.id];
            } else {
                window._retryCountsComandas[cmd.id] = (window._retryCountsComandas[cmd.id] || 0) + 1;
                const tentativas = window._retryCountsComandas[cmd.id];

                if (tentativas > 15) {
                    hudLog(\`⚠️ Comanda \${numVisual} não apareceu no Sisfood após 1 min. Cancelada.\`, "warn");
                    await patchSupabaseStatus(cmd.id, 'IGNORADO', 'Expirou aguardando aparecer na fila do Sisfood');
                    delete window._retryCountsComandas[cmd.id];
                } else {
                    hudLog(\`⏳ Aguardando comanda \${numVisual} aparecer na tela (\${tentativas}/15)...\`, "info");
                }
            }
        }

        if (idsResolvidos.length === 0) {
            return false;
        }

        const idMotoboy = findMotoboyIdByName(nomeMotoboy);
        if (!idMotoboy) {
            console.warn(\`🛑 [FILALAB \${LOJA_FIXA.toUpperCase()}] TRAVA ATIVA: Motoboy "\${nomeMotoboy}" não encontrado no DOM.\`);
            hudLog(\`🛑 Despacho travado: Motoboy "\${nomeMotoboy}" não localizado na tela!\`, "warn");

            const refreshBtn = document.querySelector('button[title*="Atualizar"], a[title*="Atualizar"], .btn-refresh');
            if (refreshBtn) {
                try { refreshBtn.click(); } catch (e) {}
            }

            window._retryCountsMotoboy[nomeMotoboy] = (window._retryCountsMotoboy[nomeMotoboy] || 0) + 1;
            if (window._retryCountsMotoboy[nomeMotoboy] > 6) {
                hudLog(\`❌ Motoboy "\${nomeMotoboy}" não encontrado no Sisfood!\`, "error");
                for (let cmd of comandosParaAtualizar) {
                    await patchSupabaseStatus(cmd.id, 'ERRO_MOTOBOY_NAO_ENCONTRADO', \`Motoboy \${nomeMotoboy} não encontrado\`);
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
    // ⏱️ [PARTE 3: POLLING] Varredura Periódica de Comandos (Apenas do Dia Atual)
    // ==========================================
    function getInicioDoDiaLocalISO() {
        const d = new Date();
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        // 00:00:00 da data local do restaurante (America/Sao_Paulo)
        return \`\${ano}-\${mes}-\${dia}T00:00:00\`;
    }

    let _ultimaLimpezaDia = "";

    async function limparComandosDiasAnteriores() {
        const hojeStr = new Date().toISOString().split('T')[0];
        if (_ultimaLimpezaDia === hojeStr) return;
        _ultimaLimpezaDia = hojeStr;

        const inicioDia = getInicioDoDiaLocalISO();
        try {
            console.log("🧹 [FILALAB] Expirando comandos pendentes de dias anteriores à data de hoje...");
            await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_id=eq." + UNIDADE_ID + "&created_at=lt." + encodeURIComponent(inicioDia), {
                method: 'PATCH',
                headers: {
                    "apikey": ANON_KEY,
                    "Authorization": "Bearer " + ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: 'IGNORADO',
                    observacao: 'Expirado automaticamente na virada de dia'
                })
            });
        } catch (e) {
            console.error("Erro ao expirar comandos anteriores:", e);
        }
    }

    async function pollComandos() {
        try {
            await limparComandosDiasAnteriores();

            const inicioDia = getInicioDoDiaLocalISO();
            const urlQuery = SUPABASE_URL + "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_id=eq." + UNIDADE_ID + "&created_at=gte." + encodeURIComponent(inicioDia);
            const resp = await fetch(urlQuery, {
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
`;
  };

  const getSaiposScript = () => {
    if (!selectedUnit) return `// Selecione uma loja no topo do painel`;
    let raw = scriptSaiposRaw;
    raw = raw.replace('{{NOME_DA_LOJA}}', selectedUnit);
    raw = raw.replace('{{WEBHOOK_URL}}', 'https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/webhook-saipos');
    raw = raw.replace('{{API_KEY}}', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2J2YWlrcWVsd2V6cGVobGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDc4MzUsImV4cCI6MjA4NzIyMzgzNX0.hIRjDR4D6p8RAsnWMhkF1stRDr_oa0yMsqukCPADyh0');
    return raw;
  };

  const [waStatus, setWaStatus] = useState<'loading' | 'connected' | 'disconnected' | 'error'>('loading');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [waLoadingAction, setWaLoadingAction] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const GLOBAL_EVO_URL = import.meta.env.VITE_EVOLUTION_URL || 'https://api-evolution.default.com.br';
  const GLOBAL_EVO_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || 'default-api-key';

  const whatsappConfig = franquiaConfig?.whatsapp;
  
  const evoUrl = whatsappConfig?.url || GLOBAL_EVO_URL;
  const evoKey = whatsappConfig?.api_key || GLOBAL_EVO_KEY;
  const evoInstance = whatsappConfig?.instance || (user?.franquiaId ? `filalab_${user.franquiaId.replace(/-/g, '')}` : null);

  const isWhatsappEnabled = !!(evoUrl && evoKey && evoInstance);

  useEffect(() => {
    if (isWhatsappEnabled) {
      checkWaStatus();
    }
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [isWhatsappEnabled, evoUrl, evoKey, evoInstance]);

  const checkWaStatus = async () => {
    if (!evoUrl || !evoKey || !evoInstance) return;
    setWaStatus('loading');
    setWaQrCode(null);
    try {
      const res = await fetch(`${evoUrl}/instance/connectionState/${evoInstance}`, {
        headers: { apikey: evoKey }
      });
      if (res.status === 404) {
        setWaStatus('disconnected');
        return;
      }
      if (!res.ok) throw new Error('Erro ao verificar status');
      const data = await res.json();
      if (data?.instance?.state === 'open') {
        setWaStatus('connected');
      } else {
        setWaStatus('disconnected');
      }
    } catch (err) {
      console.error('Check Wa Status Error:', err);
      setWaStatus('error');
    }
  };

  const generateWaQrCode = async () => {
    if (!evoUrl || !evoKey || !evoInstance) return;
    setWaLoadingAction(true);
    try {
      let res = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
        headers: { apikey: evoKey }
      });

      if (res.status === 404) {
        const createRes = await fetch(`${evoUrl}/instance/create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            apikey: evoKey 
          },
          body: JSON.stringify({
            instanceName: evoInstance,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        });
        if (!createRes.ok) throw new Error('Erro ao criar instância');
        const createData = await createRes.json();
        
        if (createData?.qrcode?.base64) {
          setWaQrCode(createData.qrcode.base64);
          setWaStatus('disconnected');
        } else if (createData?.base64) {
           setWaQrCode(createData.base64);
           setWaStatus('disconnected');
        } else {
           res = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
             headers: { apikey: evoKey }
           });
           const connectData = await res.json();
           if (connectData?.base64) setWaQrCode(connectData.base64);
        }
      } else if (!res.ok) {
        throw new Error('Erro ao conectar');
      } else {
        const data = await res.json();
        if (data?.base64) {
          setWaQrCode(data.base64);
          setWaStatus('disconnected');
        } else if (data?.instance?.state === 'open') {
          setWaStatus('connected');
        }
      }

      startPolling();
    } catch (err) {
      console.error('Generate QR Code Error:', err);
      toast.error('Erro ao gerar QR Code. Verifique se a Evolution API está acessível e as credenciais corretas.');
      setWaStatus('error');
    } finally {
      setWaLoadingAction(false);
    }
  };

  const disconnectWa = async () => {
    if (!evoUrl || !evoKey || !evoInstance) return;
    setWaLoadingAction(true);
    try {
      await fetch(`${evoUrl}/instance/logout/${evoInstance}`, {
        method: 'DELETE',
        headers: { apikey: evoKey }
      });
      setWaStatus('disconnected');
      setWaQrCode(null);
      if (pollingInterval) clearInterval(pollingInterval);
      toast.success('WhatsApp desconectado.');
    } catch (err) {
      console.error('Disconnect Error:', err);
      toast.error('Erro ao desconectar');
    } finally {
      setWaLoadingAction(false);
    }
  };

  const startPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${evoUrl}/instance/connectionState/${evoInstance}`, {
          headers: { apikey: evoKey }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.instance?.state === 'open') {
            setWaStatus('connected');
            setWaQrCode(null);
            clearInterval(interval);
            toast.success('WhatsApp conectado com sucesso!');
          }
        }
      } catch (e) {
      }
    }, 5000);
    setPollingInterval(interval);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold font-mono text-muted-foreground">Integrações Genéricas</h2>
        <p className="text-sm text-muted-foreground">
          As configurações de Nome da Loja foram movidas permanentemente para a aba "Dados da Loja".
        </p>
      </div>

      {isWhatsappEnabled && (
        <div className="bg-gradient-to-br from-card to-card/50 border border-green-500/20 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl shadow-green-500/5 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-500/5 rounded-xl border border-green-500/10 gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Conexão WhatsApp (Evolution API)
              </Label>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code para conectar o WhatsApp da franquia e habilitar o envio de mensagens automáticas.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {waStatus === 'connected' ? (
                <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Conectado
                </div>
              ) : waStatus === 'loading' ? (
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider border border-primary/20 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </div>
              ) : waStatus === 'error' ? (
                <div className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold uppercase tracking-wider border border-destructive/20 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Erro
                </div>
              ) : (
                <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/20 flex items-center gap-1">
                  <QrCode className="w-4 h-4" />
                  Desconectado
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-background/50 rounded-xl border border-border/50">
            {waStatus === 'connected' ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-10 h-10 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">Dispositivo Conectado</h3>
                  <p className="text-sm text-muted-foreground">Seu WhatsApp está pronto para enviar mensagens.</p>
                </div>
                <Button variant="destructive" onClick={disconnectWa} disabled={waLoadingAction}>
                  {waLoadingAction ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Desconectar WhatsApp
                </Button>
              </div>
            ) : waStatus === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Verificando status da conexão...</p>
              </div>
            ) : waQrCode ? (
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-border">
                  <img src={waQrCode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg">Leia o QR Code</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para a tela.
                  </p>
                </div>
                <Button variant="outline" onClick={generateWaQrCode} disabled={waLoadingAction}>
                  {waLoadingAction ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Gerar Novo QR Code
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                  <QrCode className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">Conecte seu Aparelho</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Para enviar mensagens automáticas, você precisa conectar o seu WhatsApp à plataforma gerando um QR Code.
                  </p>
                </div>
                <Button onClick={generateWaQrCode} disabled={waLoadingAction} className="mt-4">
                  {waLoadingAction ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                  Gerar QR Code de Conexão
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {isSisfoodGlobalAtivo && (
        <div className="bg-gradient-to-br from-card to-card/50 border border-primary/20 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl shadow-primary/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Uso por Unidade</Label>
              <p className="text-sm text-muted-foreground">
                Habilite esta opção para permitir que a unidade "{selectedUnit}" utilize a integração.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Switch
                checked={isSisfoodUnidadeAtivo}
                onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                disabled={toggleMutation.isPending}
              />
            </div>
          </div>

          {isSisfoodUnidadeAtivo && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <LinkIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
                      Integração SISFOOD
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-14">
                    Sincronize a fila de despacho do Sisfood ativamente com o painel do Roteirista e Mapa FilaLab.
                  </p>
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20">
                  Módulo Ativo
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold">Tutorial de Vinculação</h3>
                  <ol className="relative border-l border-primary/20 ml-3 space-y-8">
                    <li className="pl-6">
                      <div className="absolute w-6 h-6 bg-card rounded-full -left-3 border-2 border-primary flex items-center justify-center font-bold text-xs text-primary shadow-sm">1</div>
                      <h4 className="font-semibold text-foreground mb-1">Passo 1: Instale o Tampermonkey</h4>
                      <p className="text-sm text-muted-foreground mb-3">No navegador do seu terminal POS Caixa ou Expedição onde o Sisfood fica aberto, adicione a extensão Tampermonkey.</p>
                      <Button variant="outline" size="sm" asChild className="gap-2 h-8">
                        <a href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" target="_blank" rel="noopener noreferrer">
                          <Download className="w-3.5 h-3.5" />
                          Baixar no Google Chrome
                        </a>
                      </Button>
                    </li>
                    
                    <li className="pl-6">
                      <div className="absolute w-6 h-6 bg-card rounded-full -left-3 border-2 border-primary flex items-center justify-center font-bold text-xs text-primary shadow-sm">2</div>
                      <h4 className="font-semibold text-foreground mb-1">Passo 2: Crie o Script</h4>
                      <p className="text-sm text-muted-foreground">Clique no ícone do Tampermonkey no painel do navegador, vá em "Adicionar novo script" e apague todo o conteúdo que aparece lá por padrão.</p>
                    </li>
                    
                    <li className="pl-6">
                      <div className="absolute w-6 h-6 bg-card rounded-full -left-3 border-2 border-primary flex items-center justify-center font-bold text-xs text-primary shadow-sm">3</div>
                      <p className="text-sm text-muted-foreground">Copie o código customizado ao lado, cole na janela do script, e salve apertando <strong>Ctrl + S</strong>. Atualize (F5) a página do Sisfood.</p>
                    </li>
                  </ol>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-2">
                    <h4 className="text-sm font-bold text-yellow-600 dark:text-yellow-400">Atenção Crítica:</h4>
                    <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">
                      O Script ao lado foi gerado especificamente para a Loja <b>"{selectedUnit || 'SELECIONADA'}"</b>. Instale esse script apenas nessa operação, para que o roteamento de entregas não pareça no painel da cidade incorreta.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary" />
                      Script Tampermonkey (v14.1)
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const scriptContent = getSisfoodScript();
                          const blob = new Blob([scriptContent], { type: 'text/javascript' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `filalab_sisfood_${(unitData?.slug || selectedUnit || 'loja').toLowerCase()}_v14.1.user.js`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Download do script v14.1 iniciado!');
                        }}
                        className="h-8 gap-1.5 transition-all text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar .user.js
                      </Button>
                      <Button 
                        size="sm" 
                        variant={copied ? "default" : "secondary"}
                        onClick={() => copyScript(getSisfoodScript())}
                        className="h-8 gap-1.5 transition-all text-xs"
                      >
                        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copiado!' : 'Copiar Código'}
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <pre className="p-4 bg-[#1e1e1e] text-[#d4d4d4] rounded-xl text-xs overflow-auto max-h-[400px] font-mono border border-border/10 custom-scrollbar shadow-inner">
                      <code>{getSisfoodScript()}</code>
                    </pre>
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none rounded-b-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isSaiposGlobalAtivo && (
        <div className="bg-gradient-to-br from-card to-card/50 border border-primary/20 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl shadow-primary/5 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 gap-4">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Uso por Unidade (Saipos)</Label>
              <p className="text-sm text-muted-foreground">
                Habilite esta opção para permitir que a unidade "{selectedUnit}" utilize a integração com Saipos.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Switch
                checked={isSaiposUnidadeAtivo}
                onCheckedChange={(checked) => toggleSaiposMutation.mutate(checked)}
                disabled={toggleSaiposMutation.isPending}
              />
            </div>
          </div>

          {isSaiposUnidadeAtivo && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <LinkIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
                      Integração SAIPOS
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-14">
                    Integração transparente com o Kanban do Saipos (Modo Leitura).
                  </p>
                </div>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20">
                  Módulo Ativo
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold">Instalação Saipos</h3>
                  <ol className="relative border-l border-primary/20 ml-3 space-y-8">
                    <li className="pl-6">
                      <div className="absolute w-6 h-6 bg-card rounded-full -left-3 border-2 border-primary flex items-center justify-center font-bold text-xs text-primary shadow-sm">1</div>
                      <h4 className="font-semibold text-foreground mb-1">Passo 1: Instale o Tampermonkey</h4>
                      <p className="text-sm text-muted-foreground mb-3">No navegador que roda a página de Busca de Clientes (Kanban) do Saipos, adicione a extensão.</p>
                      <Button variant="outline" size="sm" asChild className="gap-2 h-8">
                        <a href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" target="_blank" rel="noopener noreferrer">
                          <Download className="w-3.5 h-3.5" />
                          Google Chrome
                        </a>
                      </Button>
                    </li>
                    
                    <li className="pl-6">
                      <div className="absolute w-6 h-6 bg-card rounded-full -left-3 border-2 border-primary flex items-center justify-center font-bold text-xs text-primary shadow-sm">2</div>
                      <h4 className="font-semibold text-foreground mb-1">Passo 2: Configure o Script</h4>
                      <p className="text-sm text-muted-foreground">Copie o script gerado dinamicamente para a loja <b>{selectedUnit}</b>, cole no Tampermonkey e salve!</p>
                    </li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary" />
                      Script Saipos Atual
                    </h3>
                    <Button 
                      size="sm" 
                      variant={copied ? "default" : "secondary"}
                      onClick={() => copyScript(getSaiposScript())}
                      className="h-8 gap-1.5 transition-all text-xs"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>
                  <div className="relative">
                    <pre className="p-4 bg-[#1e1e1e] text-[#d4d4d4] rounded-xl text-xs overflow-auto max-h-[400px] font-mono border border-border/10 custom-scrollbar shadow-inner">
                      <code>{getSaiposScript()}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
