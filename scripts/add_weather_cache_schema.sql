-- Script para adicionar e suportar Cache de Clima das Cidades
-- Tabela Alvo: unidades

-- Passo 1: Adicionar colunas
ALTER TABLE unidades 
ADD COLUMN IF NOT EXISTS clima_cache JSONB,
ADD COLUMN IF NOT EXISTS clima_updated_at TIMESTAMP WITH TIME ZONE;

-- Passo 2: Criar tabela ou habilitar a extensão pg_cron e pg_net. 
-- *Obs:* As extensões 'pg_cron' e 'pg_net' geralmente vêm ativadas em projetos Supabase.
-- Se não estiverem, execute as linhas abaixo (pode exigir privilégio de superusuário):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;


-- Passo 3: Agendar execução para rodar a cada 20 minutos usando a função cron.schedule
-- Substitua 'YOUR_SUPABASE_URL' (ex: https://xxx.supabase.co) e 'YOUR_SERVICE_ROLE_KEY' (A chave anônima ou service_role usada para disparar a function).
-- Sugerimos que caso esse schedule não rode por falta de liberação 'anon', execute-o atrelado a sua service_role_key direto do Painel SQL do Supabase.

-- IMPORTANTE: Rode este bloco isoladamente depois de ter substituído os valores.

-- SELECT cron.schedule(
--   'sync-weather-cron',      -- Nome da tarefa
--   '*/20 * * * *',           -- Expressão: a cada 20 minutos
--   $$
--     SELECT net.http_post(
--       url:='https://<SUA-URL-SUPABASE>.supabase.co/functions/v1/sync-weather-data',
--       headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SUA-SERVICE-ROLE-KEY>"}'::jsonb,
--       body:='{}'::jsonb
--     );
--   $$
-- );

-- (Opcional) Consultar tarefas agendadas:
-- SELECT * FROM cron.job;

-- (Opcional) Remover o agendamento caso precise alterar:
-- SELECT cron.unschedule('sync-weather-cron');
