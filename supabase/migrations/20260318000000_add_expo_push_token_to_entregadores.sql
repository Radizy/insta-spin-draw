-- Adiciona coluna para o token do Expo Push Notification na tabela de entregadores
ALTER TABLE public.entregadores ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.entregadores.expo_push_token IS 'Token único do Expo Push Notification para envio de notificações via App Android (APK).';
