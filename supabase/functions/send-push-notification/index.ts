import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configura as VAPID Keys
// Dica: Configure variáveis de ambiente SUPABASE. Ex: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// webpush.setVapidDetails('mailto:contato@filalab.com.br', Deno.env.get('VAPID_PUBLIC_KEY') || '', Deno.env.get('VAPID_PRIVATE_KEY') || '');

// Para fins deste script, definindo chaves passadas em variáveis de ambiente:
const publicVapidKey = Deno.env.get("VAPID_PUBLIC_KEY") || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDykRxTGArvdn3K_mSyBfs4lJ8PjIay3lIapK1D2yYxw";
const privateVapidKey = Deno.env.get("VAPID_PRIVATE_KEY") || "replace_me_with_private_key_in_supabase_env";
webpush.setVapidDetails('mailto:suporte@filalab.com.br', publicVapidKey, privateVapidKey);

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { entregador_id, title, body } = await req.json();

        if (!entregador_id || !title || !body) {
            throw new Error("Parâmetros entregador_id, title e body são obrigatórios.");
        }

        // Busca subscriptions do entregador
        const { data: subs, error: subsError } = await supabaseClient
            .from("push_subscriptions")
            .select("*")
            .eq("entregador_id", entregador_id);

        if (subsError) {
            throw subsError;
        }

        if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "Nenhum dispositivo registrado." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload = JSON.stringify({ title, body });

        const sendPromises = subs.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, payload);
            } catch (err: any) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Inscrição expirou, deletar do banco
                    console.log("Subscription expired, deleting...", sub.id);
                    await supabaseClient.from("push_subscriptions").delete().eq("id", sub.id);
                } else {
                    console.error("Erro no envio:", err);
                }
            }
        });

        await Promise.all(sendPromises);

        return new Response(JSON.stringify({ success: true, message: "Notificações enviadas." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Erro:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
