-- Migration to add 'exibir_fila_tv' to 'unidades' table
-- This allows units to configure if they want the queue sidebar visible on all TV slides.

ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS exibir_fila_tv BOOLEAN DEFAULT false;
