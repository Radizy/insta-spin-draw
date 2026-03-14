import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link as LinkIcon, Download, Code2, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQueryClient, useMutation } from '@tanstack/react-query';

interface WebhookConfigProps {
  overrideUnidadeId?: string;
}

export function WebhookConfig({ overrideUnidadeId }: WebhookConfigProps) {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const unidadeId = overrideUnidadeId || user?.unidadeId;

  const { data: franquiaConfig } = useQuery({
    queryKey: ['franquia-config', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return null;
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return (data?.config_pagamento as any) || {};
    },
    enabled: !!user?.franquiaId,
    staleTime: 10 * 60 * 1000,
  });

  // Query para verificar se o módulo está ativo para esta unidade específica
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

  const copyScript = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopied(true);
    toast.success('Script copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getSisfoodScript = () => {
    return `// ==UserScript==
// @name         Integração SISFOOD x FilaLab (\${selectedUnit || 'LOJA'})
// @namespace    http://tampermonkey.net/
// @version      11.1 (Despacho Universal Anti-Zumbi)
// @description  Intercepta fila do Sisfood e Despacha com proteção ZUMBI
// @match        https://app.sisfood.com.br/*/pdv*
// @match        https://app.sisfood.com.br/*/secretaria/atendimentos/tela*
// @grant        none
// ==/UserScript==

(function() {
    const API_FILALAB = "https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/sisfood-webhook";
    const SUPABASE_URL = "\${import.meta.env.VITE_SUPABASE_URL}";
    const ANON_KEY = "\${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}";
    
    const LOJA_FIXA = "\${selectedUnit || 'NomeDaLojaAqui'}";
    const UNIDADE_ID_FIXA = "\${unidadeId || ''}";
    
    let ultimaHashFila = "";
    let ultimaContagemFila = -1;
    
    // VARIÁVEL DE SEGURANÇA MÁXIMA PARA EVITAR DESPACHOS DE PEDIDOS ZUMBIS
    window._filaAtualSisfood = []; 

    // ----- [PARTE 1: LEITURA] Interceptador de Rede invisível para sincronizar a fila -----
    const XHR = XMLHttpRequest.prototype;
    const send = XHR.send;

    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            if (this._url && this._url.includes('/listarJson')) {
                try {
                    const data = JSON.parse(this.responseText);
                    let contagemFila = 0;
                    const pedidosNaFila = [];
                    window._filaAtualSisfood = []; // Reseta a cada passada da tela
                    
                    if (data.pedidos && Array.isArray(data.pedidos)) {
                        data.pedidos.forEach(pedido => {
                            const status = pedido[4]; 
                            if (status === "Fila" || status === "fila") {
                                contagemFila++;
                                // O Sisfood salva [0] como ID longo nas filiais, mas pode ser Comanda na Matriz.
                                // Na v11.0 a gente padroniza: id é sempre [0], comanda é [7]
                                
                                const pedidoClean = {
                                    id: pedido[0],
                                    id_interno: pedido[0],
                                    comanda: pedido[7] || pedido[0],
                                    hora_entrada: pedido[2] || '', 
                                    cliente: pedido[3] ? pedido[3].split(' / ')[0].trim() : 'Desconhecido',
                                    telefone: pedido[3] && pedido[3].includes('/') ? pedido[3].split(' / ')[1].trim() : '',
                                    endereco: pedido[9] || ''
                                };
                                
                                pedidosNaFila.push(pedidoClean);
                                window._filaAtualSisfood.push(String(pedido[0]).trim()); // Lista VIP de quem PODE ser despachado
                            }
                        });
                    }

                    const hashAtual = JSON.stringify(pedidosNaFila);

                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log("🟢 [FILALAB] Fila atualizada: " + contagemFila + " pedidos ativos na tela.");
                        ultimaHashFila = hashAtual;
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila, pedidosNaFila);
                    }
                } catch(err) { }
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
                body: JSON.stringify({ loja: lojaNome, fila: filaCount, pedidos_fila: pedidosFila, sistema: "SISFOOD_V11" })
            });
        } catch (e) {
            console.error("❌ [FILALAB] Erro de Rede sincronizando Fila:", e);
        }
    }

    // ----- [PARTE 2: ESCRITA] Polling FilaLab -> Sisfood -----
    
    function findMotoboyIdByName(targetName) {
        const normalTarget = targetName.toLowerCase().trim();
        const todosElementosTexto = Array.from(document.querySelectorAll('*'))
            .filter(el => {
                if(el.children.length === 0 && el.textContent) {
                    return el.textContent.toLowerCase().includes(normalTarget);
                }
                return false;
            });

        for (let baseEl of todosElementosTexto) {
            let prnt = baseEl;
            for(let i=0; i<3; i++) { 
                if(prnt) {
                    if(prnt.value && !isNaN(prnt.value)) return prnt.value;
                    if(prnt.dataset && prnt.dataset.id) return prnt.dataset.id;
                }
                prnt = prnt.parentElement;
            }
        }
        
        const forms = document.querySelectorAll("select option");
        for(let opt of forms) {
             if(opt.textContent.toLowerCase().includes(normalTarget)) return opt.value;
        }

        const btns = document.querySelectorAll("button, div.card");
        for(let b of btns) {
             if(b.textContent.toLowerCase().includes(normalTarget)) {
                 if(b.value) return b.value;
             }
        }
        return null;
    }

    async function patchSupabaseStatus(cmdId, newStatus) {
         try {
             await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?id=eq." + cmdId, {
                  method: 'PATCH',
                  headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
                  body: JSON.stringify({ status: newStatus })
             });
             return true;
         } catch(e) { return false; }
    }

    async function despacharPedidoNoSisfood(cmd) {
         return new Promise(async (resolve) => {
             const codigosLimpos = cmd.cod_pedido_interno.replace(/\\s+/g, '');
             
             // TRAVA ZUMBI [V11.0] - Se o Sisfood original JÁ TIROU o pedido da Fila visual, nós abortamos pra não ressuscitar a comanda!
             if (!window._filaAtualSisfood.includes(codigosLimpos)) {
                 console.warn("🛡️ [FILALAB Zumbi-Lock] O pedido " + codigosLimpos + " não está mais 'Na Fila' do Sisfood (provavelmente já alterado manualmente ou cancelado). Marcando comando FilaLab como IGNORADO.");
                 await patchSupabaseStatus(cmd.id, 'IGNORADO');
                 return resolve(true); // Termina com sucesso pra não repetir polling
             }

             const idMotoboyFinal = findMotoboyIdByName(cmd.nome_motoboy);
             
             if(!idMotoboyFinal && !window._avisoMotoboyNaoAchado) {
                  console.warn("[FILALAB] Botão do motoboy " + cmd.nome_motoboy + " não achado no DOM.");
                  window._avisoMotoboyNaoAchado = true; 
                  return resolve(false); // Retorna false pra tentar de novo dps
             }
             
             const basePath = window.location.pathname.replace('/tela', '').replace('/pdv', '');
             
             // ================== ROTA UNIVERSAL (STATUS + VINCULO SEQUENCIAL) ==================
             const urlStatus = basePath + "/pdv/statusPedido";
             const urlMotoboy = basePath + "/pdv/motoboy";
             
             const formStatus = "cod="+encodeURIComponent(codigosLimpos)+"&status=entrega";
             const formMotoboy = "cod_pedido="+encodeURIComponent(codigosLimpos)+"&cod_motoboy="+encodeURIComponent(idMotoboyFinal || "40")+"&nome_motoboy="+encodeURIComponent(cmd.nome_motoboy);

             const xhrStatus = new XMLHttpRequest();
             xhrStatus.open("POST", urlStatus, true);
             xhrStatus.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
             xhrStatus.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

             xhrStatus.onreadystatechange = function () {
                  if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                       const xhrMotoboy = new XMLHttpRequest();
                       xhrMotoboy.open("POST", urlMotoboy, true);
                       xhrMotoboy.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                       xhrMotoboy.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                       
                       xhrMotoboy.onreadystatechange = async function() {
                           if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                               await patchSupabaseStatus(cmd.id, 'EXECUTADO');
                               console.log("✅ [FILALAB] Pedido " + codigosLimpos + " despachado (Universal).");
                               setTimeout(()=> {
                                  const refreshBtn = document.querySelector('button[title*="Atualizar"], a[title*="Atualizar"]');
                                  if(refreshBtn) refreshBtn.click();
                               }, 700);
                               resolve(true);
                           } else if (this.readyState === XMLHttpRequest.DONE) {
                               console.error("❌ Falha Vinculo Motoboy HTTP " + this.status);
                               resolve(false);
                           }
                       };
                       xhrMotoboy.send(formMotoboy);
                  } else if (this.readyState === XMLHttpRequest.DONE) {
                       console.error("❌ Falha Status Pedido HTTP " + this.status);
                       resolve(false);
                  }
             }
             xhrStatus.send(formStatus);
         });
    }

    async function pollComandosDoFilaLab() {
         try {
             const endpointUrl = UNIDADE_ID_FIXA 
                ? "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_id=eq." + UNIDADE_ID_FIXA
                : "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_nome=eq." + encodeURIComponent(LOJA_FIXA);

             const resp = await fetch(SUPABASE_URL + endpointUrl, {
                 headers: { "apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY }
             });
             
             if(resp.ok) {
                 const comandosPendentes = await resp.json();
                 
                 for(let cmd of comandosPendentes) {
                     await despacharPedidoNoSisfood(cmd);
                     await new Promise(r => setTimeout(r, 600)); 
                 }
                 
                 if (comandosPendentes.length > 0 && typeof window.gc === "function") {
                     window.gc(); // Sweep
                 }
             }
         } catch(e) { }
    }

    // Iniciar loop infinito observador de Comandos a cada 4 segundos (Tempo Snappy e seguro)
    setInterval(pollComandosDoFilaLab, 4000);

})();\`;
  };Interval(pollComandosDoFilaLab, 10000);

})();`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold font-mono text-muted-foreground">Integrações Genéricas</h2>
        <p className="text-sm text-muted-foreground">
          As configurações de Nome da Loja foram movidas permanentemente para a aba "Dados da Loja".
        </p>
      </div>

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
                      Script de Envio
                    </h3>
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
    </div>
  );
}
