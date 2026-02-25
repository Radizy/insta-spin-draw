import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY") as string;

// Inicializa o cliente Supabase contornando o RLS com Service Role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

serve(async (req) => {
  try {
    // 1. Verificar chaves de ambiente
    if (!OPENWEATHER_API_KEY) {
      throw new Error("Missing OPENWEATHER_API_KEY environment variable");
    }

    // 2. Buscar todas as cidades únicas que possuem configuração de clima nas unidades
    // Fazemos isso sem distinct pois o postgrest JS não tem .distinct(), usaremos JS puro.
    const { data: unidades, error: fetchError } = await supabase
      .from("unidades")
      .select("id, cidade_clima")
      .not("cidade_clima", "is", null)
      .not("cidade_clima", "eq", "");

    if (fetchError) {
      throw fetchError;
    }

    if (!unidades || unidades.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma cidade configurada" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Agrupar unidades por cidade
    const cityMap = new Map<string, string[]>(); // Cidade => Array de IDs
    for (const u of unidades) {
      const city = u.cidade_clima.trim().toLowerCase();
      if (!cityMap.has(city)) {
        cityMap.set(city, []);
      }
      cityMap.get(city)!.push(u.id);
    }

    const uniqueCities = Array.from(cityMap.keys());
    console.log(`Buscando clima para ${uniqueCities.length} cidades únicas...`);

    const updateResults = [];

    // 3. Chamar API do OpenWeather para cada cidade
    for (const city of uniqueCities) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}&lang=pt_br`;

        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Falha ao buscar clima para ${city}: ${response.statusText}`);
          updateResults.push({ city, status: "error", error: response.statusText });
          continue; // Pula pra próxima e preserva o cache antigo
        }

        const weatherData = await response.json();

        // 4. Update nas unidades correspondentes
        const ids = cityMap.get(city) || [];

        const { error: updateError } = await supabase
          .from("unidades")
          .update({
            clima_cache: weatherData,
            clima_updated_at: new Date().toISOString()
          })
          .in("id", ids);

        if (updateError) {
          console.error(`Falha ao atualizar unidades de ${city}:`, updateError);
          updateResults.push({ city, status: "error", error: updateError.message });
        } else {
          updateResults.push({ city, status: "success", count: ids.length });
        }

      } catch (err) {
        console.error(`Exceção ao processar ${city}:`, err);
        updateResults.push({ city, status: "error", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ message: "Sincronização concluída", results: updateResults }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro geral na função:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
