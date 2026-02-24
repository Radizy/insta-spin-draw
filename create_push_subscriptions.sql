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

CREATE POLICY "Entregadores podem ver e gerenciar suas próprias inscrições push"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = entregador_id);
