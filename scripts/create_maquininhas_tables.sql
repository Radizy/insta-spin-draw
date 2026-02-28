-- ============================================
-- SQL Migration: Controle de Maquininhas
-- Module: controle_maquininhas (BETA)
-- ============================================

-- 1. Register new module
INSERT INTO modulos (codigo, nome, descricao, preco_mensal, ativo)
VALUES ('controle_maquininhas', 'Controle de Maquininhas (BETA)', 'Controle de retirada e devolução de maquininhas por motoboys', 0, true)
ON CONFLICT (codigo) DO UPDATE 
SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;

-- 2. Table: maquininhas
CREATE TABLE IF NOT EXISTS maquininhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    numero_serie TEXT,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    franquia_id UUID REFERENCES franquias(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'livre', -- livre | em_uso
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Table: maquininha_vinculos
CREATE TABLE IF NOT EXISTS maquininha_vinculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motoboy_id UUID NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
    maquininha_id UUID NOT NULL REFERENCES maquininhas(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    franquia_id UUID REFERENCES franquias(id) ON DELETE CASCADE,
    data DATE DEFAULT CURRENT_DATE,
    horario_checkin TIMESTAMP WITH TIME ZONE,
    horario_retirada TIMESTAMP WITH TIME ZONE,
    horario_devolucao TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'em_uso', -- em_uso | devolvida
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Note: Constraint "Only 1 active link per machine" is handled at application level 
-- but could also be enforced here with a partial unique index:
CREATE UNIQUE INDEX IF NOT EXISTS idx_maquininha_ativa ON maquininha_vinculos (maquininha_id) WHERE (status = 'em_uso');

-- 4. RLS Policies (Permissive as per system pattern)
ALTER TABLE maquininhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquininha_vinculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maquininhas_permissive_all" ON maquininhas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "maquininha_vinculos_permissive_all" ON maquininha_vinculos FOR ALL USING (true) WITH CHECK (true);
