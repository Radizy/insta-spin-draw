-- Preencher unidade_id para todos os entregadores onde estiver nulo
DO $$
DECLARE
    r RECORD;
    u_id UUID;
BEGIN
    FOR r IN SELECT id, unidade FROM public.entregadores WHERE unidade_id IS NULL
    LOOP
        -- Busca a unidade mais antiga (A original, i.e. Dom Fiorentino) 
        -- que possui essa string salvada como nome_loja ou apelido
        SELECT id INTO u_id
        FROM public.unidades
        WHERE (nome_loja = r.unidade OR slug = r.unidade)
        ORDER BY created_at ASC
        LIMIT 1;

        IF u_id IS NOT NULL THEN
            UPDATE public.entregadores
            SET unidade_id = u_id
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
