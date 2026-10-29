-- Script avulso para rodar no SQL Editor do Supabase se necessário:
ALTER TABLE public.sisfood_comandos 
ADD COLUMN IF NOT EXISTS comanda_diaria text;
