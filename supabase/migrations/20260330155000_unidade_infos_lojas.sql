-- Add structural columns to keep system_config operational
ALTER TABLE public.system_config
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text;

-- Also make sure unidades has the exact JSON arrays explicitly
ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS sisfood_pedidos_fila jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS saipos_pedidos_fila jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS saipos_mapa_pedidos jsonb DEFAULT '[]'::jsonb;
