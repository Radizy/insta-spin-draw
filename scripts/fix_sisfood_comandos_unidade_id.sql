-- Adiciona a coluna unidade_id na tabela sisfood_comandos
ALTER TABLE public.sisfood_comandos 
ADD COLUMN unidade_id uuid REFERENCES public.unidades(id);

-- Opcional: Atualizar dados existentes se possível (baseado no nome_unidade)
-- UPDATE public.sisfood_comandos c
-- SET unidade_id = u.id
-- FROM public.unidades u
-- WHERE c.unidade_nome = u.nome_loja;
