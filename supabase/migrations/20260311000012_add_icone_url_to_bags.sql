-- Adicionar coluna icone_url na tabela franquia_bag_tipos
ALTER TABLE public.franquia_bag_tipos ADD COLUMN icone_url TEXT;

-- Garantir que pode nulo
ALTER TABLE public.franquia_bag_tipos ALTER COLUMN icone_url DROP NOT NULL;
