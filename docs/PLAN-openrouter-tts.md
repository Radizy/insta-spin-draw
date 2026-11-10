# 📋 PLAN: Integração OpenRouter TTS (HeyGen Voice Turbo)

**Slug**: `openrouter-tts`  
**Status**: 🟢 Concluído e Validado

---

## 🎯 1. Especificações Confirmadas

1. **Objetivo Principal**: Gerar áudio fixo para motoboys e permitir teste sonoro no painel administrativo via API do OpenRouter.
2. **Modelo Padrão**: `heygen/heygen-voice-1-turbo:free` (com voz padrão `sabrina`).
3. **Flexibilidade Futura**: Campos de Modelo e Voz 100% editáveis no painel de Módulos (com sugestões pré-definidas), permitindo troca para modelos pagos ou outros provedores no futuro sem alterar o código.
4. **Fallback Automático**: Se a API do OpenRouter falhar ou atingir rate limit, a interface e a TV utilizam fallback transparente para o TTS nativo do navegador (Web Speech API).
5. **Formato de Áudio**: Conversão do stream PCM bruto retornado pelo OpenRouter/HeyGen para container WAV padrão (44.1 kHz, 16-bit mono), compatível com navegadores e reprodutores de áudio.

---

## 🧱 2. Plano de Arquitetura Técnica

### ⚡ A. Supabase Edge Function: `openrouter-tts`
- **Arquivo**: `supabase/functions/openrouter-tts/index.ts`
- **Responsabilidade**:
  - Receber `{ text, voice, model, filename, franquia_id, api_key }`.
  - Obter chave do payload, da configuração da franquia (`tv_tts.openrouter_api_key`) ou do secret `OPENROUTER_API_KEY`.
  - Realizar POST para `https://openrouter.ai/api/v1/audio/speech`.
  - Detectar se o áudio retornado é PCM e encapsular em cabeçalho WAV (44 bytes).
  - Se `filename` estiver presente, salvar no bucket `motoboy_voices` e retornar `{ publicUrl }`.
  - Se `filename` não estiver presente (ex: teste), retornar o binário `audio/wav`.

### 🖥️ B. Painel de Módulos: `ModulosConfig.tsx`
- Adicionar opção `openrouter` ao seletor de voz da TV.
- Campos de configuração:
  - `openrouter_api_key` (senha)
  - `openrouter_model` (texto com valor padrão `heygen/heygen-voice-1-turbo:free`)
  - `openrouter_voice` (seletor com `sabrina`, `nadine`, `austin`, `claire` + opção customizada)
- Função `playWithOpenRouter(text)` para teste sonoro em tempo real.

### 👤 C. Cadastro de Motoboys: `Config.tsx`
- No modal de edição do entregador, suporte a `isGoogle`, `isEleven` e `isOpenRouter`.
- Atualização do botão de geração de voz:
  - Rótulo dinâmico: `🔊 Gerar voz personalizada (OpenRouter - Sabrina)`
  - Chamada para `openrouter-tts`, gerando `${franquiaId}/${motoboy.id}.wav` e salvando em `tts_voice_path`.
- Suporte em geração de voz em lote para motoboys sem voz.

---

## 🚀 3. Tarefas de Implementação

- [x] Criar Edge Function `supabase/functions/openrouter-tts/index.ts`
- [x] Atualizar `src/components/ModulosConfig.tsx` com campos e teste de áudio
- [x] Atualizar `src/pages/Config.tsx` para suporte na geração de voz de motoboy (individual e lote)
- [x] Validar compilação TypeScript e sintaxe com build de produção Vite


