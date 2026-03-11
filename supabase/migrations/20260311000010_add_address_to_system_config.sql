-- Add store address and coordinates to system_config
ALTER TABLE system_config
ADD COLUMN cep text,
ADD COLUMN endereco text,
ADD COLUMN numero text,
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric;
