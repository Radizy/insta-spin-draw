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
        .single();
      if (error) throw error;
      return data;
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

  const modulosAtivos = (franquiaConfig?.config_pagamento as any)?.modulos_ativos || [];
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
// @version      7.0
// @description  Lê a fila do Sisfood e manda pro FilaLab
// @match        https://app.sisfood.com.br/*/pdv*
// @grant        none
// ==/UserScript==

(function() {
    const API_FILALAB = "https://kegbvaikqelwezpehlhf.supabase.co/functions/v1/sisfood-webhook";
    
    // Nome exato da sua loja configurada no FilaLab
    const LOJA_FIXA = "${selectedUnit || 'NomeDaLojaAqui'}";
    let ultimaHashFila = "";
    let ultimaContagemFila = -1;

    // Interceptador de Rede invisível
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
                                // Extrai pos [7] = N diário do pedido, fallback ID sistema [0]
                                pedidosNaFila.push({
                                    id: pedido[7] || pedido[0],
                                    cliente: pedido[3] ? pedido[3].split(' / ')[0].trim() : 'Desconhecido',
                                    telefone: pedido[3] && pedido[3].includes('/') ? pedido[3].split(' / ')[1].trim() : '',
                                    endereco: pedido[9] || ''
                                });
                            }
                        });
                    }

                    const hashAtual = JSON.stringify(pedidosNaFila);

                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log(\`🟢 [FILALAB] Fila: \${contagemFila} pedidos. Disparando Supabase!\`);
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
                body: JSON.stringify({ loja: lojaNome, fila: filaCount, pedidos_fila: pedidosFila, sistema: "SISFOOD_V7" })
            });
            if (resposta.ok) {
                 console.log(\`✅ [FILALAB] Sucesso! Banco atualizado (\${filaCount}).\`);
            }
        } catch (e) {
            console.error("❌ [FILALAB] Erro de Rede:", e);
        }
    }
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
                  <h4 className="font-semibold text-foreground mb-1">Passo 3: Insira nosso Código</h4>
                  <p className="text-sm text-muted-foreground">Copie o código customizado ao lado, cole na janela do script, e salve apertando `Ctrl + S`. Atualize (F5) a página do Sisfood.</p>
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
