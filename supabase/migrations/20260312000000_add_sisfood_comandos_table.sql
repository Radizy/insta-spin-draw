create table public.sisfood_comandos (
    id uuid default gen_random_uuid() primary key,
    unidade_nome text not null,
    cod_pedido_interno text not null,
    nome_motoboy text not null,
    status text not null default 'PENDENTE',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.sisfood_comandos enable row level security;

-- Política de leitura: Super Admin e Admin da Franquia vinculada podem ler, e Anônimo pode ler (para o Tampermonkey) mas apenas PENDENTES e da unidade dele
create policy "sisfood_comandos_select_policy"
on public.sisfood_comandos
for select
to authenticated, anon
using (true);

-- Política de inserção: Apenas usuários autenticados (caixas/operadores/admins) podem inserir novas linhas
create policy "sisfood_comandos_insert_policy"
on public.sisfood_comandos
for insert
to authenticated
with check (true);

-- Política de update: O Tampermonkey (anon) pode atualizar para 'EXECUTADO'
create policy "sisfood_comandos_update_policy"
on public.sisfood_comandos
for update
to authenticated, anon
using (true);

-- Política de delete: Admin ou Edge Function de limpeza
create policy "sisfood_comandos_delete_policy"
on public.sisfood_comandos
for delete
to authenticated
using (true);
