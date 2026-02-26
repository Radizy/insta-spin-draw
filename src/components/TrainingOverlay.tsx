import React from 'react';
import { useTraining } from '@/contexts/TrainingContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, CheckCircle2 } from 'lucide-react';

export function TrainingOverlay() {
    const { currentStep, setCurrentStep, stopTraining, completeTutorial } = useTraining();

    if (currentStep === 'none') return null;

    const renderContent = () => {
        switch (currentStep) {
            case 'chamar_entrega':
                return (
                    <>
                        <p className="text-sm mb-4">
                            <strong>1.</strong> Clique na aba "Roteirista".<br />
                            <strong>2.</strong> Clique em "Chamar o próximo".<br />
                            <strong>3.</strong> Coloque a quantidade, tipo de bag e se tem bebida.<br />
                            <strong>4.</strong> Clique em "Chamar".
                        </p>
                        <Button onClick={() => setCurrentStep('mover_em_entrega')} className="w-full">
                            Próximo Passo
                        </Button>
                    </>
                );
            case 'mover_em_entrega':
                return (
                    <>
                        <p className="text-sm mb-4">
                            <strong>1.</strong> No Roteirista, localize o Motoboy aguardando entrega.<br />
                            <strong>2.</strong> Clique em "Ações".<br />
                            <strong>3.</strong> Clique em "Mover para Em Entrega".
                        </p>
                        <Button onClick={() => setCurrentStep('remover_fila')} className="w-full">
                            Próximo Passo
                        </Button>
                    </>
                );
            case 'remover_fila':
                return (
                    <>
                        <p className="text-sm mb-4">
                            <strong>1.</strong> Localize o Motoboy na coluna "Em Entrega".<br />
                            <strong>2.</strong> Clique em "Ações".<br />
                            <strong>3.</strong> Clique em "Remover da fila".
                        </p>
                        <Button onClick={() => setCurrentStep('pular_vez')} className="w-full">
                            Próximo Passo
                        </Button>
                    </>
                );
            case 'pular_vez':
                return (
                    <>
                        <p className="text-sm mb-4">
                            <strong>1.</strong> Localize um Motoboy na lista "Disponíveis".<br />
                            <strong>2.</strong> Clique no botão "Pular" e veja as opções.<br />
                            <strong>3.</strong> Escolha: Voltar ele pra Último, ou Assumir como Próximo.<br />
                            <strong>4.</strong> Descreva o Motivo e submeta.
                        </p>
                        <Button onClick={() => setCurrentStep('reset_expediente')} className="w-full">
                            Próximo Passo
                        </Button>
                    </>
                );
            case 'reset_expediente':
                return (
                    <>
                        <p className="text-sm mb-4">
                            <strong>1.</strong> Clique na aba "Configuração" no menu superior.<br />
                            <strong>2.</strong> Clique no botão vermelho "Reset de Expediente".<br />
                            <strong>3.</strong> Confirme clicando em "Confirmar Reset".
                        </p>
                        <Button onClick={() => completeTutorial()} className="w-full">
                            Estou Pronto!
                        </Button>
                    </>
                );
            case 'finished':
                return (
                    <div className="flex flex-col items-center text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                        <p className="text-sm font-semibold">Parabéns, você concluiu o treinamento básico!</p>
                        <p className="text-xs text-muted-foreground mb-4">Você já pode operar a loja real.</p>
                        <Button onClick={stopTraining} className="w-full" variant="default">
                            Finalizar Treinamento
                        </Button>
                    </div>
                );
            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (currentStep) {
            case 'chamar_entrega': return "Passo 1: Chamar Entrega";
            case 'mover_em_entrega': return "Passo 2: Entregar Pedido";
            case 'remover_fila': return "Passo 3: Desfazer Entrega";
            case 'pular_vez': return "Passo 4: Pular a Vez";
            case 'reset_expediente': return "Passo 5: Fechar o Dia";
            case 'finished': return "Treinamento Concluído 🎉";
            default: return "";
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200] w-80 shadow-2xl animate-in slide-in-from-bottom-5">
            <Card className="border-primary/50 shadow-primary/20 bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-border/50 bg-primary/5 rounded-t-xl">
                    <CardTitle className="text-md flex items-center gap-2 text-primary">
                        <GraduationCap className="w-5 h-5" />
                        {getTitle()}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}
