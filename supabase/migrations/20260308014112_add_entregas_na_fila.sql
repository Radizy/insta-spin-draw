-- Modificando a tabela unidades para adicionar os campos da fila em tempo real
ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS entregas_na_fila INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS entregas_na_fila_atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualizando a publicação no realtime para garantir que possamos ouvir essa tabela (mesmo que já esteja)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'unidades'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.unidades;
    END IF;
END $$;
