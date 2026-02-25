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
                // Ao inv├®s de chamar a API da OpenWeather, busca o JSONB j├í servido pela Edge Function e CRON do Supabase
                const { data, error: sbError } = await supabase
                    .from('unidades')
                    .select('clima_cache')
                    .ilike('cidade_clima', city)
                    .not('clima_cache', 'is', null)
                    .limit(1)
                    .maybeSingle();

                if (sbError) {
                    throw new Error(sbError.message);
                }

                if (!data || !data.clima_cache) {
                    throw new Error('Nenhum dado de clima cacheado encontrado para essa cidade ainda.');
                }

                const cachedData = data.clima_cache as any;

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

        // Ouve atualiza├º├Áes em tempo real na tabela de unidades para a coluna de clima
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
