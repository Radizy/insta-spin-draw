-- Adiciona o campo slug para identificação única e robusta via código
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS slug TEXT;

-- Popula os slugs para as unidades existentes da franquia Dom Fiorentino
UPDATE unidades 
SET slug = 'ITAQUA' 
WHERE nome_loja ILIKE 'Itaquaquecetuba' OR nome_loja = 'Itaqua';

UPDATE unidades 
SET slug = 'POA' 
WHERE nome_loja ILIKE 'Poá' OR nome_loja = 'POA';

UPDATE unidades 
SET slug = 'SUZANO' 
WHERE nome_loja ILIKE 'Suzano';

-- Unidade de teste
UPDATE unidades 
SET slug = 'TESTELOJA' 
WHERE nome_loja = 'testeloja';

-- Garante que o slug seja único por franquia (opcional, mas recomendado)
-- ALTER TABLE unidades ADD CONSTRAINT unique_slug_per_franchise UNIQUE (franquia_id, slug);
