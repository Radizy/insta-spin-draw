-- Script: Limpeza Semanal do Histórico de Entregas
-- Arquivo: scripts/clean_historico_cron.sql
-- Descrição: Roda toda Segunda-feira às 09:00 AM para evitar lotação no Banco de Dados.

-- 1. Garante que a extensão de CRON do Supabase está ativada.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Desagenda o job anterior caso precise atualizar
-- SELECT cron.unschedule('cleanup-historico-semanal');

-- 3. Cria o Agendamento
-- Sintaxe Cron: 0 9 * * 1 = Minuto 0, Hora 9, Qualquer dia do Mês, Qualquer Mês, Dia da semana 1 (Segunda)
SELECT cron.schedule(
  'cleanup-historico-semanal', 
  '0 9 * * 1',                 
  $$
    -- OBSERVAÇÃO: Ao invés de apagar TUDO (o que zeraria seus gráficos de 30 dias),
    -- a melhor prática para o Analytics é apagar registros com MAIS DE 30 DIAS (ou 7 dias, se preferir).
    -- Aqui eu configurei para limpar o que for mais antigo que 30 dias, mantendo os gráficos vivos.
    DELETE FROM historico_entregas 
    WHERE hora_saida < NOW() - INTERVAL '30 days';

    -- SE VOCÊ QUISER ZERAR O BANCO INTEIRO TODA SEGUNDA, COMENTE O DELETE ACIMA E DESCOMENTE A LINHA ABAIXO:
    -- DELETE FROM historico_entregas;
  $$
);
