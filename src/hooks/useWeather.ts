import { useState, useEffect } from 'react';

// OpenWeatherMap API Key
// O ideal é colocar no .env "VITE_OPENWEATHER_API_KEY", mas para facilitar os testes colocaremos um fallback de dev
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || ''; // Você precisa inserir a chave aqui ou no .env

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

        if (!API_KEY) {
            setError('Chave da API de Clima não configurada no .env');
            return;
        }

        const fetchWeather = async () => {
            setLoading(true);
            setError(null);

            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
                    city
                )}&units=metric&lang=pt_br&appid=${API_KEY}`;

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Falha ao buscar clima da cidade');
                }

                const data = await response.json();

                setWeather({
                    temp: Math.round(data.main.temp),
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                    city: data.name,
                });
            } catch (err) {
                console.error('Erro na API de Clima:', err);
                setError(err instanceof Error ? err.message : 'Erro desconhecido');
                setWeather(null);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();

        // Atualiza clima a cada hora se a TV ficar ligada o dia todo
        const intervalId = setInterval(fetchWeather, 3600000);
        return () => clearInterval(intervalId);
    }, [city]);

    return { weather, loading, error };
}
