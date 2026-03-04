import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermosDeUsoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TermosDeUsoModal({ open, onOpenChange }: TermosDeUsoModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">TERMOS DE USO – FILALAB</DialogTitle>
                    <DialogDescription>
                        Última atualização: Março de 2026
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4 mt-4">
                    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground pb-6">
                        <p>
                            Estes Termos de Uso regulam o acesso e utilização da plataforma FilaLab e do aplicativo FilaLab Motoboy, disponibilizados por FilaLab Tecnologia Ltda., doravante denominada apenas “FilaLab”.
                        </p>
                        <p>
                            Ao acessar ou utilizar o sistema, o usuário declara estar ciente e de acordo com estes Termos.
                        </p>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">1. NATUREZA DO SERVIÇO</h3>
                            <p>1.1 O FilaLab é uma plataforma fornecida na modalidade Software como Serviço (SaaS), destinada à gestão operacional de entregas, filas e controle de motoboys.</p>
                            <p>1.2 O FilaLab não participa da operação logística, não intermedeia entregas, não contrata entregadores e não interfere na gestão interna das franquias.</p>
                            <p>1.3 O FilaLab atua exclusivamente como fornecedor de tecnologia.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">2. RESPONSABILIDADE DA FRANQUIA</h3>
                            <p>2.1 A franquia é integralmente responsável:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Pela contratação de seus colaboradores</li>
                                <li>Pelo cumprimento de obrigações trabalhistas</li>
                                <li>Pela gestão das entregas</li>
                                <li>Pela veracidade dos dados inseridos</li>
                                <li>Pelo uso adequado das informações coletadas</li>
                            </ul>
                            <p className="mt-2">2.2 O FilaLab não possui qualquer vínculo empregatício ou societário com entregadores ou funcionários das franquias.</p>
                            <p>2.3 Eventuais disputas trabalhistas, civis ou comerciais envolvendo entregadores não geram qualquer responsabilidade solidária ou subsidiária para o FilaLab.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">3. CADASTRO E SEGURANÇA</h3>
                            <p>3.1 O usuário é responsável por manter suas credenciais de acesso sob sigilo.</p>
                            <p>3.2 O FilaLab não se responsabiliza por acessos indevidos decorrentes de compartilhamento de senha.</p>
                            <p>3.3 O usuário compromete-se a notificar imediatamente qualquer suspeita de uso não autorizado.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">4. DISPONIBILIDADE E NÍVEL DE SERVIÇO</h3>
                            <p>4.1 O FilaLab busca manter alta disponibilidade da plataforma, porém não garante funcionamento ininterrupto ou livre de erros.</p>
                            <p>4.2 O sistema poderá ser temporariamente interrompido para:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Manutenção preventiva ou corretiva</li>
                                <li>Atualizações técnicas</li>
                                <li>Falhas de infraestrutura de terceiros</li>
                                <li>Caso fortuito ou força maior</li>
                            </ul>
                            <p className="mt-2">4.3 Não haverá indenização por indisponibilidade temporária do sistema.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">5. LIMITAÇÃO DE RESPONSABILIDADE</h3>
                            <p>5.1 O FilaLab não se responsabiliza por:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Perdas financeiras decorrentes de decisões operacionais</li>
                                <li>Falhas de internet do usuário</li>
                                <li>Problemas em serviços de terceiros</li>
                                <li>Mau uso da plataforma</li>
                                <li>Inserção incorreta de dados</li>
                                <li>Perda de negócios ou lucros cessantes</li>
                            </ul>
                            <p className="mt-2">5.2 Em qualquer hipótese, a responsabilidade total do FilaLab limita-se ao valor efetivamente pago pelo usuário nos últimos 12 meses anteriores ao evento que originou a reclamação.</p>
                            <p>5.3 O FilaLab não será responsável por danos indiretos, lucros cessantes, danos morais ou prejuízos decorrentes de paralisação operacional.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">6. DADOS E BACKUP</h3>
                            <p>6.1 O FilaLab adota medidas técnicas razoáveis para proteção dos dados.</p>
                            <p>6.2 O usuário reconhece que nenhum sistema é totalmente imune a falhas.</p>
                            <p>6.3 O FilaLab não garante backup eterno ou armazenamento permanente de dados após cancelamento da conta.</p>
                            <p>6.4 Após o encerramento contratual, os dados poderão ser excluídos definitivamente.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">7. USO INDEVIDO E BLOQUEIO</h3>
                            <p>7.1 O FilaLab poderá suspender ou cancelar contas que:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Violar estes Termos</li>
                                <li>Utilizar o sistema para fins ilícitos</li>
                                <li>Tentarem explorar vulnerabilidades</li>
                                <li>Estiverem inadimplentes</li>
                            </ul>
                            <p className="mt-2">7.2 A suspensão poderá ocorrer sem aviso prévio em caso de risco à segurança da plataforma.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">8. PROPRIEDADE INTELECTUAL</h3>
                            <p>8.1 Todo o código-fonte, estrutura, layout, banco de dados, marca e funcionalidades pertencem exclusivamente à FilaLab Tecnologia Ltda.</p>
                            <p>8.2 É expressamente proibido:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Copiar o sistema</li>
                                <li>Realizar engenharia reversa</li>
                                <li>Revender sem autorização formal</li>
                                <li>Criar sistema derivado com base na plataforma</li>
                            </ul>
                            <p className="mt-2">O descumprimento poderá gerar responsabilização civil e criminal.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">9. PAGAMENTOS E INADIMPLÊNCIA</h3>
                            <p>9.1 O acesso pode depender de pagamento recurrente conforme plano contratado.</p>
                            <p>9.2 O atraso no pagamento poderá resultar em:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Suspensão automática do acesso</li>
                                <li>Bloqueio parcial de funcionalidades</li>
                                <li>Cancelamento da conta</li>
                            </ul>
                            <p className="mt-2">9.3 O restabelecimento poderá depender da quitação integral dos débitos.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">10. ALTERAÇÕES NO SISTEMA</h3>
                            <p>10.1 O FilaLab poderá modificar funcionalidades, layout ou estrutura da plataforma a qualquer momento, visando melhoria contínua.</p>
                            <p>10.2 Novos recursos podem ser disponibilizados mediante contratação adicional.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">11. MODIFICAÇÕES DOS TERMOS</h3>
                            <p>O FilaLab poderá alterar estes Termos a qualquer momento.</p>
                            <p>O uso contínuo do sistema após atualização constitui aceitação automática das novas condições.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">12. FORO</h3>
                            <p>Fica eleito o foro da comarca de São Paulo/SP, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir eventuais controvérsias decorrentes destes Termos.</p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
