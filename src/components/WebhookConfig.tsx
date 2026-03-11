import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function WebhookConfig() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        {/* Placeholder for future webhook specific configurations since nome_loja was moved out */}
        <h2 className="text-xl font-bold font-mono text-muted-foreground">Integrações Genéricas (Em breve)</h2>
        <p className="text-sm text-muted-foreground">
          As configurações de Nome da Loja foram movidas para a aba "Dados da Loja".
        </p>
      </div>
    </div>
  );
}
