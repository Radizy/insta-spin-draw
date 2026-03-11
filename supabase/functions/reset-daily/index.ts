import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Receber parâmetros do body
    const { unidade, unidadeId } = await req.json();

    console.log(`Iniciando reset diário para unidade: ${unidade || unidadeId}...`);

    // Construir query para desativar todos e limpar hora_saida
    let resetAtivoQuery = supabase
      .from('entregadores')
      .update({
        ativo: false,
        hora_saida: null,
      });

    if (unidadeId) {
      resetAtivoQuery = resetAtivoQuery.eq('unidade_id', unidadeId);
    } else if (unidade) {
      resetAtivoQuery = resetAtivoQuery.eq('unidade', unidade);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetro unidade ou unidadeId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: resetAtivoError } = await resetAtivoQuery;
    if (resetAtivoError) {
      console.error('Erro ao desativar motoboys:', resetAtivoError);
      throw resetAtivoError;
    }

    // Construir query para mudar status "em_entrega" para "disponivel"
    let resetStatusQuery = supabase
      .from('entregadores')
      .update({
        status: 'disponivel',
      })
      .eq('status', 'em_entrega');

    if (unidadeId) {
      resetStatusQuery = resetStatusQuery.eq('unidade_id', unidadeId);
    } else if (unidade) {
      resetStatusQuery = resetStatusQuery.eq('unidade', unidade);
    }

    const { error: resetStatusError } = await resetStatusQuery;
    if (resetStatusError) {
      console.error('Erro ao resetar status:', resetStatusError);
      throw resetStatusError;
    }

    // ------------------------------------------------------------
    // FILALAB x SISFOOD: ZERAR FILA NA MADRUGADA
    // Limpa entregas congeladas na interface quando vira o dia
    // ------------------------------------------------------------
    let resetFilaQuery = supabase
      .from('unidades')
      .update({
        entregas_na_fila: 0,
        sisfood_pedidos_fila: []
      });
      
    if (unidadeId) {
       resetFilaQuery = resetFilaQuery.eq('id', unidadeId);
    } else if (unidade) {
       resetFilaQuery = resetFilaQuery.ilike('nome_loja', `%${unidade}%`);
    }

    const { error: resetFilaError } = await resetFilaQuery;
    if (resetFilaError) {
       console.error('Erro ao zerar dados da Fila Sisfood:', resetFilaError);
       // Não throw error aqui para não quebrar o reset de motoboys se a loja não tiver o campo configurado.
    }

    console.log('Reset de expediente concluído com sucesso!');

    return new Response(
      JSON.stringify({ success: true, message: 'Reset de expediente executado com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Erro no reset diário:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});