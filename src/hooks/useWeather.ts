import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherData {
    temp: number;
    description: string;
    icon: string; // Ex: '01d', '02n'
    city: string;
}

export function useWeather(city: string | null | undefined) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!city) {
            setWeather(null);
            setError(null);
            return;
        }

        const fetchWeatherCache = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: sbError } = await supabase
                    .from('unidades')
                    .select('clima_cache, clima_updated_at')
                    .ilike('cidade_clima', city)
                    .limit(1)
                    .maybeSingle();

                if (sbError) {
                    throw new Error(sbError.message);
                }

                let cachedData = data?.clima_cache as any;
                let lastUpdated = data?.clima_updated_at ? new Date(data.clima_updated_at).getTime() : 0;
                const now = new Date().getTime();
                const twentyMinutes = 20 * 60 * 1000;

                // Verificando se precisamos forçar atualização (Sem cache, ou Cache mais velho que 20 minutos)
                const needsUpdate = !cachedData || (now - lastUpdated > twentyMinutes);

                if (needsUpdate) {
                    console.log(`Clima desatualizado ou vazio para ${city}. Invocando Edge Function...`);
                    // Dispara a Edge Function. Não damos await se já houver cache velho (pra não travar a tela).
                    // Se estiver completamente vazio (primeira vez), damos await para ter o dado inicial.
                    const syncPromise = supabase.functions.invoke('sync-weather-data');

                    if (!cachedData) {
                        await syncPromise;
                        // Após a primeira sincronização profunda, re-busca a linha pra pegar o dado cacheado fresquinho
                        const { data: newData } = await supabase
                            .from('unidades')
                            .select('clima_cache')
                            .ilike('cidade_clima', city)
                            .limit(1)
                            .maybeSingle();

                        if (newData?.clima_cache) {
                            cachedData = newData.clima_cache;
                        } else {
                            throw new Error('Nenhum dado de clima cacheado encontrado para essa cidade ainda.');
                        }
                    }
                }

                setWeather({
                    temp: Math.round(cachedData.main.temp),
                    description: cachedData.weather[0].description,
                    icon: cachedData.weather[0].icon,
                    city: cachedData.name,
                });
            } catch (err) {
                console.error('Erro ao ler Cache de Clima do Banco:', err);
                setError(err instanceof Error ? err.message : 'Erro desconhecido ao ler o clima');
                setWeather(null);
            } finally {
                setLoading(false);
            }
        };

        fetchWeatherCache();

        // Ouve atualizações em tempo real na tabela de unidades para a coluna de clima
        const channel = supabase
            .channel('public:unidades:clima_cache')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'unidades',
                    filter: `cidade_clima=ilike.${city}`
                },
                (payload) => {
                    const newData = payload.new as any;
                    if (newData.clima_cache) {
                        const cachedData = newData.clima_cache;
                        setWeather({
                            temp: Math.round(cachedData.main.temp),
                            description: cachedData.weather[0].description,
                            icon: cachedData.weather[0].icon,
                            city: cachedData.name,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [city]);

    return { weather, loading, error };
}
