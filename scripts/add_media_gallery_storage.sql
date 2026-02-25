-- =========================================================================
-- 1. ADICIONANDO COLUNA PARA REFERENCIAR ÁUDIO NAS BAGS
-- =========================================================================

-- Adiciona a coluna `audio_url` na tabela `franquia_bag_tipos` caso não exista
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'franquia_bag_tipos' AND column_name = 'audio_url') THEN
        ALTER TABLE franquia_bag_tipos ADD COLUMN audio_url TEXT;
    END IF;
END $$;


-- =========================================================================
-- 2. CRIAÇÃO DO BUCKET DE MEDIA (STORAGE) DA FRANQUIA
-- =========================================================================

-- Criar bucket franquia_media para arquivos gerais de uso da franquia (vídeos, fotos, áudios isolados por franquia)
INSERT INTO storage.buckets (id, name, public)
VALUES ('franquia_media', 'franquia_media', true)
ON CONFLICT (id) DO NOTHING;

-- Garantir que as policies RLS do storage existam (Leitura pública e gravação autenticada para o bucket)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for franquia_media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Public read access for franquia_media"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'franquia_media');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert to franquia_media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Authenticated insert to franquia_media"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'franquia_media');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated update on franquia_media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Authenticated update on franquia_media"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id = 'franquia_media');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated delete on franquia_media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Authenticated delete on franquia_media"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'franquia_media');
    END IF;
END $$;
