-- Update Analytics RPC to include Motoboy Punctuality
CREATE OR REPLACE FUNCTION get_analytics_pro_metrics(
    p_unidade_id UUID,
    datetime_inicio TIMESTAMP WITH TIME ZONE,
    datetime_fim TIMESTAMP WITH TIME ZONE,
    p_unidade_nome TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- A) Total de Entregas
    SELECT COUNT(*) INTO v_total_entregas
    FROM historico_entregas
    WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
      AND hora_saida BETWEEN datetime_inicio AND datetime_fim;

    -- B) Tempo Médio de Entrega (minutos inteiros)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (hora_retorno - hora_saida))/60)::int, 0)
    INTO v_tempo_medio
    FROM historico_entregas
    WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
      AND hora_retorno IS NOT NULL
      AND hora_saida BETWEEN datetime_inicio AND datetime_fim;

    -- C) Ranking de Motoboys (Top 10) - Por volume de entregas
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_ranking_motoboys
    FROM (
        SELECT 
            e.nome,
            COUNT(*) as total_entregas,
            COALESCE(AVG(EXTRACT(EPOCH FROM (h.hora_retorno - h.hora_saida))/60)::int, 0) as tempo_medio
        FROM historico_entregas h
        JOIN entregadores e ON e.id = h.entregador_id
        WHERE (h.unidade_id = p_unidade_id OR h.unidade = v_unidade_nome)
          AND h.hora_saida BETWEEN datetime_inicio AND datetime_fim
        GROUP BY e.nome
        ORDER BY total_entregas DESC
        LIMIT 10
    ) t;

    -- D) Performance por Tipo de Bag
    SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO v_performance_bag
    FROM (
        SELECT 
            COALESCE(tipo_bag, 'Não Informado') as tipo_bag,
            COUNT(*) as total,
            COALESCE(AVG(EXTRACT(EPOCH FROM (hora_retorno - hora_saida))/60)::int, 0) as tempo_medio
        FROM historico_entregas
        WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
          AND hora_saida BETWEEN datetime_inicio AND datetime_fim
        GROUP BY tipo_bag
        ORDER BY total DESC
    ) b;

    -- E) Entregas por Hora
    SELECT COALESCE(jsonb_agg(row_to_json(h_res)), '[]'::jsonb) INTO v_entregas_por_hora
    FROM (
        SELECT 
            EXTRACT(HOUR FROM hora_saida)::int as hora,
            COUNT(*) as total
        FROM historico_entregas
        WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
          AND hora_saida BETWEEN datetime_inicio AND datetime_fim
        GROUP BY hora
        ORDER BY hora
    ) h_res;

    -- F) Entregas por Dia da Semana
    SELECT COALESCE(jsonb_agg(row_to_json(d_res)), '[]'::jsonb) INTO v_entregas_por_dia
    FROM (
        SELECT 
            TRIM(TO_CHAR(hora_saida, 'Dy')) as dia,
            COUNT(*) as total
        FROM historico_entregas
        WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
          AND hora_saida BETWEEN datetime_inicio AND datetime_fim
        GROUP BY dia
    ) d_res;

    -- G) PONTUALIDADE MOTOBOY (Tempo entre Check-in e Primeira Chamada do dia)
    -- Ranking de quem chega mais cedo (tempo menor)
    SELECT COALESCE(jsonb_agg(row_to_json(p_rank)), '[]'::jsonb) INTO v_pontualidade_ranking
    FROM (
        WITH FirstCalls AS (
            SELECT 
                entregador_id, 
                DATE(hora_saida) as data_referencia, 
                MIN(hora_saida) as first_call_time
            FROM historico_entregas
            WHERE (unidade_id = p_unidade_id OR unidade = v_unidade_nome)
              AND hora_saida BETWEEN datetime_inicio AND datetime_fim
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
$$;
