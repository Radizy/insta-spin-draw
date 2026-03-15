import { useCallback, useRef, useEffect } from 'react';

// Vozes 100% GRATUITAS usando Web Speech API do navegador
// IMPORTANTE: Essas são as ÚNICAS vozes que funcionam sem API key
export type TTSVoiceModel =
  // Femininas (3 opções bem distintas)
  | 'browser_clara'      // Voz suave e amigável
  | 'browser_roberta'    // Voz profissional e clara
  | 'browser_juliana'    // Voz jovem e energética
  // Masculinas (3 opções bem distintas)
  | 'browser_paulo'      // Voz grave e séria
  | 'browser_marcelo'    // Voz neutra e confiável
  | 'browser_eduardo';   // Voz dinâmica e assertiva

export interface TTSConfig {
  enabled: boolean;
  volume: number; // 0-100
  voice_model: TTSVoiceModel;
  franquiaId?: string;
}

const DEFAULT_TTS_CONFIG: TTSConfig = {
  enabled: true,
  volume: 100,
  voice_model: 'browser_clara',
};

function normalizeConfig(config?: Partial<TTSConfig> | null): TTSConfig {
  return {
    enabled: config?.enabled ?? DEFAULT_TTS_CONFIG.enabled,
    volume: Math.min(100, Math.max(0, config?.volume ?? DEFAULT_TTS_CONFIG.volume)),
    voice_model: (config?.voice_model as TTSVoiceModel) ?? DEFAULT_TTS_CONFIG.voice_model,
    franquiaId: config?.franquiaId,
  };
}

// Perfis bem distintos para cada voz
const voiceProfiles: Record<TTSVoiceModel, { rate: number; pitch: number; preferFemale?: boolean }> = {
  // Femininas - 3 opções bem diferentes
  browser_clara: { rate: 0.95, pitch: 1.1, preferFemale: true },      // Mais clara e presente
  browser_roberta: { rate: 1.0, pitch: 1.05, preferFemale: true },    // Dinâmica
  browser_juliana: { rate: 1.05, pitch: 1.2, preferFemale: true },    // Energética
  
  // Masculinas - 3 opções bem diferentes
  browser_paulo: { rate: 0.9, pitch: 0.9, preferFemale: false },      // Mais grave, mas nítida
  browser_marcelo: { rate: 1.0, pitch: 1.0, preferFemale: false },    // Neutra
  browser_eduardo: { rate: 1.1, pitch: 1.1, preferFemale: false },     // Dinâmica
};

export function useTTS(initialConfig?: Partial<TTSConfig> | null) {
  const speakingRef = useRef(false);
  const configRef = useRef<TTSConfig>(normalizeConfig(initialConfig));

  useEffect(() => {
    configRef.current = normalizeConfig(initialConfig);
  }, [initialConfig]);

  const speak = useCallback(
    (text: string, overrideConfig?: Partial<TTSConfig> | null): Promise<void> => {
      return new Promise(async (resolve) => {
        const activeConfig = normalizeConfig(overrideConfig ?? configRef.current);

        if (!activeConfig.enabled) {
          resolve();
          return;
        }

        const safeText = text.slice(0, 260);

        // Cancelar qualquer fala em andamento
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        if (!window.speechSynthesis) {
          console.warn('TTS não suportado neste navegador');
          resolve();
          return;
        }

        // Aguarda as vozes serem carregadas
        const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
          return new Promise((resolveVoices) => {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              resolveVoices(voices);
            } else {
              window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolveVoices(voices);
              };
              setTimeout(() => resolveVoices(voices), 1000);
            }
          });
        };

        const allVoices = await loadVoices();
        
        // Filtra vozes brasileiras
        const ptBrVoices = allVoices.filter(
          (voice) => voice.lang.includes('pt-BR') || voice.lang.includes('pt_BR')
        );

        const profile = voiceProfiles[activeConfig.voice_model];
        let selectedVoice: SpeechSynthesisVoice | null = null;

        if (ptBrVoices.length > 0) {
          // Tenta encontrar voz do gênero correto
          if (profile.preferFemale) {
            // Busca vozes femininas
            selectedVoice = ptBrVoices.find(v => 
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('feminina') ||
              v.name.toLowerCase().includes('maria') ||
              v.name.toLowerCase().includes('luciana') ||
              v.name.toLowerCase().includes('francisca')
            ) || ptBrVoices[0];
          } else {
            // Busca vozes masculinas
            selectedVoice = ptBrVoices.find(v => 
              (v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')) ||
              v.name.toLowerCase().includes('masculino') ||
              v.name.toLowerCase().includes('daniel') ||
              v.name.toLowerCase().includes('antonio')
            ) || ptBrVoices[Math.min(1, ptBrVoices.length - 1)];
          }
        } else if (allVoices.length > 0) {
          // Fallback: usa qualquer voz disponível
          selectedVoice = allVoices[0];
        }

        const utterance = new SpeechSynthesisUtterance(safeText);
        utterance.lang = 'pt-BR';
        utterance.rate = profile.rate;
        utterance.pitch = profile.pitch;
        // Garantindo volume máximo se configurado como 100
        utterance.volume = Math.max(0.1, activeConfig.volume / 100); 

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log(`🎤 Voz: ${selectedVoice.name} | Velocidade: ${profile.rate}x | Tom: ${profile.pitch}`);
        }

        speakingRef.current = true;

        utterance.onend = () => {
          speakingRef.current = false;
          resolve();
        };

        utterance.onerror = (event) => {
          speakingRef.current = false;
          console.error('TTS error:', event);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speakingRef.current = false;
  }, []);

  return { speak, cancel, isSpeaking: () => speakingRef.current };
}
