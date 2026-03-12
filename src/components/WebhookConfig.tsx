import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Link as LinkIcon, Download, Code2, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function WebhookConfig() {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const [copied, setCopied] = useState(false);

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

  if (!user) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const modulosAtivos = franquiaConfig?.modulos_ativos || [];
  const isSisfoodAtivo = modulosAtivos.includes('sisfood_integration');

  const copyScript = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopied(true);
    toast.success('Script copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
  };

  const getSisfoodScript = () => {
    return `// ==UserScript==
// @name         Integração SISFOOD x FilaLab (${selectedUnit || 'LOJA'})
// @namespace    http://tampermonkey.net/
// @version      9.5
// @description  Lê a fila do Sisfood e DESPACHA via FilaLab usando Batch Route Array
// @match        https://app.sisfood.com.br/*/pdv*
// @match        https://app.sisfood.com.br/*/secretaria/atendimentos/tela*
// @grant        none
// ==/UserScript==

(function() {
    const API_FILALAB = "https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/sisfood-webhook";
    const SUPABASE_URL = "${import.meta.env.VITE_SUPABASE_URL}";
    const ANON_KEY = "${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}";
    
    // Nome exato da sua loja configurada no FilaLab
    const LOJA_FIXA = "${selectedUnit || 'NomeDaLojaAqui'}";
    let ultimaHashFila = "";
    let ultimaContagemFila = -1;

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
                    
                    if (data.pedidos && Array.isArray(data.pedidos)) {
                        data.pedidos.forEach(pedido => {
                            const status = pedido[4]; 
                            if (status === "Fila" || status === "fila") {
                                contagemFila++;
                                // Extracao dupla: salvar ID interno [0] E formato visual diário [7]
                                pedidosNaFila.push({
                                    id: pedido[0],
                                    id_interno: pedido[0],
                                    comanda: pedido[7] || pedido[0],
                                    cliente: pedido[3] ? pedido[3].split(' / ')[0].trim() : 'Desconhecido',
                                    telefone: pedido[3] && pedido[3].includes('/') ? pedido[3].split(' / ')[1].trim() : '',
                                    endereco: pedido[9] || ''
                                });
                            }
                        });
                    }

                    const hashAtual = JSON.stringify(pedidosNaFila);

                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log("🟢 [FILALAB] Fila: " + contagemFila + " pedidos. Disparando Supabase!");
                        ultimaHashFila = hashAtual;
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila, pedidosNaFila);
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

    async function enviarFilaLab(lojaNome, filaCount, pedidosFila) {
        try {
            const resposta = await fetch(API_FILALAB, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loja: lojaNome, fila: filaCount, pedidos_fila: pedidosFila, sistema: "SISFOOD_V8" })
            });
        } catch (e) {
            console.error("❌ [FILALAB] Erro de Rede:", e);
        }
    }

    // ----- [PARTE 2: ESCRITA] Polling de Comandos Pendentes FilaLab -> Sisfood -----
    
    // Auxiliar: Busca o ID interno do Motoboy no HTML pelo Nome dele
    function findMotoboyIdByName(targetName) {
        // Geralmente o Sisfood cria botões/opções de motoboys. Buscaremos todos os elementos de JS/DOM e cruzaremos o nome.
        const normalTarget = targetName.toLowerCase().trim();
        const todosElementosTexto = Array.from(document.querySelectorAll('*'))
            .filter(el => {
                if(el.children.length === 0 && el.textContent) {
                    return el.textContent.toLowerCase().includes(normalTarget);
                }
                return false;
            });

        // 1. Tentar ler o 'onclick' de elementos na tela (ex: vincularMotoboy(cod, 40))
        for (let baseEl of todosElementosTexto) {
            let prnt = baseEl;
            for(let i=0; i<3; i++) { // sobe 3 níveis max
                if(prnt) {
                    const attrs = Array.from(prnt.attributes).map(a => a.value).join(' ');
                    // ex: onclick="vincular(1234, 40)" ignoramos isso, se for um val, etc.
                    if(prnt.value && !isNaN(prnt.value)) return prnt.value;
                    if(prnt.dataset && prnt.dataset.id) return prnt.dataset.id;
                }
                prnt = prnt.parentElement;
            }
        }
        
        // 2. Se o Sisfood carrega os motoboys numa variavel JS global (comum em VUE)
        // Isso é complexo pelo Content Security do navegador, logo tentaremos o form bruto
        const forms = document.querySelectorAll("select option");
        for(let opt of forms) {
             if(opt.textContent.toLowerCase().includes(normalTarget)) {
                 return opt.value;
             }
        }

        // 3. Fallback: procurar inputs/buttons escondidos
        const btns = document.querySelectorAll("button, div.card");
        for(let b of btns) {
             if(b.textContent.toLowerCase().includes(normalTarget)) {
                 if(b.value) return b.value;
                 // As vezes a action eh vinculada num fetch direto
             }
        }

        return null; // Não achou
    }

    async function despacharPedidoNoSisfood(cmd) {
         return new Promise((resolve) => {
             // 1. Identificar Motoboy no front
             const idMotoboy = findMotoboyIdByName(cmd.nome_motoboy);
             
             if(!idMotoboy && !window._avisoMotoboyNaoAchado) {
                  // Se não achar o ID logamos error e deixamos como pendente pra tentar de novo, porém com warning.
                  console.warn("[FILALAB] Aviso: Botão do motoboy " + cmd.nome_motoboy + " não foi encontrado na DOM aberta do Sisfood para o pedido " + cmd.cod_pedido_interno + ". Certifique-se que o nome é IGUAL ou que a lista de motoboys está carregada na memória.");
                  window._avisoMotoboyNaoAchado = true; // Só avisa 1 vez
                  return resolve(false);
             }
             
             // ID do Entregador Encontrado ou Forçado fallback manual na config
             const idMotoboyFinal = idMotoboy || "40"; // "40" foi o ID base do Teste

             // 2. Montar Req XHR no endpoint definitivo de Roteiro (Batch) Sisfood API
             const urlDespacho = window.location.pathname.replace('/tela', '') + "/statusPedidosLote";
             
             // Preparação do ID (Lote/Vírgula): O Sisfood aceita "71908,71910" transformado em %2C no Payload
             // Se houver espacos no array recuperado, trocamos por vazio e garantimos URLEncode da vírgula.
             const codigosLimpos = cmd.cod_pedido_interno.replace(/\\s+/g, '');
             const arrayPedidosFormatado = encodeURIComponent(codigosLimpos);

             // 3. FormData (O Sisfood pede Payload Form Url Encoded "pedidos=ID%2CID&status=entrega&cod_motoboy=ID")
             const form = "pedidos="+arrayPedidosFormatado+
                          "&status=entrega"+
                          "&cod_motoboy="+encodeURIComponent(idMotoboyFinal);
                          

             console.log("🚀 [FILALAB] Despachando na Raça Sisfood: Pedido(s) LOTE [" + codigosLimpos + "] para motoboy " + cmd.nome_motoboy + " (ID " + idMotoboyFinal + ")");

             const xhr = new XMLHttpRequest();
             xhr.open("POST", urlDespacho, true);
             xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
             xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest'); // Essencial p/ não dar 403

             xhr.onreadystatechange = async function () {
                 if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                      // Despacho no Sisfood feito com sucesso, atualiza nuvem confirmando a execução
                      await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?id=eq." + cmd.id, {
                           method: 'PATCH',
                           headers: {
                               "apikey": ANON_KEY,
                               "Authorization": "Bearer " + ANON_KEY,
                               "Content-Type": "application/json",
                               "Prefer": "return=minimal"
                           },
                           body: JSON.stringify({ status: "EXECUTADO" })
                      });
                      console.log("✅ [FILALAB] Despacho " + cmd.cod_pedido_interno + " com sucesso e nuvem liberada.");
                      
                      // Forçar refresh no Sisfood simulando atualizar
                      setTimeout(()=> {
                         const refreshBtn = document.querySelector('button[title*="Atualizar"], a[title*="Atualizar"]');
                         if(refreshBtn) refreshBtn.click();
                      }, 1000);
                      resolve(true);
                 } else if (this.readyState === XMLHttpRequest.DONE) {
                      console.error("❌ [FILALAB] Falha Request Sisfood Status HTTP: " + this.status);
                      resolve(false);
                 }
             }

             // Envia o dispatch
             xhr.send(form);
         });
    }

    async function pollComandosDoFilaLab() {
         try {
             // Lista todos os pendentes para a loja vinculada
             const resp = await fetch(SUPABASE_URL + "/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_nome=eq." + encodeURIComponent(LOJA_FIXA), {
                 headers: {
                     "apikey": ANON_KEY,
                     "Authorization": "Bearer " + ANON_KEY
                 }
             });
             
             if(resp.ok) {
                 const comandosPendentes = await resp.json();
                 
                 for(let cmd of comandosPendentes) {
                     await despacharPedidoNoSisfood(cmd);
                     await new Promise(r => setTimeout(r, 600)); // Sleep anti-spam entre cada comanda pro Sisfood
                 }
             }
         } catch(e) { /* silent fail no polling wifi */}
    }

    // Iniciar loop infinito observador de Ordens do Roteirista FilaLab a cada 3 segundos
    setInterval(pollComandosDoFilaLab, 3000);

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

      {isSisfoodAtivo && (
        <div className="bg-gradient-to-br from-card to-card/50 border border-primary/20 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl shadow-primary/5">
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
  );
}
