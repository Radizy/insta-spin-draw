-- Script: Atualizar RPC do Analytics para filtrar por nome da unidade em invés do ID (Compatibilidade)
-- Arquivo: scripts/fix_analytics_rpc.sql

-- 1. Removemos a função anterior baseada em UUID (caso o usuário tenha rodado)
DROP FUNCTION IF EXISTS get_analytics_pro_metrics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- 2. Recriamos filtrando pela coluna de texto "unidade" igual no código legado
CREATE OR REPLACE FUNCTION get_analytics_pro_metrics(
    p_unidade_nome TEXT,
    p_data_inicio TIMESTAMP WITH TIME ZONE,
    p_data_fim TIMESTAMP WITH TIME ZONE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_entregas INT;
    v_tempo_medio INT;
    v_ranking_motoboys JSONB;
    v_performance_bag JSONB;
    v_entregas_por_hora JSONB;
    v_entregas_por_dia JSONB;
    v_result JSONB;
BEGIN

    -- A) Total de Entregas
    SELECT COUNT(*) INTO v_total_entregas
    FROM historico_entregas
    WHERE unidade = p_unidade_nome
      AND hora_saida >= p_data_inicio 
      AND hora_saida <= p_data_fim;

    -- B) Tempo Médio de Entrega (minutos inteiros)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (hora_retorno - hora_saida))/60)::int, 0)
    INTO v_tempo_medio
    FROM historico_entregas
    WHERE unidade = p_unidade_nome
      AND hora_retorno IS NOT NULL
      AND hora_saida >= p_data_inicio 
      AND hora_saida <= p_data_fim;

    -- C) Ranking de Motoboys (Top 10)
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_ranking_motoboys
    FROM (
        SELECT 
            e.nome,
            COUNT(*) as total_entregas,
            COALESCE(AVG(EXTRACT(EPOCH FROM (h.hora_retorno - h.hora_saida))/60)::int, 0) as tempo_medio
        FROM historico_entregas h
        JOIN entregadores e ON e.id = h.entregador_id
        WHERE h.unidade = p_unidade_nome
          AND h.hora_saida >= p_data_inicio 
          AND h.hora_saida <= p_data_fim
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
        WHERE unidade = p_unidade_nome
          AND hora_saida >= p_data_inicio 
          AND hora_saida <= p_data_fim
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
        WHERE unidade = p_unidade_nome
          AND hora_saida >= p_data_inicio 
          AND hora_saida <= p_data_fim
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
        WHERE unidade = p_unidade_nome
          AND hora_saida >= p_data_inicio 
          AND hora_saida <= p_data_fim
        GROUP BY dia
    ) d_res;

    -- Montagem do Payload Final
    v_result := jsonb_build_object(
        'total_entregas', v_total_entregas,
        'tempo_medio', v_tempo_medio,
        'ranking_motoboys', v_ranking_motoboys,
        'performance_bag', v_performance_bag,
        'entregas_por_hora', v_entregas_por_hora,
        'entregas_por_dia', v_entregas_por_dia
    );

    RETURN v_result;
END;
$$;
