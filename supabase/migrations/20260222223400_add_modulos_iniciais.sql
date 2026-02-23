INSERT INTO public.modulos (codigo, nome, descricao, preco_mensal, ativo)
VALUES 
('whatsapp', 'WhatsApp Avançado', 'Envio de mensagens automáticas e configurações da Evolution API', 0, true),
('tv_avancada', 'TV Premium', 'Animações e customizações exclusivas na tela da TV', 0, true),
('planilha', 'Integração Planilha', 'Webhook e sincronização com Google Sheets no Histórico', 0, true),
('fila_pagamento', 'Fila de Pagamento', 'Acesso à página de gestão de fila de senhas para pagamento', 0, true)
ON CONFLICT (codigo) DO UPDATE 
SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao;
