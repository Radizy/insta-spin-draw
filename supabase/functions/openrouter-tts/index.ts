import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Converte bytes PCM brutos (16-bit mono 44.1kHz) em formato WAV adicionando o cabeçalho RIFF padrão de 44 bytes.
 */
function pcmToWav(pcmData: Uint8Array, sampleRate = 44100, numChannels = 1, bitsPerSample = 16): Uint8Array {
  // Se os dados já contêm cabeçalho RIFF ("RIFF" em ASCII) ou cabeçalho MP3 ("ID3"), retorna direto
  if (
    pcmData.length >= 4 &&
    pcmData[0] === 0x52 &&
    pcmData[1] === 0x49 &&
    pcmData[2] === 0x46 &&
    pcmData[3] === 0x46
  ) {
    return pcmData
  }

  const header = new ArrayBuffer(44)
  const view = new DataView(header)

  // 0-3: "RIFF"
  view.setUint8(0, 0x52)
  view.setUint8(1, 0x49)
  view.setUint8(2, 0x46)
  view.setUint8(3, 0x46)

  // 4-7: File length - 8
  view.setUint32(4, 36 + pcmData.length, true)

  // 8-11: "WAVE"
  view.setUint8(8, 0x57)
  view.setUint8(9, 0x41)
  view.setUint8(10, 0x56)
  view.setUint8(11, 0x45)

  // 12-15: "fmt "
  view.setUint8(12, 0x66)
  view.setUint8(13, 0x6d)
  view.setUint8(14, 0x74)
  view.setUint8(15, 0x20)

  // 16-19: SubChunk1Size (16 bytes para PCM)
  view.setUint32(16, 16, true)

  // 20-21: AudioFormat (1 para PCM linear)
  view.setUint16(20, 1, true)

  // 22-23: NumChannels (1 mono, 2 estéreo)
  view.setUint16(22, numChannels, true)

  // 24-27: SampleRate (ex: 44100)
  view.setUint32(24, sampleRate, true)

  // 28-31: ByteRate = SampleRate * NumChannels * BitsPerSample / 8
  view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true)

  // 32-33: BlockAlign = NumChannels * BitsPerSample / 8
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true)

  // 34-35: BitsPerSample (16 bits)
  view.setUint16(34, bitsPerSample, true)

  // 36-39: "data"
  view.setUint8(36, 0x64)
  view.setUint8(37, 0x61)
  view.setUint8(38, 0x74)
  view.setUint8(39, 0x61)

  // 40-43: SubChunk2Size = tamanho do PCM
  view.setUint32(40, pcmData.length, true)

  const wavData = new Uint8Array(44 + pcmData.length)
  wavData.set(new Uint8Array(header), 0)
  wavData.set(pcmData, 44)

  return wavData
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voice, model, filename, franquia_id, api_key } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'O parâmetro text é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    let openrouterApiKey = api_key || null
    let modelToUse = model || 'heygen/heygen-voice-1-turbo:free'
    let voiceToUse = voice || 'sabrina'

    // 1. Se a chave não veio no payload, tenta obter das configurações da franquia
    if (!openrouterApiKey && franquia_id && SUPABASE_URL && SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
        const { data, error } = await supabase
          .from('franquias')
          .select('config_pagamento')
          .eq('id', franquia_id)
          .maybeSingle()

        if (!error && data?.config_pagamento) {
          const cfg = data.config_pagamento as any
          const tvTts = cfg?.tv_tts || {}
          openrouterApiKey = tvTts.openrouter_api_key || null
          if (!model && tvTts.openrouter_model) modelToUse = tvTts.openrouter_model
          if (!voice && tvTts.openrouter_voice) voiceToUse = tvTts.openrouter_voice
        }
      } catch (e) {
        console.error('Erro ao buscar configuração da franquia para OpenRouter:', e)
      }
    }

    // 2. Fallback para chave de ambiente global (se configurada)
    if (!openrouterApiKey) {
      openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY') || null
    }

    if (!openrouterApiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave de API do OpenRouter não configurada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Fazer requisição para o endpoint de áudio do OpenRouter
    const openrouterUrl = 'https://openrouter.ai/api/v1/audio/speech'
    const openrouterResponse = await fetch(openrouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://filalab.com.br',
        'X-Title': 'FilaLab TTS',
      },
      body: JSON.stringify({
        model: modelToUse,
        input: text,
        voice: voiceToUse,
        response_format: 'pcm',
      }),
    })

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text()
      console.error('Erro na API do OpenRouter TTS:', openrouterResponse.status, errorText)
      return new Response(
        JSON.stringify({
          error: 'Falha ao gerar áudio no OpenRouter',
          status: openrouterResponse.status,
          details: errorText,
        }),
        { status: openrouterResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 4. Ler o conteúdo de áudio retornado
    const rawBuffer = await openrouterResponse.arrayBuffer()
    const rawBytes = new Uint8Array(rawBuffer)

    if (rawBytes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'OpenRouter não retornou dados de áudio.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Converte PCM para container WAV padrão (ou mantém se já for formato suportado)
    const wavBytes = pcmToWav(rawBytes, 44100, 1, 16)

    // 5. Se foi fornecido um nome de arquivo para salvar no Supabase Storage
    if (filename) {
      if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({ error: 'Configuração do Supabase ausente no servidor.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      const { error: uploadError } = await supabase.storage
        .from('motoboy_voices')
        .upload(filename, wavBytes, {
          contentType: 'audio/wav',
          upsert: true,
        })

      if (uploadError) {
        console.error('Erro ao salvar WAV no Storage:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Falha ao salvar áudio no Storage', details: uploadError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data: { publicUrl } } = supabase.storage
        .from('motoboy_voices')
        .getPublicUrl(filename)

      return new Response(
        JSON.stringify({ publicUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 6. Caso não tenha filename (ex: teste em tempo real), retorna o áudio binário WAV
    return new Response(wavBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
        'Content-Length': wavBytes.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('Erro na função openrouter-tts:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar áudio OpenRouter', details: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

