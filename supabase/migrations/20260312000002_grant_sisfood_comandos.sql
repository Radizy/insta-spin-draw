-- Concede permissões de acesso à tabela para as roles padrão do Supabase
GRANT ALL ON TABLE public.sisfood_comandos TO anon, authenticated, service_role;
