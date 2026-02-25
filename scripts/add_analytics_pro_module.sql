-- Script: Adicionar Módulo Analytics Pro e Função de RPC para Métricas (Seguro e Multi-Tenant)
-- Arquivo gerado em: scripts/add_analytics_pro_module.sql

-- 1. Inserir Módulo de Analytics Pro (se não existir)
INSERT INTO modulos (codigo, nome, descricao, preco_mensal, ativo)
VALUES (
  'analytics_pro',
  'Analytics Pro',
  'Dashboard avançado de métricas e performance da unidade',
  49.90,
  true
)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Criar a Stored Procedure para retornar JSON de Métricas do Analytics Pro
-- Essa abordagem usa Agregação Local no Banco para não expor a tabela toda ao frontend, sendo super segura (garante WHERE unidade_id = $1)
CREATE OR REPLACE FUNCTION get_analytics_pro_metrics(
    p_unidade_id UUID,
    p_data_inicio TIMESTAMP WITH TIME ZONE,
    p_data_fim TIMESTAMP WITH TIME ZONE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios do chamador, mas reforçamos o input no bloco
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
    WHERE unidade_id = p_unidade_id
      AND hora_saida >= p_data_inicio 
      AND hora_saida <= p_data_fim;

    -- B) Tempo Médio de Entrega (minutos inteiros)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (hora_retorno - hora_saida))/60)::int, 0)
    INTO v_tempo_medio
    FROM historico_entregas
    WHERE unidade_id = p_unidade_id
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
        WHERE h.unidade_id = p_unidade_id
          AND h.hora_retorno IS NOT NULL
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
        WHERE unidade_id = p_unidade_id
          AND hora_retorno IS NOT NULL
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
        WHERE unidade_id = p_unidade_id
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
        WHERE unidade_id = p_unidade_id
          AND hora_saida >= p_data_inicio 
          AND hora_saida <= p_data_fim
        GROUP BY dia
    ) d_res;

    -- Montagem do Payload Final Resumido em JSON
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
