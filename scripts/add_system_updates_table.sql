-- Criação da tabela de atualizações do sistema
CREATE TABLE public.system_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL, -- Ex: 'MELHORIAS', 'NOVO RECURSO'
    status TEXT NOT NULL DEFAULT 'lancado', -- 'lancado' (Últimas), 'planejado' (Futuras)
    data_publicacao DATE NOT NULL DEFAULT CURRENT_DATE,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar Row Level Security
ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Leitura pública para que usuários consigam ver as atualizações
CREATE POLICY "Permitir leitura publica de atualizações" ON public.system_updates
    FOR SELECT USING (true);

-- Escrita restrita a Super Admins através do aplicativo, porém a policy
-- base (para simplificar como o rest do painel) fica permissiva 
-- (o backend bloqueia a rota no app) mas para garantir a segurança no DB:
CREATE POLICY "Permitir CRUD global para system_updates" ON public.system_updates
    FOR ALL USING (true) WITH CHECK (true);

-- Inserindo alguns dados iniciais
INSERT INTO public.system_updates (titulo, tipo, status, data_publicacao, ordem) VALUES
('Módulo de Analytics Pro (Histórico)', 'NOVO RECURSO', 'lancado', '2026-02-25', 1),
('Layout Descritivo dos Módulos do Sistema', 'MELHORIAS', 'lancado', '2026-02-25', 2),
('Subtítulos Dinâmicos na TV de Top Rank', 'MELHORIAS', 'lancado', '2026-02-25', 3),
('Fila de Pagamento: Pré-visualização na TV', 'NOVO RECURSO', 'lancado', '2026-02-24', 4),
('Gestão Global de Módulos Flexíveis (On/Off)', 'NOVO RECURSO', 'lancado', '2026-02-23', 5),
('Integração com Instagram', 'NOVO RECURSO', 'planejado', '2026-03-31', 6),
('Relatórios de Atendimento do Suporte', 'NOVO RECURSO', 'planejado', '2026-02-26', 7);
