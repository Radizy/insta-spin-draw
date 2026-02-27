import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Substitua pelo seu VAPID public key real (pode ser gerado com web-push library)
const PUBLIC_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDykRxTGArvdn3K_mSyBfs4lJ8PjIay3lIapK1D2yYxw';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function PushNotificationToggle({ entregadorId }: { entregadorId: string }) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await (registration as any).pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (e) {
            console.error('Erro ao verificar inscrição:', e);
        }
    };

    const subscribeUser = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Seu navegador não suporta notificações Push.');
            return;
        }

        setIsLoading(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permissão negada.');
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await (registration as any).pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            });

            const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!)));
            const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!)));

            // Salva no banco de dados via Supabase
            const { error } = await supabase.from('push_subscriptions' as any).upsert({
                entregador_id: entregadorId,
                endpoint: subscription.endpoint,
                p256dh: p256dh,
                auth: auth
            }, { onConflict: 'entregador_id, endpoint' });

            if (error) throw error;

            setIsSubscribed(true);
            toast.success('Notificações ativadas com sucesso!');
        } catch (e) {
            console.error('Falha ao se inscrever:', e);
            toast.error('Não foi possível ativar as notificações.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={subscribeUser}
            disabled={isSubscribed || isLoading}
            variant={isSubscribed ? "secondary" : "outline"}
            className="w-full gap-2 mt-4"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />)}
            {isSubscribed ? 'Notificações Ativas' : 'Ativar Notificações'}
        </Button>
    );
}
