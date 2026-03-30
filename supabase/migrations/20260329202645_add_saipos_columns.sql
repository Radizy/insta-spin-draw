-- Add JSONB column to store the list of pending orders from Saipos
ALTER TABLE unidades
ADD COLUMN saipos_pedidos_fila jsonb DEFAULT '[]'::jsonb;

-- Add INTEGER column to store the count of pending deliveries in Saipos (to optimize queries)
ALTER TABLE unidades
ADD COLUMN entregas_na_fila_saipos integer DEFAULT 0;

-- Add the new module definition
INSERT INTO public.modulos (codigo, nome, descricao, preco_mensal, ativo)
VALUES 
('saipos_integration', 'Integração Saipos', 'Integração em tempo-real com Kanban do Saipos', 0, true)
ON CONFLICT (codigo) DO UPDATE 
SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;
