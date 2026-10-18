-- ==========================================================
-- FILALAB: MÓDULO DE ETIQUETAS DE PRODUÇÃO E DESCONGELAMENTO
-- TABELAS: etiquetas_produtos, etiquetas_impressoras, etiquetas_historico
-- DATA: 2026-09-08
-- ==========================================================

-- 1. TABELA DE PRODUTOS PARA ETIQUETAS
CREATE TABLE IF NOT EXISTS public.etiquetas_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID REFERENCES public.franquias(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL DEFAULT 'ITAQUA',
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Diversos',
  validade_producao_dias INTEGER NOT NULL DEFAULT 5,
  validade_descongelamento_dias INTEGER NOT NULL DEFAULT 3,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_etiquetas_produtos_unidade ON public.etiquetas_produtos(unidade);
CREATE INDEX IF NOT EXISTS idx_etiquetas_produtos_franquia ON public.etiquetas_produtos(franquia_id);

-- RLS para produtos
ALTER TABLE public.etiquetas_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etiquetas_produtos_all" ON public.etiquetas_produtos;
CREATE POLICY "etiquetas_produtos_all" ON public.etiquetas_produtos FOR ALL USING (true) WITH CHECK (true);


-- 2. TABELA DE IMPRESSORAS TÉRMICAS
CREATE TABLE IF NOT EXISTS public.etiquetas_impressoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID REFERENCES public.franquias(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL DEFAULT 'ITAQUA',
  nome TEXT NOT NULL,
  modelo TEXT NOT NULL DEFAULT 'Elgin L42 Pro Full',
  ip TEXT NOT NULL DEFAULT '192.168.0.120',
  porta INTEGER NOT NULL DEFAULT 9100,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para impressoras
CREATE INDEX IF NOT EXISTS idx_etiquetas_impressoras_unidade ON public.etiquetas_impressoras(unidade);
CREATE INDEX IF NOT EXISTS idx_etiquetas_impressoras_franquia ON public.etiquetas_impressoras(franquia_id);

-- RLS para impressoras
ALTER TABLE public.etiquetas_impressoras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etiquetas_impressoras_all" ON public.etiquetas_impressoras;
CREATE POLICY "etiquetas_impressoras_all" ON public.etiquetas_impressoras FOR ALL USING (true) WITH CHECK (true);


-- 3. TABELA DE HISTÓRICO DE IMPRESSÕES (RETENÇÃO DE 7 DIAS)
CREATE TABLE IF NOT EXISTS public.etiquetas_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franquia_id UUID REFERENCES public.franquias(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL DEFAULT 'ITAQUA',
  tipo TEXT NOT NULL DEFAULT 'producao', -- 'producao' ou 'descongelamento'
  produto_id UUID REFERENCES public.etiquetas_produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  categoria TEXT,
  peso TEXT,
  data_operacao DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_operacao TEXT NOT NULL DEFAULT '12:00',
  data_validade DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  usuario_nome TEXT NOT NULL DEFAULT 'Operador',
  impressora_nome TEXT,
  modelo_etiqueta TEXT NOT NULL DEFAULT '80x30',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_etiquetas_historico_unidade ON public.etiquetas_historico(unidade);
CREATE INDEX IF NOT EXISTS idx_etiquetas_historico_created ON public.etiquetas_historico(created_at);
CREATE INDEX IF NOT EXISTS idx_etiquetas_historico_franquia ON public.etiquetas_historico(franquia_id);

-- RLS para histórico
ALTER TABLE public.etiquetas_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "etiquetas_historico_all" ON public.etiquetas_historico;
CREATE POLICY "etiquetas_historico_all" ON public.etiquetas_historico FOR ALL USING (true) WITH CHECK (true);
