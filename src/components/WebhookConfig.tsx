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
    if (!unidadeId || !selectedUnit) {
      return `// Selecione uma loja no topo do painel para gerar o script.`;
    }
    const nomeLoja = selectedUnit;
    const unidadeIdLoja = unidadeId;
    const versao = '12.0';

    return `// ==UserScript==
// @name         Integração SISFOOD x FilaLab (${nomeLoja.toUpperCase()}) - v${versao} (Auto-Gerado)
// @namespace    http://tampermonkey.net/
// @version      ${versao}
// @description  Script gerado automaticamente pelo FilaLab para a loja ${nomeLoja}.
// @match        https://app.sisfood.com.br/*
// @grant        none
// ==/UserScript==

(function() {
    console.log('🚀 [FILALAB ${nomeLoja.toUpperCase()} v${versao}] Iniciado!');
    const API_FILALAB = '${SUPABASE_URL_FILALAB}/functions/v1/sisfood-webhook';
    const SUPABASE_URL = '${SUPABASE_URL_FILALAB}';
    const ANON_KEY = '${ANON_KEY_FILALAB}';

    // CONFIGURAÇÃO DA UNIDADE (gerada automaticamente - NÃO EDITAR)
    const LOJA_FIXA = '${nomeLoja}';
    const UNIDADE_ID = '${unidadeIdLoja}';

    let ultimaHashFila = '';
    let ultimaContagemFila = -1;
    window._filaAtualSisfood = [];

    // ----- [PARTE 1: LEITURA] Interceptador de Rede -----
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
                            if (status === 'Fila' || status === 'fila') {
                                contagemFila++;
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
                                window._filaAtualSisfood.push(String(pedido[0]).trim());
                                window._filaAtualSisfood.push(String(idDeVerdade).trim());
                            }
                        });
                    }
                    const hashAtual = JSON.stringify(pedidosNaFila);
                    if (hashAtual !== ultimaHashFila || contagemFila !== ultimaContagemFila) {
                        console.log('🟢 [FILALAB ${nomeLoja.toUpperCase()}] Fila: ' + contagemFila + ' pedidos. Atualizando...');
                        ultimaHashFila = hashAtual;
                        ultimaContagemFila = contagemFila;
                        enviarFilaLab(LOJA_FIXA, contagemFila, pedidosNaFila);
                    }
                } catch(err) {
                    console.error('❌ [FILALAB ${nomeLoja.toUpperCase()}] Erro ao ler JSON:', err);
                }
            }
        });
        return send.apply(this, arguments);
    };
    const open = XHR.open;
    XHR.open = function(method, url) { this._url = url; return open.apply(this, arguments); };

    async function enviarFilaLab(lojaNome, filaCount, pedidosFila) {
        try {
            await fetch(API_FILALAB, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': ANON_KEY },
                body: JSON.stringify({ loja: lojaNome, unidade_id: UNIDADE_ID, fila: filaCount, pedidos_fila: pedidosFila, sistema: 'SISFOOD_V12' })
            });
        } catch (e) { console.error('❌ [FILALAB ${nomeLoja.toUpperCase()}] Erro de Rede:', e); }
    }

    // ----- [PARTE 2: ESCRITA] Polling de Comandos -----
    function findMotoboyIdByName(targetName) {
        const fullTarget = targetName.toLowerCase().trim();
        const opts = Array.from(document.querySelectorAll('select option'));
        // 1. Match exato
        for(let opt of opts) {
            if(opt.textContent.toLowerCase().trim() === fullTarget) return opt.value;
        }
        // 2. Contém o nome completo
        for(let opt of opts) {
            if(opt.textContent.toLowerCase().includes(fullTarget)) return opt.value;
        }
        // 3. Começa com o primeiro nome (mínimo 4 chars para evitar falso positivo)
        const firstWord = fullTarget.split(' ')[0];
        if (firstWord.length >= 4) {
            for(let opt of opts) {
                if(opt.textContent.toLowerCase().startsWith(firstWord)) return opt.value;
            }
        }
        return null;
    }

    async function patchSupabaseStatus(cmdId, status) {
        await fetch(SUPABASE_URL + '/rest/v1/sisfood_comandos?id=eq.' + cmdId, {
            method: 'PATCH',
            headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });
    }

    async function despacharPedidoNoSisfood(cmd) {
        return new Promise(async (resolve) => {
            const codigosLimpos = cmd.cod_pedido_interno.replace(/\\s+/g, '');
            const idMotoboy = findMotoboyIdByName(cmd.nome_motoboy);
            if(!idMotoboy) {
                console.warn('[FILALAB ${nomeLoja.toUpperCase()}] Motoboy não encontrado: ' + cmd.nome_motoboy + ' — marcando IGNORADO.');
                await patchSupabaseStatus(cmd.id, 'IGNORADO');
                return resolve(false);
            }
            const urlDespacho = window.location.pathname.replace('/tela', '') + '/statusPedidosLote';
            const arrayPedidosFormatado = encodeURIComponent(codigosLimpos);
            const form = 'pedidos=' + arrayPedidosFormatado + '&status=entrega&cod_motoboy=' + encodeURIComponent(idMotoboy);
            console.log('🚀 [FILALAB ${nomeLoja.toUpperCase()}] Despachando ID ' + codigosLimpos + '...');
            const xhr = new XMLHttpRequest();
            xhr.open('POST', urlDespacho, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onreadystatechange = async function() {
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    await patchSupabaseStatus(cmd.id, 'EXECUTADO');
                    console.log('✅ [FILALAB ${nomeLoja.toUpperCase()}] Pedido ' + codigosLimpos + ' despachado!');
                    resolve(true);
                } else if (this.readyState === XMLHttpRequest.DONE) { resolve(false); }
            };
            xhr.send(form);
        });
    }

    async function pollComandos() {
        try {
            const resp = await fetch(SUPABASE_URL + '/rest/v1/sisfood_comandos?status=eq.PENDENTE&unidade_id=eq.' + UNIDADE_ID, {
                headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
            });
            if(resp.ok) {
                const comandos = await resp.json();
                for(let cmd of comandos) {
                    await despacharPedidoNoSisfood(cmd);
                    await new Promise(r => setTimeout(r, 800));
                }
            }
        } catch(e) {}
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
