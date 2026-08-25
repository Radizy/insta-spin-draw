-- =========================================================================
-- SCRIPT SQL: Criação das Tabelas Janta & Ponto (Equipe Interna)
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- =========================================================================

-- 1. Tabela de Funcionários Internos (Pizzaiolos, Atendentes, Cozinha, etc.)
CREATE TABLE IF NOT EXISTS public.funcionarios_internos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franquia_id UUID,
    unidade TEXT NOT NULL,
    nome TEXT NOT NULL,
    cargo TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de busca rápida por unidade e status
CREATE INDEX IF NOT EXISTS idx_funcionarios_internos_unidade ON public.funcionarios_internos(unidade);
CREATE INDEX IF NOT EXISTS idx_funcionarios_internos_ativo ON public.funcionarios_internos(ativo);

-- 2. Tabela de Registros de Ponto e Intervalo (Janta)
CREATE TABLE IF NOT EXISTS public.registros_ponto_intervalo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios_internos(id) ON DELETE CASCADE,
    franquia_id UUID,
    unidade TEXT NOT NULL,
    data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
    checkin_at TIMESTAMP WITH TIME ZONE,
    saida_janta_at TIMESTAMP WITH TIME ZONE,
    retorno_janta_at TIMESTAMP WITH TIME ZONE,
    tempo_total_janta_minutos INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ausente' CHECK (status IN ('ausente', 'trabalhando', 'em_janta', 'finalizado')),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_funcionario_data UNIQUE (funcionario_id, data_referencia)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_registros_ponto_unidade_data ON public.registros_ponto_intervalo(unidade, data_referencia);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data ON public.registros_ponto_intervalo(data_referencia);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_funcionario ON public.registros_ponto_intervalo(funcionario_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.funcionarios_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto_intervalo ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir leitura funcionarios_internos" ON public.funcionarios_internos;
    CREATE POLICY "Permitir leitura funcionarios_internos" ON public.funcionarios_internos FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Permitir escrita funcionarios_internos" ON public.funcionarios_internos;
    CREATE POLICY "Permitir escrita funcionarios_internos" ON public.funcionarios_internos FOR ALL USING (true);

    DROP POLICY IF EXISTS "Permitir leitura registros_ponto_intervalo" ON public.registros_ponto_intervalo;
    CREATE POLICY "Permitir leitura registros_ponto_intervalo" ON public.registros_ponto_intervalo FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Permitir escrita registros_ponto_intervalo" ON public.registros_ponto_intervalo;
    CREATE POLICY "Permitir escrita registros_ponto_intervalo" ON public.registros_ponto_intervalo FOR ALL USING (true);
END $$;
