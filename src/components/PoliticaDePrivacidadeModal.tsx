import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PoliticaDePrivacidadeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PoliticaDePrivacidadeModal({ open, onOpenChange }: PoliticaDePrivacidadeModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">POLÍTICA DE PRIVACIDADE – FILALAB</DialogTitle>
                    <DialogDescription>
                        Última atualização: Março de 2026
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4 mt-4">
                    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground pb-6">
                        <p>
                            Esta Política de Privacidade descreve como a FilaLab Tecnologia Ltda., doravante denominada “FilaLab”, realiza o tratamento de dados pessoais no contexto da disponibilização da plataforma FilaLab e do aplicativo FilaLab Motoboy.
                        </p>
                        <p>
                            Ao utilizar os serviços, o usuário declara estar ciente e de acordo com esta Política.
                        </p>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">1. NATUREZA DA ATUAÇÃO</h3>
                            <p>1.1 O FilaLab atua como fornecedor de tecnologia na modalidade Software como Serviço (SaaS).</p>
                            <p>1.2 No tratamento de dados de entregadores e colaboradores das franquias, o FilaLab atua como OPERADOR, nos termos da Lei nº 13.709/2018 (LGPD).</p>
                            <p>1.3 A franquia contratante é a CONTROLADORA dos dados de seus colaboradores, sendo integralmente responsável pela coleta, finalidade e base legal do tratamento.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">2. DADOS COLETADOS</h3>
                            <p className="font-semibold mt-2 mb-1 text-primary">2.1 Dados de Cadastro</p>
                            <p>Podem ser coletados:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Nome</li>
                                <li>Telefone</li>
                                <li>E-mail</li>
                                <li>CPF ou CNPJ</li>
                                <li>Dados da unidade/franquia</li>
                                <li>Credenciais de acesso</li>
                            </ul>

                            <p className="font-semibold mt-4 mb-1 text-primary">2.2 Dados Operacionais</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Registros de entregas</li>
                                <li>Horários de saída e retorno</li>
                                <li>Status operacional</li>
                                <li>Histórico de utilização</li>
                                <li>Logs de acesso</li>
                            </ul>

                            <p className="font-semibold mt-4 mb-1 text-primary">2.3 Dados de Localização (quando aplicável)</p>
                            <p>Caso o aplicativo FilaLab Motoboy esteja ativo, poderão ser coletados:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Localização em tempo real</li>
                                <li>Localização em segundo plano</li>
                                <li>Velocidade aproximada</li>
                                <li>Registro de deslocamento</li>
                            </ul>
                            <p className="mt-2 text-primary font-medium">A coleta de localização ocorre exclusivamente quando o entregador ativa manualmente o modo “Online”.</p>
                            <p>O rastreamento pode ser interrompido pelo próprio usuário a qualquer momento.</p>

                            <p className="font-semibold mt-4 mb-1 text-primary">2.4 Dados Técnicos</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Endereço IP</li>
                                <li>Tipo de navegador</li>
                                <li>Sistema operacional</li>
                                <li>Dados de sessão</li>
                                <li>Cookies</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">3. FINALIDADE DO TRATAMENTO</h3>
                            <p>Os dados são tratados para:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Execução do contrato</li>
                                <li>Gestão operacional de entregas</li>
                                <li>Organização de filas</li>
                                <li>Emissão de relatórios</li>
                                <li>Segurança da plataforma</li>
                                <li>Cumprimento de obrigações legais</li>
                                <li>Prevenção a fraudes</li>
                            </ul>
                            <p className="mt-2">Dados de localização são utilizados exclusivamente para acompanhamento operacional interno da franquia.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">4. BASE LEGAL</h3>
                            <p>O tratamento ocorre com fundamento em:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Execução de contrato</li>
                                <li>Legítimo interesse</li>
                                <li>Cumprimento de obrigação legal</li>
                                <li>Consentimento, quando aplicável</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">5. COMPARTILHAMENTO DE DADOS</h3>
                            <p>Os dados poderão ser compartilhados com:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Provedores de infraestrutura e hospedagem</li>
                                <li>Serviços de pagamento</li>
                                <li>Serviços de comunicação (como APIs de mensagens)</li>
                                <li>Autoridades públicas quando exigido por lei</li>
                            </ul>
                            <p className="mt-2 font-medium">O FilaLab não comercializa dados pessoais.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">6. RESPONSABILIDADE PELO USO DOS DADOS</h3>
                            <p>6.1 A franquia é responsável pelo tratamento dos dados de seus colaboradores.</p>
                            <p>6.2 O FilaLab não é responsável por:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Uso indevido de dados pela franquia</li>
                                <li>Divulgação indevida por administradores</li>
                                <li>Descumprimento de obrigações trabalhistas</li>
                                <li>Tratamento sem base legal realizado pela controladora</li>
                            </ul>
                            <p className="mt-2">6.3 Eventuais disputas trabalhistas envolvendo rastreamento ou monitoramento não geram responsabilidade solidária ou subsidiária para o FilaLab.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">7. SEGURANÇA DA INFORMAÇÃO</h3>
                            <p>O FilaLab adota medidas técnicas e administrativas razoáveis para proteger os dados contra:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Acesso não autorizado</li>
                                <li>Vazamento</li>
                                <li>Alteração indevida</li>
                                <li>Destruição acidental</li>
                            </ul>
                            <p className="mt-2 text-primary font-medium">Entretanto, nenhum sistema é absolutamente imune a falhas ou ataques externos.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">8. RETENÇÃO E EXCLUSÃO</h3>
                            <p>8.1 Os dados serão armazenados enquanto houver relação contratual ativa.</p>
                            <p>8.2 Após o encerramento da conta, os dados poderão ser excluídos definitivamente após período razoável.</p>
                            <p>8.3 O FilaLab não garante armazenamento permanente após cancelamento.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">9. DIREITOS DOS TITULARES</h3>
                            <p>Nos termos da LGPD, o titular poderá solicitar:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Confirmação da existência de tratamento</li>
                                <li>Acesso aos dados</li>
                                <li>Correção de dados incompletos</li>
                                <li>Exclusão quando aplicável</li>
                                <li>Revogação de consentimento</li>
                            </ul>
                            <p className="mt-2">Solicitações deverão ser encaminhadas à franquia controladora ou ao canal oficial disponibilizado na plataforma.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">10. LIMITAÇÃO DE RESPONSABILIDADE</h3>
                            <p>O FilaLab não será responsável por:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Danos indiretos ou lucros cessantes</li>
                                <li>Perdas decorrentes de decisões operacionais</li>
                                <li>Uso inadequado da plataforma</li>
                                <li>Falhas de infraestrutura de terceiros</li>
                                <li>Vazamentos decorrentes de negligência da franquia</li>
                            </ul>
                            <p className="mt-2">Em qualquer hipótese, eventual responsabilidade ficará limitada ao valor pago pelo usuário nos últimos 12 meses.</p>
                        </div>

                        <div>
                            <h3 className="text-foreground font-semibold text-base mb-2">11. ALTERAÇÕES</h3>
                            <p>Esta Política poderá ser atualizada a qualquer momento.</p>
                            <p>A continuidade do uso da plataforma após atualização implica concordância com os novos termos.</p>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
