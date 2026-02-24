-- Script de Ajuste: Mudar tv_playlist de franquia_id para unidade_id
-- O usuário pediu que cada unidade tenha seu próprio screensaver

-- 1. Esvaziar a tabela existente (já que eram dados de teste/da franquia)
TRUNCATE TABLE tv_playlist;

-- 2. Remover coluna antiga e adicionar a nova
ALTER TABLE tv_playlist DROP COLUMN IF EXISTS franquia_id CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tv_playlist' AND column_name = 'unidade_id') THEN
        ALTER TABLE tv_playlist ADD COLUMN unidade_id uuid REFERENCES unidades(id) ON DELETE CASCADE NOT NULL;
    END IF;
END $$;

-- 3. Atualizar Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura pública de tv_playlist ativa" ON tv_playlist;
DROP POLICY IF EXISTS "Admins podem gerenciar tv_playlist da própria franquia" ON tv_playlist;
DROP POLICY IF EXISTS "Admins e Usuários podem gerenciar tv_playlist da própria unidade" ON tv_playlist;
DROP POLICY IF EXISTS "Permitir gerenciamento de tv_playlist por usuarios autenticados" ON tv_playlist;

CREATE POLICY "Permitir leitura pública de tv_playlist ativa"
    ON tv_playlist FOR SELECT
    USING (ativo = true);

CREATE POLICY "Permitir gerenciamento de tv_playlist por usuarios autenticados"
    ON tv_playlist FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
