-- ==========================================
-- SCRIPT DE ATUALIZAÇÃO RLS (FilaLab)
-- ==========================================
-- AVISO: NÃO aplique durante o horário de pico sem alinhar janela de manutenção.
-- Objetivo: Restringir visualização de dados apenas à franquia correta.
-- ==========================================

-- 1. Habilitar RLS nas tabelas-alvo
ALTER TABLE entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE franquias ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'entregadores'
-- O policy para visualização de entregadores:
-- O usuário logado (usando o id da franquia vindo do token auth ou contexto da aplicação) 
-- só deve ver entregadores da sua própria franquia ou se ele for super_admin.
-- IMPORTANTE: No ambiente Supabase + JWT, geralmente o 'franquia_id' pode ser injetado no token
-- ou recuperado via sub-consulta, aqui um exemplo baseado no app_metadata do JWT se estiver configurado.
-- Se o app usa JWT claims customizados:
-- current_setting('request.jwt.claims', true)::json->>'franquiaId'
CREATE POLICY "Entregadores visíveis apenas para a própria franquia" 
ON entregadores
FOR SELECT
USING (
  -- Super admin vê tudo
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin')
  OR 
  -- Admin/Operador vê da própria franquia
  (franquia_id = (current_setting('request.jwt.claims', true)::json->>'franquiaId')::uuid)
);

CREATE POLICY "Modificação de entregadores apenas para a própria franquia"
ON entregadores
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin')
  OR 
  (franquia_id = (current_setting('request.jwt.claims', true)::json->>'franquiaId')::uuid)
);

-- 3. Políticas para 'historico_entregas'
CREATE POLICY "Histórico visível apenas para a própria franquia" 
ON historico_entregas
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin')
  OR 
  (franquia_id = (current_setting('request.jwt.claims', true)::json->>'franquiaId')::uuid)
);

CREATE POLICY "Criação de histórico apenas para a própria franquia"
ON historico_entregas
FOR INSERT
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin')
  OR 
  (franquia_id = (current_setting('request.jwt.claims', true)::json->>'franquiaId')::uuid)
);

-- 4. Políticas para 'franquias'
CREATE POLICY "Franquia pode ver apenas a si mesma" 
ON franquias
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::json->>'role' = 'super_admin')
  OR 
  (id = (current_setting('request.jwt.claims', true)::json->>'franquiaId')::uuid)
);

-- ==========================================
-- Fim do script de RLS.
-- Lembrete: Teste as políticas utilizando o Role Testing do Supabase Studio antes de liberar.
-- ==========================================
