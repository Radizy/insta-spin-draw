import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const cutoff1Day = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cutoff7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff10Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log("Running cleanup-old-data. Current time:", new Date().toISOString());

    const results: Record<string, { error: unknown | null; count?: number }> = {};

    // 1. Tabelas com 10 dias de retenção (usando created_at)
    const tables10Days = [
      "logs_auditoria",
      "whatsapp_historico",
      "senhas_pagamento",
    ] as const;

    for (const table of tables10Days) {
      const { error } = await supabase
        .from(table)
        .delete()
        .lt("created_at", cutoff10Days);
      results[table] = { error: error ?? null };
    }

    // 2. Historico de Entregas (usa hora_saida ou created_at) - 10 dias
    const { error: historicoError } = await supabase
      .from("historico_entregas")
      .delete()
      .or(`hora_saida.lt.${cutoff10Days},created_at.lt.${cutoff10Days}`);
    results["historico_entregas"] = { error: historicoError ?? null };

    // 3. Sisfood Comandos: Apagar TUDO (limpeza diária solicitada às 02:00)
    // Como a Edge Function é disparada por cron, apagamos registros com mais de 12h para garantir que 
    // nada de um turno ativo seja apagado acidentalmente se o cron rodar um pouco antes/depois.
    const cutoffSisfood = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { error: sisfoodError } = await supabase
      .from("sisfood_comandos")
      .delete()
      .lt("created_at", cutoffSisfood);
    results["sisfood_comandos"] = { error: sisfoodError ?? null };

    // 4. Maquininha Vinculos - 10 dias 
    // Por segurança, apagamos apenas os que já foram devolvidos.
    // Registros 'em_uso' são mantidos para não perder o controle de quem está com a máquina.
    const { error: maquininhaError } = await supabase
      .from("maquininha_vinculos")
      .delete()
      .eq("status", "devolvida")
      .lt("created_at", cutoff10Days);
    results["maquininha_vinculos"] = { error: maquininhaError ?? null };

    // 5. Auth Refresh Tokens - 30 dias (manter um pouco mais por segurança de login)
    const { error: refreshError } = await supabase
      .from("auth_refresh_tokens")
      .delete()
      .lt("created_at", cutoff30Days);
    results["auth_refresh_tokens"] = { error: refreshError ?? null };

    // 6. Sessões com 7 dias de retenção (conforme regra de sessões ativas)
    const { error: sessionError } = await supabase
      .from("user_sessions")
      .delete()
      .lt("created_at", cutoff7Days);
    results["user_sessions"] = { error: sessionError ?? null };

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error in cleanup-old-data:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
