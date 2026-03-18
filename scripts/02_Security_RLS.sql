-- ==============================================================================
-- 🛡️ SCRIPT DE SEGURANÇA 2: POLÍTICAS RLS (CRONOGRAMA PROGRESSIVO)
-- Este script substitui o RLS "aberto" (USING true) por RLS checando o crachá (JWT).
-- ==============================================================================

-- 1. Remoção das políticas antigas abertas das tabelas mais perigosas
DROP POLICY IF EXISTS "franquias_permissive_all" ON franquias;
DROP POLICY IF EXISTS "system_users_permissive_all" ON system_users;
DROP POLICY IF EXISTS "unidades_permissive_all" ON unidades;

-- A tabela de login precisa continuar permitindo a leitura anônima para a função auth-login funcionar
-- A edge function pode usar a service_role, mas vamos manter a política de select_for_login se existir.
-- Evitamos deletar: DROP POLICY IF EXISTS "system_users_select_for_login" ON system_users;

-- 2. Novas Políticas para a tabela FRANQUIAS
-- Super Admin vê tudo. Admin da Franquia vê só a própria franquia.
CREATE POLICY "franquias_jwt_policy" ON franquias
FOR SELECT USING (
  -- Super admin (role = super_admin)
  (auth.jwt() ->> 'role' = 'super_admin') 
  OR 
  -- Ou franqueado vendo sua própria franquia
  (id::text = (auth.jwt() ->> 'franquia_id'))
);

-- UPDATE em Franquias: Apenas Super Admin.
CREATE POLICY "franquias_update_policy" ON franquias
FOR UPDATE USING (
  (auth.jwt() ->> 'role' = 'super_admin')
);

-- DELETE em Franquias: Apenas Super Admin.
CREATE POLICY "franquias_delete_policy" ON franquias
FOR DELETE USING (
  (auth.jwt() ->> 'role' = 'super_admin')
);


-- 3. Novas Políticas para a tabela SYSTEM_USERS (Usuários Administrativos)
CREATE POLICY "system_users_jwt_policy" ON system_users
FOR SELECT USING (
  -- Super admin vê todos
  (auth.jwt() ->> 'role' = 'super_admin') 
  OR 
  -- Admin da Franquia vê os usuários da sua franquia
  (franquia_id::text = (auth.jwt() ->> 'franquia_id'))
  OR
  -- Operador vê apenas ele mesmo
  (id::text = (auth.jwt() ->> 'sub'))
);

CREATE POLICY "system_users_update_policy" ON system_users
FOR UPDATE USING (
  (auth.jwt() ->> 'role' = 'super_admin') 
  OR 
  (franquia_id::text = (auth.jwt() ->> 'franquia_id') AND auth.jwt() ->> 'role' = 'admin_franquia')
);


-- 4. Novas Políticas para a tabela UNIDADES (Lojas)
CREATE POLICY "unidades_jwt_policy" ON unidades
FOR SELECT USING (
  (auth.jwt() ->> 'role' = 'super_admin') 
  OR 
  (franquia_id::text = (auth.jwt() ->> 'franquia_id'))
);

CREATE POLICY "unidades_update_policy" ON unidades
FOR UPDATE USING (
  (auth.jwt() ->> 'role' = 'super_admin') 
  OR 
  (franquia_id::text = (auth.jwt() ->> 'franquia_id') AND auth.jwt() ->> 'role' = 'admin_franquia')
);

-- ==============================================================================
-- NOTA IMPORTANTE: As tabelas operacionais (entregadores, historico_entregas, senhas_pagamento) 
-- continuam com RLS permissivo por ora para garantir que a fila na TV e WebApp do motoboy não quebrem
-- até validarmos que o Token está sendo passado 100% corretamente em todas as requisições.
-- ==============================================================================
