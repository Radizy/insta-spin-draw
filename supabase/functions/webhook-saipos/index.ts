import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const data = await req.json();
        const { action, loja, pedidos_fila, entregas_na_fila, motoboy } = data;
        
        const providedToken = req.headers.get("x-api-key");
        const isSecureTokenValid = providedToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!providedToken || !isSecureTokenValid) {
           return new Response(JSON.stringify({ error: 'Token x-api-key invalido ou ausente.' }), {
               headers: { ...corsHeaders, 'Content-Type': 'application/json' },
               status: 403,
           });
        }

        if (!loja) {
            return new Response(JSON.stringify({ error: 'Missing loja name.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        if (action === 'update_kanban') {
            const { error: err1 } = await supabaseClient
                .from('unidades')
                .update({
                    saipos_pedidos_fila: pedidos_fila || [],
                    entregas_na_fila_saipos: entregas_na_fila || 0
                })
                .ilike('nome_loja', `%${loja}%`);
            
            if (err1) throw err1;

            return new Response(JSON.stringify({ success: true, message: 'Kanban atualizado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        if (action === 'motoboy_returned' && motoboy) {
            const now = new Date().toISOString();
            
            // 1. Encontrar o motoboy com esse nome exato naquela loja (ilike para tratar maiúsculas/minúsculas)
            const { data: entregador, error: errBusca } = await supabaseClient
                .from('entregadores')
                .select('id')
                .ilike('nome', `%${motoboy}%`)
                .ilike('unidade', `%${loja}%`)
                .eq('status', 'entregando')
                .maybeSingle();

            if (errBusca) throw errBusca;
            if (!entregador) {
                // Motoboy pode já ter sido retornado manualmente ou não pertencer a esta loja.
                return new Response(JSON.stringify({ success: false, message: 'Motoboy não encontrado ou não está em entrega' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            // 2. Atualiza o status do motoboy para disponivel e a fila posicao
            const { error: err2 } = await supabaseClient
                .from('entregadores')
                .update({
                    status: 'disponivel',
                    hora_saida: null,
                    fila_posicao: now
                })
                .eq('id', entregador.id);

            if (err2) throw err2;

            // 3. Atualiza o historico_entregas (bate o retorno cronometro)
            const { error: err3 } = await supabaseClient
                .from('historico_entregas')
                .update({ hora_retorno: now })
                .eq('entregador_id', entregador.id)
                .is('hora_retorno', null);

            if (err3) throw err3;

            return new Response(JSON.stringify({ success: true, message: `Motoboy ${motoboy} retornado com sucesso` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
