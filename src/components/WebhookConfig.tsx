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

// Importa os arquivos físicos de cada loja em texto bruto (Raw String) para serem copiáveis
import scriptItaqua from '../../tampermonkey_ITAQUA.js?raw';
import scriptPoa from '../../tampermonkey_POA.js?raw';
import scriptSuzano from '../../tampermonkey_SUZANO.js?raw';

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
    const unitUpper = (selectedUnit || '').toUpperCase();
    if (unitUpper.includes('ITAQUA') || unitUpper.includes('ITAQUÁ')) return scriptItaqua;
    if (unitUpper.includes('POA') || unitUpper.includes('POÁ')) return scriptPoa;
    if (unitUpper.includes('SUZANO')) return scriptSuzano;
    
    return `// Selecione uma loja válida (ITAQUA, POA ou SUZANO) no topo do painel\n// para exibir o script FilaLab da sua cidade correspondente.`;
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
