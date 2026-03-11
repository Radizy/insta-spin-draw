-- Add JSONB column to store the list of pending orders from Sisfood
ALTER TABLE unidades
ADD COLUMN sisfood_pedidos_fila jsonb DEFAULT '[]'::jsonb;
