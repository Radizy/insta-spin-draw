CREATE TABLE public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(entregador_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserção de inscrições push"
    ON public.push_subscriptions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir atualização de inscrições push"
    ON public.push_subscriptions
    FOR UPDATE
    USING (true);

CREATE POLICY "Permitir leitura de inscrições push"
    ON public.push_subscriptions
    FOR SELECT
    USING (true);
