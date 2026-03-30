-- Dropa a constraint antiga do tipo de mídia na playlist
ALTER TABLE public.tv_playlist DROP CONSTRAINT IF EXISTS tv_playlist_tipo_check;

-- Cria novamente a constraint aceitando todos os módulos ativos de FilaLab (clima, top_rank e o novo mapa)
ALTER TABLE public.tv_playlist ADD CONSTRAINT tv_playlist_tipo_check 
CHECK (tipo IN ('imagem', 'video', 'youtube', 'mapa', 'aviso', 'noticia', 'clima', 'top_rank'));
