-- Insert or Update main modules to ensure they exist and have 0 as monthly price
INSERT INTO public.modulos (codigo, nome, preco_mensal, ativo)
VALUES 
('whatsapp', 'WhatsApp Avançado', 0, true),
('planilha', 'Integração Planilha', 0, true),
('fila_pagamento', 'Fila de Pagamento', 0, true),
('tv_avancada', 'TV Premium', 0, true),
('controle_maquininhas', 'Controle de Maquininhas', 0, true)
ON CONFLICT (codigo) DO UPDATE 
SET nome = EXCLUDED.nome, preco_mensal = EXCLUDED.preco_mensal;

DO $$
DECLARE
    v_start_plano_id UUID;
    v_pro_plano_id UUID;
    v_completo_plano_id UUID;
BEGIN
    -- 1. Plano Start Base
    SELECT id INTO v_start_plano_id FROM public.planos WHERE nome = 'Plano Start Base' LIMIT 1;
    IF v_start_plano_id IS NULL THEN
        INSERT INTO public.planos (nome, tipo, valor_base, duracao_meses, dias_trial, forma_cobranca, permite_trial, ativo)
        VALUES ('Plano Start Base', 'mensal', 99.90, 1, 7, 'mensal', true, true)
        RETURNING id INTO v_start_plano_id;
    ELSE
        UPDATE public.planos SET valor_base = 99.90 WHERE id = v_start_plano_id;
    END IF;

    -- 2. Plano Pro Base
    SELECT id INTO v_pro_plano_id FROM public.planos WHERE nome = 'Plano Pro Base' LIMIT 1;
    IF v_pro_plano_id IS NULL THEN
        INSERT INTO public.planos (nome, tipo, valor_base, duracao_meses, dias_trial, forma_cobranca, permite_trial, ativo)
        VALUES ('Plano Pro Base', 'mensal', 179.90, 1, 7, 'mensal', true, true)
        RETURNING id INTO v_pro_plano_id;
    ELSE
        UPDATE public.planos SET valor_base = 179.90 WHERE id = v_pro_plano_id;
    END IF;

    -- 3. Plano Completo Base
    SELECT id INTO v_completo_plano_id FROM public.planos WHERE nome = 'Plano Completo Base' LIMIT 1;
    IF v_completo_plano_id IS NULL THEN
        INSERT INTO public.planos (nome, tipo, valor_base, duracao_meses, dias_trial, forma_cobranca, permite_trial, ativo)
        VALUES ('Plano Completo Base', 'mensal', 249.90, 1, 7, 'mensal', true, true)
        RETURNING id INTO v_completo_plano_id;
    ELSE
        UPDATE public.planos SET valor_base = 249.90 WHERE id = v_completo_plano_id;
    END IF;

    -- 4. Pacote Start
    IF EXISTS (SELECT 1 FROM public.pacotes_comerciais WHERE codigo = 'start') THEN
        UPDATE public.pacotes_comerciais 
        SET nome = 'Pacote Start', preco_total = 99.90, modulos_inclusos = ARRAY[]::TEXT[], plano_id = v_start_plano_id
        WHERE codigo = 'start';
    ELSE
        INSERT INTO public.pacotes_comerciais (nome, codigo, preco_total, plano_id, modulos_inclusos, ativo)
        VALUES ('Pacote Start', 'start', 99.90, v_start_plano_id, ARRAY[]::TEXT[], true);
    END IF;

    -- 5. Pacote Pro
    IF EXISTS (SELECT 1 FROM public.pacotes_comerciais WHERE codigo = 'pro') THEN
        UPDATE public.pacotes_comerciais 
        SET nome = 'Pacote Pro', preco_total = 179.90, modulos_inclusos = ARRAY['tv_avancada', 'fila_pagamento', 'controle_maquininhas']::TEXT[], plano_id = v_pro_plano_id
        WHERE codigo = 'pro';
    ELSE
        INSERT INTO public.pacotes_comerciais (nome, codigo, preco_total, plano_id, modulos_inclusos, ativo)
        VALUES ('Pacote Pro', 'pro', 179.90, v_pro_plano_id, ARRAY['tv_avancada', 'fila_pagamento', 'controle_maquininhas']::TEXT[], true);
    END IF;

    -- 6. Pacote Completo
    IF EXISTS (SELECT 1 FROM public.pacotes_comerciais WHERE codigo = 'completo') THEN
        UPDATE public.pacotes_comerciais 
        SET nome = 'Pacote Completo', preco_total = 249.90, modulos_inclusos = ARRAY['tv_avancada', 'fila_pagamento', 'controle_maquininhas', 'whatsapp', 'planilha']::TEXT[], plano_id = v_completo_plano_id
        WHERE codigo = 'completo';
    ELSE
        INSERT INTO public.pacotes_comerciais (nome, codigo, preco_total, plano_id, modulos_inclusos, ativo)
        VALUES ('Pacote Completo', 'completo', 249.90, v_completo_plano_id, ARRAY['tv_avancada', 'fila_pagamento', 'controle_maquininhas', 'whatsapp', 'planilha']::TEXT[], true);
    END IF;

END $$;
