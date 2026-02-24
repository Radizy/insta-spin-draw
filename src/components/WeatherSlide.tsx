import { useWeather } from '@/hooks/useWeather';
import { Loader2, CloudRain, Sun, Cloud, CloudLightning, Snowflake } from 'lucide-react';

interface WeatherSlideProps {
    cidadeInput: string | null | undefined;
}

export function WeatherSlide({ cidadeInput }: WeatherSlideProps) {
    const { weather, loading, error } = useWeather(cidadeInput);

    if (loading) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-zinc-900 text-white animate-pulse">
                <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
                <p className="text-2xl font-mono">Buscando previsão do tempo...</p>
            </div>
        );
    }

    // Se der erro ou faltar cidade, exibe uma tela bonita neutra de FilaLab
    if (error || !weather) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-black text-white p-12 text-center">
                <Cloud className="w-32 h-32 text-zinc-600 mb-8" />
                <h1 className="text-6xl font-bold font-mono tracking-tight text-white/50 mb-4">
                    FilaLab TV
                </h1>
                <p className="text-2xl text-zinc-400 max-w-2xl">
                    {error ? `Clima Indisponível: ${error}` : 'Informe a Cidade no Painel Config > TV'}
                </p>
            </div>
        );
    }

    // Lógica para coloração e Ícones de acordo com a API OpenWeather
    // Baseado nos códigos de tempo (Clear, Clouds, Rain)
    const isNight = weather.icon.includes('n');
    const isRain = weather.icon.startsWith('09') || weather.icon.startsWith('10');
    const isThunder = weather.icon.startsWith('11');
    const isSnow = weather.icon.startsWith('13');
    const isClear = weather.icon.startsWith('01');

    let backgroundClass = 'from-blue-400 to-blue-600'; // Default dia
    let WeatherIcon = Cloud;

    if (isNight) {
        backgroundClass = 'from-indigo-900 to-black';
    } else if (isClear) {
        backgroundClass = 'from-sky-400 to-blue-500';
        WeatherIcon = Sun;
    } else if (isRain) {
        backgroundClass = 'from-slate-600 to-slate-800';
        WeatherIcon = CloudRain;
    } else if (isThunder) {
        backgroundClass = 'from-purple-900 to-slate-900';
        WeatherIcon = CloudLightning;
    } else if (isSnow) {
        backgroundClass = 'from-sky-100 to-slate-300 text-slate-800';
        WeatherIcon = Snowflake;
    }

    return (
        <div
            className={`w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br ${backgroundClass} text-white p-12 transition-colors duration-1000`}
        >
            <div className="absolute top-12 left-12 flex items-center gap-4 bg-black/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                <WeatherIcon className="w-8 h-8" />
                <span className="text-2xl font-medium tracking-wide">
                    Bate-volta Seguro
                </span>
            </div>

            <div className="flex flex-col items-center text-center animate-in slide-in-from-bottom-10 fade-in duration-1000">
                <h2 className="text-5xl md:text-7xl font-light tracking-wider mb-6 opacity-90">
                    {weather.city}
                </h2>

                <div className="flex items-center justify-center gap-8 my-8 drop-shadow-2xl">
                    <WeatherIcon
                        className={`w-40 h-40 md:w-56 md:h-56 ${isClear && !isNight ? 'text-yellow-300' : 'text-white'}`}
                        strokeWidth={1.5}
                    />
                    <span className="text-[12rem] md:text-[16rem] font-bold font-mono leading-none tracking-tighter">
                        {weather.temp}°
                    </span>
                </div>

                <p className="text-4xl md:text-5xl font-medium capitalize mt-4 bg-black/20 px-10 py-4 rounded-full backdrop-blur-sm border border-white/10">
                    {weather.description}
                </p>
            </div>

            <div className="absolute bottom-12 w-full text-center px-12">
                <p className="text-2xl text-white/70 font-light">
                    Consulte o gerente para mais informações operacionais do clima.
                </p>
            </div>
        </div>
    );
}
