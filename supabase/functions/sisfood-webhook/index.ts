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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Used service_role to bypass RLS for internal webhook update
        );

        const data = await req.json();
        const { loja, fila, pedidos_fila, sistema, unidade_id } = data;
        
        const providedToken = req.headers.get("x-api-key");
        const isSecureTokenValid = providedToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Modo Passivo/Migração: Se não tem token (loja antiga), deixa passar por enquanto mas avisa
        if (!providedToken) {
           console.warn(`⚠️ [SECURITY] Chamada feita sem Token pela loja ${loja}. Considere atualizar o Tampermonkey.`);
        } else if (!isSecureTokenValid) {
           console.error(`🛡️ [SECURITY] Tentativa de fraude/Token inválido rejeitado para loja ${loja}.`);
           return new Response(JSON.stringify({ error: 'Token x-api-key invalido.' }), {
               headers: { ...corsHeaders, 'Content-Type': 'application/json' },
               status: 403,
           });
        }

        // We can match by ID (preferred) or by name
        if (!unidade_id && !loja) {
            return new Response(JSON.stringify({ error: 'Missing unidade_id or loja name.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const { data: currentUnit } = await supabaseClient
            .from('unidades')
            .select('sisfood_pedidos_fila')
            .ilike('nome_loja', `%${loja}%`)
            .maybeSingle();

        const oldPedidos = (currentUnit?.sisfood_pedidos_fila as any[]) || [];
        const now = new Date().toISOString();

        const mergedPedidos = pedidos_fila.map((newP: any) => {
            const oldP = oldPedidos.find(op => op.id_interno === newP.id_interno || op.id === newP.id);
            return {
                ...newP,
                created_at: oldP?.created_at || now
            };
        });

        const updatePayload: any = {
            entregas_na_fila: fila,
            entregas_na_fila_atualizado_em: now,
            sisfood_pedidos_fila: mergedPedidos
        };

        let query = supabaseClient
            .from('unidades')
            .update(updatePayload);

        if (unidade_id) {
            query = query.eq('id', unidade_id);
        } else {
            query = query.ilike('nome_loja', `%${loja}%`);
        }

        const { error } = await query;

        if (error) {
            console.error('Error updating queue:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        return new Response(JSON.stringify({ success: true, fila, loja }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
