-- Migration: Add quantidade_entregas to historico_entregas and update get_analytics_pro_metrics RPC
ALTER TABLE public.historico_entregas ADD COLUMN IF NOT EXISTS quantidade_entregas INTEGER DEFAULT 1;

CREATE OR REPLACE FUNCTION public.get_analytics_pro_metrics(
    p_unidade_id uuid,
    datetime_inicio timestamp with time zone,
    datetime_fim timestamp with time zone,
    p_unidade_nome text DEFAULT NULL::text,
    p_entregador_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_unidade_nome TEXT;
    v_total_entregas INT;
    v_tempo_medio INT;
    v_ranking_motoboys JSONB;
    v_performance_bag JSONB;
    v_entregas_por_hora JSONB;
    v_entregas_por_dia JSONB;
    v_pontualidade_ranking JSONB;
    v_result JSONB;
BEGIN
    -- Get the unit name for backward compatibility
    IF p_unidade_id IS NOT NULL THEN
        SELECT nome_loja INTO v_unidade_nome FROM unidades WHERE id = p_unidade_id;
    END IF;

    -- Use provided name if ID didn't work
    IF v_unidade_nome IS NULL THEN
        v_unidade_nome := p_unidade_nome;
    END IF;

    -- A) Total de Entregas (Soma da quantidade de entregas, fallback para 1 por saída)
    SELECT COALESCE(SUM(COALESCE(quantidade_entregas, 1)), 0)::int INTO v_total_entregas
    FROM public.historico_entregas
    WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
      AND hora_saida BETWEEN datetime_inicio AND datetime_fim
      AND (p_entregador_id IS NULL OR entregador_id = p_entregador_id);

    -- B) Tempo Médio de Entrega (minutos inteiros por entrega)
    SELECT COALESCE(
        (SUM(EXTRACT(EPOCH FROM (hora_retorno - hora_saida))/60) / NULLIF(SUM(COALESCE(quantidade_entregas, 1)), 0))::int,
        0
    ) INTO v_tempo_medio
    FROM public.historico_entregas
    WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
      AND hora_retorno IS NOT NULL
      AND hora_saida BETWEEN datetime_inicio AND datetime_fim
      AND (p_entregador_id IS NULL OR entregador_id = p_entregador_id);

    -- C) Ranking de Motoboys (Top 10) - Por volume de entregas e tempo médio por entrega
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_ranking_motoboys
    FROM (
        SELECT 
            e.nome,
            SUM(COALESCE(h.quantidade_entregas, 1))::int as total_entregas,
            COALESCE(
                (SUM(EXTRACT(EPOCH FROM (h.hora_retorno - h.hora_saida))/60) / NULLIF(SUM(COALESCE(h.quantidade_entregas, 1)), 0))::int,
                0
            ) as tempo_medio
        FROM public.historico_entregas h
        JOIN entregadores e ON e.id = h.entregador_id
        WHERE (h.unidade_id = p_unidade_id OR h.unidade = v_unidade_nome)
          AND h.hora_saida BETWEEN datetime_inicio AND datetime_fim
          AND (p_entregador_id IS NULL OR h.entregador_id = p_entregador_id)
        GROUP BY e.nome
        ORDER BY total_entregas DESC
        LIMIT 10
    ) t;

    -- D) Performance por Tipo de Bag
    SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO v_performance_bag
    FROM (
        SELECT 
            COALESCE(tipo_bag, 'Não Informado') as tipo_bag,
            SUM(COALESCE(quantidade_entregas, 1))::int as total,
            COALESCE(
                (SUM(EXTRACT(EPOCH FROM (hora_retorno - hora_saida))/60) / NULLIF(SUM(COALESCE(quantidade_entregas, 1)), 0))::int,
                0
            ) as tempo_medio
        FROM public.historico_entregas
        WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
          AND hora_saida BETWEEN datetime_inicio AND datetime_fim
          AND (p_entregador_id IS NULL OR entregador_id = p_entregador_id)
        GROUP BY tipo_bag
        ORDER BY total DESC
    ) b;

    -- E) Entregas por Hora
    SELECT COALESCE(jsonb_agg(row_to_json(h_res)), '[]'::jsonb) INTO v_entregas_por_hora
    FROM (
        SELECT 
            EXTRACT(HOUR FROM hora_saida)::int as hora,
            SUM(COALESCE(quantidade_entregas, 1))::int as total
        FROM public.historico_entregas
        WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
          AND hora_saida BETWEEN datetime_inicio AND datetime_fim
          AND (p_entregador_id IS NULL OR entregador_id = p_entregador_id)
        GROUP BY hora
        ORDER BY hora
    ) h_res;

    -- F) Entregas por Dia da Semana
    SELECT COALESCE(jsonb_agg(row_to_json(d_res)), '[]'::jsonb) INTO v_entregas_por_dia
    FROM (
        SELECT 
            TRIM(TO_CHAR(hora_saida, 'Dy')) as dia,
            SUM(COALESCE(quantidade_entregas, 1))::int as total
        FROM public.historico_entregas
        WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
          AND hora_saida BETWEEN datetime_inicio AND datetime_fim
          AND (p_entregador_id IS NULL OR entregador_id = p_entregador_id)
        GROUP BY dia
    ) d_res;

    -- G) PONTUALIDADE MOTOBOY (Tempo entre Check-in e Primeira Chamada do dia)
    SELECT COALESCE(jsonb_agg(row_to_json(p_rank)), '[]'::jsonb) INTO v_pontualidade_ranking
    FROM (
        WITH FirstCalls AS (
            SELECT 
                entregador_id, 
                DATE(hora_saida) as data_referencia, 
                MIN(hora_saida) as first_call_time
            FROM public.historico_entregas
            WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
              AND hora_saida BETWEEN datetime_inicio AND datetime_fim
              AND (p_entregador_id IS NULL OR entregador_id = p_entregador_id)
            GROUP BY entregador_id, DATE(hora_saida)
        )
        SELECT 
            e.nome,
            COALESCE(AVG(EXTRACT(EPOCH FROM (fc.first_call_time - v.horario_checkin))/60)::int, 0) as tempo_medio
        FROM FirstCalls fc
        JOIN maquininha_vinculos v ON v.motoboy_id = fc.entregador_id AND v.data = fc.data_referencia
        JOIN entregadores e ON e.id = fc.entregador_id
        WHERE v.horario_checkin IS NOT NULL
        GROUP BY e.nome
        ORDER BY tempo_medio ASC
        LIMIT 10
    ) p_rank;

    -- Montagem do Payload Final
    v_result := jsonb_build_object(
        'total_entregas', v_total_entregas,
        'tempo_medio', v_tempo_medio,
        'ranking_motoboys', v_ranking_motoboys,
        'performance_bag', v_performance_bag,
        'entregas_por_hora', v_entregas_por_hora,
        'entregas_por_dia', v_entregas_por_dia,
        'pontualidade_ranking', v_pontualidade_ranking
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
