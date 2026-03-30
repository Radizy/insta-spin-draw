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
        
        // Validação de Token Flexível para evitar erros 403 (Saipos/Tampermonkey enviam vários formatos)
        const providedToken = req.headers.get("x-api-key") || req.headers.get("apikey") || req.headers.get("authorization")?.replace("Bearer ", "");
        const serverAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        // Fallback para a chave configurada no frontend (evita descasamento no deploy)
        const frontendAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZ2J2YWlrcWVsd2V6cGVobGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NDc4MzUsImV4cCI6MjA4NzIyMzgzNX0.hIRjDR4D6p8RAsnWMhkF1stRDr_oa0yMsqukCPADyh0";
        
        const isTokenPresent = !!providedToken;
        const isTokenMatch = providedToken === serverAnonKey || providedToken === frontendAnonKey;

        if (!isTokenPresent || !isTokenMatch) {
           return new Response(JSON.stringify({ 
               error: 'Token invalido ou ausente.',
               debug: { received: providedToken ? "present" : "absent", match: isTokenMatch } 
           }), {
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

        // Função auxiliar robusta para achar o ID correto da loja, não importa o formato que venha
        async function resolveStoreId(lojaCode: string) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaCode);
            if (isUUID) return lojaCode;

            // Busca por atalhos conhecidos (legado) ou tenta fazer o match por ilike no nome
            let normalized = lojaCode.toLowerCase();
            if (normalized === "itaqua") normalized = "itaquaquecetuba";
            if (normalized === "poa" || normalized === "poá") normalized = "poá";
            if (normalized === "suzano") normalized = "suzano";

            const { data } = await supabaseClient
                .from('unidades')
                .select('id')
                .ilike('nome_loja', `%${normalized}%`)
                .maybeSingle();
                
            return data?.id;
        }

        const storeId = await resolveStoreId(loja);

        if (!storeId) {
             return new Response(JSON.stringify({ error: `Store mismatch. Could not resolve ID for: ${loja}` }), {
                 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                 status: 404,
             });
        }

        if (action === 'update_kanban') {
            const { error: err1 } = await supabaseClient
                .from('unidades')
                .update({
                    saipos_pedidos_fila: pedidos_fila || [],
                    entregas_na_fila_saipos: entregas_na_fila || 0
                })
                .eq('id', storeId);
            
            if (err1) throw err1;

            return new Response(JSON.stringify({ success: true, message: 'Kanban atualizado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        if (action === 'motoboy_returned' && motoboy) {
            const now = new Date().toISOString();
            
            // 1. Encontrar o motoboy com esse nome exato naquela loja
            const { data: entregador, error: errBusca } = await supabaseClient
                .from('entregadores')
                .select('id')
                .ilike('nome', `%${motoboy}%`)
                // .ilike('unidade', ...) substituído por filtro exato via storeId
                // Atenção: a tabela de motoboys não tem um 'unidade_id' mapeado para o RLS default? 
                // Por segurança vamos ignorar a restrição de unidade nesta busca já que a function roda como service_role,
                // ou buscar por ilike no nome da loja para manter compatibilidade. 
                // A tabela entregadores usa a coluna 'unidade' (texto).
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

        if (action === 'map_sync') {
            const mapPedidos = data.pedidos || [];
            const mapMotoboys = data.motoboys || [];

            // 1. Atualiza os pedidos no DB da Unidade
            const { error: err1 } = await supabaseClient
                .from('unidades')
                .update({ saipos_mapa_pedidos: mapPedidos })
                .eq('id', storeId);
            
            if (err1) throw err1;

            // 2. Atualiza os GPS nativos de rastreio dos motoboys enviados pelo Saipos
            for (const mb of mapMotoboys) {
                if (!mb.name) continue;
                await supabaseClient
                    .from('entregadores')
                    .update({
                        lat: mb.lat,
                        lng: mb.lng,
                        last_location_time: new Date().toISOString()
                    })
                    .ilike('nome', `%${mb.name}%`)
                    .ilike('unidade', `%${loja}%`);
            }

            return new Response(JSON.stringify({ success: true, message: 'Map sync updated' }), {
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
