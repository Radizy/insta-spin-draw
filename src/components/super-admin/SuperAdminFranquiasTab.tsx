import React from 'react';
import { Building2, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SuperAdminFranquiasTabProps {
  searchFranquia: string;
  setSearchFranquia: (val: string) => void;
  openNewFranquiaDialog: () => void;
  isLoadingFranquias: boolean;
  filteredFranquias: any[];
  unidades: any[];
  renovarFranquiaMutation: any;
  handleToggleFranquiaStatus: (f: any) => void;
  openEditFranquiaDialog: (f: any) => void;
  handleDeleteFranquia: (f: any) => void;
}

export function SuperAdminFranquiasTab({
  searchFranquia,
  setSearchFranquia,
  openNewFranquiaDialog,
  isLoadingFranquias,
  filteredFranquias,
  unidades,
  renovarFranquiaMutation,
  handleToggleFranquiaStatus,
  openEditFranquiaDialog,
  handleDeleteFranquia,
}: SuperAdminFranquiasTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Franquias
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Filtrar por nome ou slug"
            value={searchFranquia}
            onChange={(e) => setSearchFranquia(e.target.value)}
            className="w-full sm:w-72"
          />
          <Button size="sm" className="gap-2" onClick={openNewFranquiaDialog}>
            <Plus className="w-4 h-4" /> Nova franquia
          </Button>
        </div>
      </div>

      {isLoadingFranquias ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFranquias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma franquia encontrado.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredFranquias.map((f) => {
            const lojasDaFranquia = unidades.filter((u) => u.franquia_id === f.id);
            const nomesLojas = lojasDaFranquia.map((u) => u.nome_loja).join(', ');
            return (
              <Card key={f.id} className="border-border">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {f.nome_franquia}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">slug: {f.slug}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => renovarFranquiaMutation.mutate(f)}
                      title="Renovar manualmente"
                      className="w-full sm:w-auto"
                    >
                      Renovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleFranquiaStatus(f)}
                      title="Alternar status de pagamento"
                      className="w-full sm:w-auto"
                    >
                      {f.status_pagamento === 'ativo' ? 'Inadimplente' : 'Ativar'}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openEditFranquiaDialog(f)}
                      title="Editar franquia"
                      className="w-full sm:w-9 sm:h-9 sm:w-auto"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-9 sm:h-9 sm:w-auto"
                      onClick={() => handleDeleteFranquia(f)}
                      title="Excluir franquia e todos os dados vinculados"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Lojas:</span> {lojasDaFranquia.length}
                    {f.plano_limite_lojas && ` / ${f.plano_limite_lojas}`}
                  </p>
                  {lojasDaFranquia.length > 0 && (
                    <p className="text-xs text-muted-foreground" title={nomesLojas}>
                      {nomesLojas.length > 80 ? `${nomesLojas.slice(0, 77)}...` : nomesLojas}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Status pagamento:</span>{' '}
                    {f.status_pagamento || 'não definido'}
                  </p>
                  <p>
                    <span className="font-medium">Vencimento:</span>{' '}
                    {f.data_vencimento
                      ? new Date(f.data_vencimento).toLocaleDateString('pt-BR')
                      : 'não definido'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
