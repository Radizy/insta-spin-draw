-- Script de Migração: Permitir "top_rank" na playlist de TV
-- O erro violava a constraint original que apenas permitia imagem, video, youtube e clima.

-- 1. Remove a constraint amarrada da coluna 'tipo'
ALTER TABLE tv_playlist DROP CONSTRAINT IF EXISTS tv_playlist_tipo_check;

-- 2. Recria a constraint adicionando 'top_rank' como opção válida
ALTER TABLE tv_playlist ADD CONSTRAINT tv_playlist_tipo_check CHECK (tipo IN ('imagem', 'video', 'youtube', 'clima', 'top_rank'));

-- Extra: garantindo que as tabelas aceitarão 'clima' e 'top_rank' como NULL na parte de URL (se houver alguma trava futura)
