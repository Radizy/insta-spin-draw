-- Script DEFINITIVO de Migração: Módulo TV Corporativa
-- Esse script apaga qualquer versão anterior quebrada da tabela e a recria purinha.

-- 1. Adicionar coluna 'cidade_clima' na tabela 'unidades'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'cidade_clima') THEN
        ALTER TABLE unidades ADD COLUMN cidade_clima text;
    END IF;
END $$;

-- 2. Limpar qualquer vestígio antigo (Vai zerar as playlists bugadas, mas resolve o conflito)
DROP TABLE IF EXISTS tv_playlist CASCADE;

-- 3. Criar a Tabela 'tv_playlist' do zero
CREATE TABLE tv_playlist (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    unidade_id uuid REFERENCES unidades(id) ON DELETE CASCADE NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('imagem', 'video', 'youtube', 'clima')),
    url text, -- Pode ser null se tipo = 'clima'
    duracao integer NOT NULL DEFAULT 15, -- Duração em Segundos
    volume integer DEFAULT 0, -- 0 a 100
    ordem integer NOT NULL DEFAULT 0,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Habilitar Row Level Security
ALTER TABLE tv_playlist ENABLE ROW LEVEL SECURITY;

-- 5. Política Permissive All (Padrão de todas as tabelas do FilaLab)
-- O FilaLab protege as inserções via FrontEnd/Regras de Negócio e o BD fica livre pra API Logada.
CREATE POLICY tv_playlist_permissive_all ON public.tv_playlist USING (true) WITH CHECK (true);
