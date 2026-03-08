import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        const { loja, fila, sistema, unidade_id } = data;

        // We can match by ID (preferred) or by name
        if (!unidade_id && !loja) {
            return new Response(JSON.stringify({ error: 'Missing unidade_id or loja name.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        let query = supabaseClient
            .from('unidades')
            .update({
                entregas_na_fila: fila,
                entregas_na_fila_atualizado_em: new Date().toISOString()
            });

        if (unidade_id) {
            query = query.eq('id', unidade_id);
        } else {
            // Using ilike or eq for name match, adjust based on how FilaLab names units 
            query = query.ilike('nome', `%${loja}%`);
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
