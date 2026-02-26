import React, { createContext, useContext, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export type TutorialStep = 'none' | 'chamar_entrega' | 'mover_em_entrega' | 'remover_fila' | 'reset_expediente' | 'finished';

interface TrainingContextData {
    isTrainingMode: boolean;
    startTraining: () => void;
    stopTraining: () => void;
    currentStep: TutorialStep;
    setCurrentStep: (step: TutorialStep) => void;
    fakeEntregadores: any[];
    setFakeEntregadores: (entregadores: any[]) => void;
    fakeHistorico: any[];
    setFakeHistorico: (h: any[]) => void;
    completeTutorial: () => void;
}

const TrainingContext = createContext<TrainingContextData>({} as TrainingContextData);

export function TrainingProvider({ children }: { children: ReactNode }) {
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [currentStep, setCurrentStep] = useState<TutorialStep>('none');
    const [fakeEntregadores, setFakeEntregadores] = useState<any[]>([]);
    const [fakeHistorico, setFakeHistorico] = useState<any[]>([]);

    const generateFakeEntregadores = () => {
        return [
            {
                id: 'fake-1',
                nome: 'João (Teste)',
                telefone: '11999999999',
                status: 'disponivel',
                ativo: true,
                unidade_id: 'fake-unit',
                fila_posicao: new Date().toISOString(),
            },
            {
                id: 'fake-2',
                nome: 'Maria (Teste)',
                telefone: '11888888888',
                status: 'disponivel',
                ativo: true,
                unidade_id: 'fake-unit',
                fila_posicao: new Date(Date.now() + 1000).toISOString(),
            },
            {
                id: 'fake-3',
                nome: 'Pedro (Teste)',
                telefone: '11777777777',
                status: 'disponivel',
                ativo: true,
                unidade_id: 'fake-unit',
                fila_posicao: new Date(Date.now() + 2000).toISOString(),
            }
        ];
    };

    const startTraining = () => {
        setIsTrainingMode(true);
        setCurrentStep('chamar_entrega');
        setFakeEntregadores(generateFakeEntregadores());
        setFakeHistorico([]);
        toast.success('Iniciando Modo de Treinamento. Siga as instruções na tela.');
    };

    const stopTraining = () => {
        setIsTrainingMode(false);
        setCurrentStep('none');
        setFakeEntregadores([]);
        setFakeHistorico([]);
        toast('Você saiu do modo de treinamento.');
    };

    const completeTutorial = () => {
        setCurrentStep('finished');
        toast.success('Parabéns, você concluiu o treinamento básico!');
    };

    return (
        <TrainingContext.Provider value={{
            isTrainingMode,
            startTraining,
            stopTraining,
            currentStep,
            setCurrentStep,
            fakeEntregadores,
            setFakeEntregadores,
            fakeHistorico,
            setFakeHistorico,
            completeTutorial
        }}>
            {children}
        </TrainingContext.Provider>
    );
}

export function useTraining() {
    const context = useContext(TrainingContext);
    if (!context) {
        throw new Error('useTraining must be used within a TrainingProvider');
    }
    return context;
}
