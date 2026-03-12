-- Adiciona a extensão pg_cron se não existir (apenas para compatibilidade futura/projetos supremos)
create extension if not exists pg_cron;

-- Criação da função de limpeza
create or replace function public.cleanup_sisfood_comandos()
returns void as $$
begin
  delete from public.sisfood_comandos
  where created_at < current_date;
end;
$$ language plpgsql security definer;

-- Criação do Cron usando a extensão nativa do supabase para executar toda meia noite
select cron.schedule(
    'limpeza-diaria-sisfood-comandos',
    '0 0 * * *', 
    $$select public.cleanup_sisfood_comandos()$$
);
