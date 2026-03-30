-- 1. Criação do Módulo "Screensaver Mapa"
INSERT INTO public.modulos (codigo, nome, descricao, preco_mensal, ativo)
VALUES (
    'screensaver_mapa',
    'Screensaver Mapa',
    'Permite que a tela da TV da Loja exiba o mapa geolocalizado de entregadores quando estiver ociosa.',
    0.00,
    true
)
ON CONFLICT (codigo) DO UPDATE 
SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;

-- 2. Garantir isolamento da tabela system_config por franquia/unidade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_config' AND column_name = 'unidade_id') THEN
        ALTER TABLE public.system_config ADD COLUMN unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE;
    END IF;
END $$;
