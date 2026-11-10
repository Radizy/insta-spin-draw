-- Adiciona a coluna has_bebida na tabela de entregadores
ALTER TABLE public.entregadores 
ADD COLUMN IF NOT EXISTS has_bebida boolean DEFAULT false;

