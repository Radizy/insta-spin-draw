-- Adiciona campos granulares de endereço para maior precisão e organização
ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS rua text,
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text;
