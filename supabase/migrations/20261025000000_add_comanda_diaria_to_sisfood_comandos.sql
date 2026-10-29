-- Adiciona a coluna comanda_diaria na tabela sisfood_comandos
ALTER TABLE public.sisfood_comandos 
ADD COLUMN IF NOT EXISTS comanda_diaria text;
