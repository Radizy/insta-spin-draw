import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, voice_name, filename, franquia_id, api_key } = await req.json()

    if (!text || !voice_name || !filename || !franquia_id) {
      return new Response(
        JSON.stringify({ error: 'text, voice_name, filename e franquia_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    // 1. Determinar a chave de API do Google
    let googleApiKey = api_key // Prioridade para a chave passada no payload
    
    if (!googleApiKey && SUPABASE_URL && SERVICE_ROLE_KEY) {
      // Buscar chave da franquia se não veio no payload
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
        const { data, error } = await supabase
          .from('franquias')
          .select('config_pagamento')
          .eq('id', franquia_id)
          .maybeSingle()

        if (!error) {
          const cfg = (data?.config_pagamento as any) || {}
          googleApiKey = cfg?.tv_tts?.google_api_key || null
        }
      } catch (e) {
        console.error('Erro ao buscar chave no banco:', e)
      }
    }

    // Fallback para a chave global (Secret do Supabase)
    if (!googleApiKey) {
      googleApiKey = Deno.env.get('GOOGLE_TTS_API_KEY')
    }

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave de API do Google não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Chamar a API do Google TTS
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'pt-BR', name: voice_name },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na API do Google TTS:', errorText)
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar áudio no Google TTS', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data = await response.json()
    const base64Audio = data.audioContent

    if (!base64Audio) {
      return new Response(
        JSON.stringify({ error: 'Google TTS não retornou conteúdo de áudio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Converter Base64 para Buffer
    const binaryString = atob(base64Audio)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 4. Salvar no Supabase Storage
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Supabase ausente no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    const { error: uploadError } = await supabase.storage
      .from('motoboy_voices')
      .upload(filename, bytes, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Erro ao salvar no Storage:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Falha ao salvar áudio no Storage', details: uploadError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 5. Retornar a URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('motoboy_voices')
      .getPublicUrl(filename)

    return new Response(
      JSON.stringify({ publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('Erro na função google-tts:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar a requisição', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
