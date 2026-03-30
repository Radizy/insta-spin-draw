// Lovable Cloud API configuration
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";

export type Unidade = 'ITAQUA' | 'POA' | 'SUZANO';
export type Status = 'disponivel' | 'chamado' | 'entregando';
// Tipo de bag configurável por franquia (valores livres)
export type TipoBag = string;

export interface DiasTrabalho {
  dom: boolean;
  seg: boolean;
  ter: boolean;
  qua: boolean;
  qui: boolean;
  sex: boolean;
  sab: boolean;
}

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  unidade: Unidade;
  status: Status;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  fila_posicao?: string;
  dias_trabalho?: DiasTrabalho;
  usar_turno_padrao?: boolean;
  turno_inicio?: string;
  turno_fim?: string;
  hora_saida?: string;
  tipo_bag?: TipoBag;
  has_bebida?: boolean;
  tts_voice_path?: string | null;
  whatsapp_ativo?: boolean;
  lat?: number;
  lng?: number;
  last_location_time?: string;
  primeiro_checkin?: string | null;
  expo_push_token?: string | null;
}


export interface CreateEntregadorData {
  nome: string;
  telefone: string;
  unidade: Unidade;
  unidade_id?: string | null;
  status: Status;
  ativo: boolean;
  dias_trabalho?: DiasTrabalho;
  usar_turno_padrao?: boolean;
  turno_inicio?: string;
  turno_fim?: string;
}

export interface HistoricoEntrega {
  id: string;
  entregador_id: string;
  unidade: string;
  unidade_id?: string | null;
  hora_saida: string;
  hora_retorno?: string;
  tipo_bag?: TipoBag;
  created_at: string;
}

export interface Maquininha {
  id: string;
  nome: string;
  numero_serie: string | null;
  unidade_id: string | null;
  franquia_id: string | null;
  status: 'livre' | 'em_uso';
  ativo: boolean;
  created_at: string;
}

export interface MaquininhaVinculo {
  id: string;
  motoboy_id: string;
  maquininha_id: string;
  unidade_id: string | null;
  franquia_id: string | null;
  data: string;
  horario_checkin: string | null;
  horario_retirada: string;
  horario_devolucao: string | null;
  status: 'em_uso' | 'devolvida';
  created_at: string;
  entregador?: { nome: string };
  maquininha?: { nome: string };
}

export interface SystemConfig {
  id: string;
  unidade: string;
  webhook_url?: string;
  nome_loja?: string;
  created_at?: string;
}

export interface SystemUpdate {
  id: string;
  titulo: string;
  tipo: string; // 'MELHORIAS', 'NOVO RECURSO'
  status: 'lancado' | 'planejado' | 'em_desenvolvimento' | 'ideia_enviada';
  data_publicacao: string;
  ordem: number;
  created_at: string;
}

// Turno padrão do sistema (16:00 às 02:00)
export const TURNO_PADRAO = {
  inicio: '16:00:00',
  fim: '02:00:00',
};

// Horário do expediente para histórico (17:00 às 02:00)
export const HORARIO_EXPEDIENTE = {
  inicio: 17,
  fim: 2,
};

// Verifica se o horário atual está dentro do turno
export function isWithinShift(turnoInicio: string, turnoFim: string): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [inicioHour, inicioMinute] = turnoInicio.split(':').map(Number);
  const [fimHour, fimMinute] = turnoFim.split(':').map(Number);

  const inicioTime = inicioHour * 60 + inicioMinute;
  const fimTime = fimHour * 60 + fimMinute;

  // Turno que atravessa a meia-noite (ex: 16:00 às 02:00)
  if (fimTime < inicioTime) {
    return currentTime >= inicioTime || currentTime <= fimTime;
  }

  // Turno normal (ex: 08:00 às 17:00)
  return currentTime >= inicioTime && currentTime <= fimTime;
}

// Verifica se hoje é um dia de trabalho
export function isWorkDay(diasTrabalho: DiasTrabalho): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.

  const dayMap: Record<number, keyof DiasTrabalho> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };

  return diasTrabalho[dayMap[dayOfWeek]] ?? true;
}

export function hasRecentCheckin(entregador: Entregador): boolean {
  if (!entregador.fila_posicao) return false;
  const now = new Date().getTime();
  const filaTime = new Date(entregador.fila_posicao).getTime();
  const diffHours = (now - filaTime) / (1000 * 60 * 60);
  return diffHours <= 24;
}

// Verifica se o entregador deve aparecer na fila
export function shouldShowInQueue(entregador: Entregador): boolean {
  if (!entregador.ativo) return false;

  // Primeiro check: se teve check-in recente, ele deve aparecer (override de horário/turno)
  if (hasRecentCheckin(entregador)) return true;

  // Verificar dias de trabalho
  const diasTrabalho = entregador.dias_trabalho || {
    dom: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true
  };

  if (!isWorkDay(diasTrabalho)) return false;

  // Verificar turno
  const turnoInicio = entregador.usar_turno_padrao !== false
    ? TURNO_PADRAO.inicio
    : (entregador.turno_inicio || TURNO_PADRAO.inicio);
  const turnoFim = entregador.usar_turno_padrao !== false
    ? TURNO_PADRAO.fim
    : (entregador.turno_fim || TURNO_PADRAO.fim);

  if (!isWithinShift(turnoInicio, turnoFim)) return false;

  return true;
}

// Função removida - failsafe de 1 hora não mais necessário

// Fetch all entregadores with optional filters
export async function fetchEntregadores(filters?: {
  unidade?: Unidade;
  unidade_id?: string | null;
  status?: Status;
  ativo?: boolean;
}): Promise<Entregador[]> {
  let query = supabase
    .from('entregadores')
    .select('id, nome, telefone, status, unidade, ativo, created_at, updated_at, fila_posicao, primeiro_checkin, dias_trabalho, usar_turno_padrao, turno_inicio, turno_fim, hora_saida, tipo_bag, tts_voice_path, whatsapp_ativo, lat, lng, last_location_time, expo_push_token')
    .order('fila_posicao', { ascending: true });

  if (filters?.unidade_id) {
    query = query.eq('unidade_id', filters.unidade_id);
  } else if (filters?.unidade) {
    query = query.eq('unidade', filters.unidade);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.ativo !== undefined) {
    query = query.eq('ativo', filters.ativo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Failed to fetch entregadores: ' + error.message);
  }

  return (data || []) as unknown as Entregador[];
}

// Create new entregador
export async function createEntregador(data: CreateEntregadorData): Promise<Entregador> {
  const insertData: Record<string, unknown> = {
    nome: data.nome,
    telefone: data.telefone,
    unidade: data.unidade,
    unidade_id: data.unidade_id,
    status: data.status,
    ativo: data.ativo,
    usar_turno_padrao: data.usar_turno_padrao,
    turno_inicio: data.turno_inicio,
    turno_fim: data.turno_fim,
  };

  if (data.dias_trabalho) {
    insertData.dias_trabalho = data.dias_trabalho;
  }

  const { data: result, error } = await supabase
    .from('entregadores')
    .insert(insertData as { nome: string; telefone: string; unidade: string })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create entregador: ' + error.message);
  }

  return result as unknown as Entregador;
}

// Update entregador
export async function updateEntregador(
  id: string,
  data: Partial<Entregador>
): Promise<Entregador> {
  const updateData: Record<string, unknown> = {};

  // Copy all properties except dias_trabalho
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'dias_trabalho') {
      updateData[key] = value;
    }
  });

  // Handle dias_trabalho separately to avoid type issues
  if (data.dias_trabalho !== undefined) {
    updateData.dias_trabalho = data.dias_trabalho;
  }

  const { data: result, error } = await supabase
    .from('entregadores')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update entregador: ' + error.message);
  }

  return result as unknown as Entregador;
}

// Atualizar token de Push Notification do Motoboy
export async function atualizarTokenPush(telefone: string, token: string): Promise<void> {
  // Higieniza o telefone (mantém apenas números)
  const cleanPhone = telefone.replace(/\D/g, '');
  if (!cleanPhone) return;

  try {
    // 1. Encontrar o motoboy pelo telefone limpo
    const { data: entregadores, error: fetchError } = await supabase
      .from('entregadores')
      .select('id, telefone')
      .eq('ativo', true);

    if (fetchError) throw fetchError;

    // Fazer a match exato com o final do número (ignorando DDI/DDD diferentes se necessário)
    const entregador = entregadores?.find(e => 
      e.telefone.replace(/\D/g, '') === cleanPhone || 
      e.telefone.replace(/\D/g, '').endsWith(cleanPhone)
    );

    if (entregador) {
      // 2. Atualizar o token na coluna correspondente
      const { error: updateError } = await supabase
        .from('entregadores')
        .update({ expo_push_token: token })
        .eq('id', entregador.id);

      if (updateError) throw updateError;
      console.log(`[API] Token Push salvo com sucesso para o ID: ${entregador.id}`);
    } else {
      console.warn('[API] Nenhum motoboy ativo encontrado com este telefone para salvar o token.');
    }
  } catch (err) {
    console.error('[API] Erro ao salvar Token Push:', err);
  }
}

// Disparar Notificação Push via API do Expo
export async function enviarNotificacaoChamado(expoPushToken: string | null): Promise<void> {
  if (!expoPushToken) {
    console.warn('[API] Tentativa de enviar notificação falhou: Motoboy não tem expo_push_token.');
    return;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'FilaLab',
    body: 'É a sua vez! Dirija-se à expedição.',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();
    console.log('[API] Notificação Push enviada:', data);
  } catch (error) {
    console.error('[API] Erro ao disparar notificação Push para o Expo:', error);
  }
}

// Bulk update entregadores (usado para reordenar a fila)
export async function bulkUpdateEntregadores(updates: { id: string, data: Partial<Entregador> }[]): Promise<void> {
  const promises = updates.map(update =>
    supabase.from('entregadores').update(update.data).eq('id', update.id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter((r: any) => r.error).map((r: any) => r.error);
  
  if (errors.length > 0) {
    console.error('Erros no bulkUpdateEntregadores:', errors);
    throw new Error('Falha ao atualizar entregadores em massa');
  }
}

// Delete entregador
export async function deleteEntregador(id: string): Promise<void> {
  const { error } = await supabase
    .from('entregadores')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete entregador: ' + error.message);
  }
}

// Send WhatsApp message via Edge Function
export async function sendWhatsAppMessage(
  telefone: string,
  message: string,
  context?: { franquiaId?: string | null; unidadeId?: string | null }
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: {
      telefone,
      message,
      unidade_id: context?.unidadeId ?? null,
      franquia_id: context?.franquiaId ?? null,
    },
  });

  if (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw new Error('Failed to send WhatsApp message');
  }
}

// Disparar webhook de despacho (server-side)
export async function sendDispatchWebhook(params: {
  unidade: Unidade;
  unidadeId?: string | null;
  entregador: Entregador;
  quantidadeEntregas: number;
  bag: TipoBag;
  hasBebida?: boolean;
}): Promise<void> {
    // Execução assíncrona para não travar a UI
    const runWebhook = async () => {
      try {
        if (!params.unidadeId) return;

        // Tenta buscar do cache/config local se possível (futura melhoria), por ora buscamos uma vez
        const { data: config } = await supabase
          .from('unidades')
          .select('config_sheets_url')
          .eq('id', params.unidadeId)
          .maybeSingle();

        const webhookUrl = config?.config_sheets_url;
        if (!webhookUrl) return;

        const payload = {
          tipo: "saida_entrega",
          unidade: params.unidade,
          nome: params.entregador.nome,
          horario_saida: new Date().toISOString(),
          quantidade_entregas: String(params.quantidadeEntregas),
          motoboy: params.entregador.nome,
          bag: params.bag,
          possui_bebida: params.hasBebida ? 'SIM' : 'NAO',
        };

        await supabase.functions.invoke('send-webhook', {
          body: { webhookUrl, payload },
        });
      } catch (err) {
        console.error('[API] Erro silenciado ao enviar webhook de despacho:', err);
      }
    };

    runWebhook(); // Não aguardamos o retorno desta função para liberar a UI
    return Promise.resolve();
}

// Histórico de entregas
export async function fetchHistoricoEntregas(filters: {
  unidade: Unidade;
  dataInicio: string;
  dataFim: string;
}): Promise<HistoricoEntrega[]> {
  const { data, error } = await supabase
    .from('historico_entregas')
    .select('*')
    .eq('unidade', filters.unidade)
    .gte('hora_saida', filters.dataInicio)
    .lte('hora_saida', filters.dataFim)
    .order('hora_saida', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch historico: ' + error.message);
  }

  return (data || []) as HistoricoEntrega[];
}

export async function createHistoricoEntrega(data: {
  entregador_id: string;
  unidade: string;
  unidade_id?: string | null;
  tipo_bag?: TipoBag;
}): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .insert({
      entregador_id: data.entregador_id,
      unidade: data.unidade,
      unidade_id: data.unidade_id,
      hora_saida: new Date().toISOString(),
      tipo_bag: data.tipo_bag || 'normal',
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create historico: ' + error.message);
  }

  return result as HistoricoEntrega;
}

export async function updateHistoricoEntrega(
  id: string,
  data: Partial<HistoricoEntrega>
): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update historico: ' + error.message);
  }

  return result as HistoricoEntrega;
}

export async function registrarRetornoEntrega(
  entregador_id: string,
  unidade: string
): Promise<void> {
  // Otimizado: Update direto com filtro, economizando um SELECT
  const { error } = await supabase
    .from('historico_entregas')
    .update({ hora_retorno: new Date().toISOString() })
    .eq('entregador_id', entregador_id)
    .eq('unidade', unidade)
    .is('hora_retorno', null);

  if (error) {
    console.error('[API] Erro ao registrar retorno:', error.message);
  }
}

export async function atualizarSaidaEntrega(
  entregador_id: string,
  unidade: string
): Promise<void> {
  // Otimizado: Update direto com filtro, economizando um SELECT
  const { error } = await supabase
    .from('historico_entregas')
    .update({ hora_saida: new Date().toISOString() })
    .eq('entregador_id', entregador_id)
    .eq('unidade', unidade)
    .is('hora_retorno', null);

  if (error) {
    console.error('[API] Erro ao atualizar saída:', error.message);
  }
}

export async function deleteOldHistorico(unidade: Unidade): Promise<void> {
  // Limpa histórico do dia anterior às 12:00
  const now = new Date();
  if (now.getHours() >= 12) {
    // Calcula o início do expediente de ontem (17:00)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(17, 0, 0, 0);

    const { error } = await supabase
      .from('historico_entregas')
      .delete()
      .eq('unidade', unidade)
      .lt('hora_saida', yesterday.toISOString());

    if (error) {
      console.error('Failed to delete old historico:', error);
    }
  }
}

// Subscribe to realtime changes
export function subscribeToEntregadores(
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('entregadores-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'entregadores'
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getMotoboyPosition(telefone: string): Promise<{
  id: string | null;
  position: number | null;
  nome: string | null;
  status: Status | null;
}> {
  // Higieniza o telefone (mantém apenas números)
  const cleanPhone = telefone.replace(/\D/g, '');
  if (!cleanPhone) return { id: null, position: null, nome: null, status: null };

  // Busca todos os entregadores ativos (ou que estiveram ativos recentemente)
  const entregadores = await fetchEntregadores({ ativo: true });

  // Busca o entregador específico. Se houver mais de um recorde para o mesmo telefone, 
  // priorizamos aquele que está em um status mais "próximo" da fila ou que foi atualizado recentemente.
  const meusRecordes = entregadores.filter(e => e.telefone.replace(/\D/g, '') === cleanPhone);
  
  if (meusRecordes.length === 0) {
    return { id: null, position: null, nome: null, status: null };
  }

  // Ordenação de prioridade de status: disponivel > chamado > entregando
  const statusPriority: Record<string, number> = {
    'disponivel': 1,
    'chamado': 2,
    'entregando': 3
  };

  const entregador = meusRecordes.sort((a, b) => {
    const prioA = statusPriority[a.status] || 99;
    const prioB = statusPriority[b.status] || 99;
    if (prioA !== prioB) return prioA - prioB;
    // Se empate no status, pega o mais recente
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
  })[0];

  // Regra unificada de quem está na fila (mesma da Roteirista.tsx)
  const activeQueue = entregadores
    .filter(e => e.unidade === entregador.unidade)
    .filter(e => e.status === 'disponivel' && shouldShowInQueue(e));

  // Se o motoboy não está "disponível", ele não tem posição numérica, mostramos o status atual (Chamado ou Entregando)
  if (entregador.status !== 'disponivel') {
    return { id: entregador.id, position: null, nome: entregador.nome, status: entregador.status };
  }

  const position = activeQueue.findIndex(e => e.id === entregador.id) + 1;

  return {
    id: entregador.id,
    position: position > 0 ? position : null,
    nome: entregador.nome,
    status: entregador.status,
  };
}

// Fetch system config for unit
export async function fetchSystemConfig(unidade: Unidade): Promise<SystemConfig | null> {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .eq('unidade', unidade)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch system config:', error);
    return null;
  }

  return data as unknown as SystemConfig;
}

// Update system config
export async function updateSystemConfig(
  unidade: Unidade,
  data: Partial<SystemConfig>
): Promise<void> {
  const { data: existing } = await supabase
    .from('system_config')
    .select('id')
    .eq('unidade', unidade)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('system_config')
      .update(data as any)
      .eq('unidade', unidade);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('system_config')
      .insert({ unidade, ...data } as any);
    if (error) throw error;
  }
}

// Fetch global config
export async function fetchGlobalConfig(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('global_config')
    .select('config_value')
    .eq('config_key', key)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch global config:', error);
    return null;
  }

  return data?.config_value || null;
}

// Update global config
export async function updateGlobalConfig(key: string, value: string): Promise<void> {
  const { data: existing } = await supabase
    .from('global_config')
    .select('id')
    .eq('config_key', key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('global_config')
      .update({ config_value: value })
      .eq('config_key', key);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('global_config')
      .insert({ config_key: key, config_value: value });
    if (error) throw error;
  }
}

// ========== MÓDULOS OPCIONAIS (FEATURE FLAGS) ==========

export interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  ativo: boolean;
  created_at: string;
}

export interface UnidadeModulo {
  id: string;
  unidade_id: string;
  modulo_codigo: string;
  ativo: boolean;
  data_ativacao: string;
  data_expiracao: string | null;
  created_at: string;
}

export async function fetchModulos(): Promise<Modulo[]> {
  const { data, error } = await supabase
    .from('modulos')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data || [];
}

export async function fetchUnidadeModulos(unidadeId: string): Promise<UnidadeModulo[]> {
  const { data, error } = await supabase
    .from('unidade_modulos')
    .select('*')
    .eq('unidade_id', unidadeId);
  if (error) throw error;
  return data || [];
}

export async function isModuloAtivo(unidadeId: string, moduloCodigo: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('unidade_modulos')
    .select('ativo, data_expiracao')
    .eq('unidade_id', unidadeId)
    .eq('modulo_codigo', moduloCodigo)
    .eq('ativo', true)
    .maybeSingle();

  if (error || !data) return false;

  // Verificar se expirou
  if (data.data_expiracao) {
    const expiracao = new Date(data.data_expiracao);
    if (expiracao < new Date()) {
      return false;
    }
  }

  return true;
}

export async function ativarModulo(unidadeId: string, moduloCodigo: string, diasTrial?: number) {
  const dataExpiracao = diasTrial ? new Date(Date.now() + diasTrial * 24 * 60 * 60 * 1000).toISOString() : null;

  const { error } = await supabase
    .from('unidade_modulos')
    .upsert({
      unidade_id: unidadeId,
      modulo_codigo: moduloCodigo,
      ativo: true,
      data_expiracao: dataExpiracao,
    });

  if (error) throw error;
}

export async function desativarModulo(unidadeId: string, moduloCodigo: string) {
  const { error } = await supabase
    .from('unidade_modulos')
    .update({ ativo: false })
    .eq('unidade_id', unidadeId)
    .eq('modulo_codigo', moduloCodigo);

  if (error) throw error;
}

// ========== SENHAS DE PAGAMENTO ==========

export interface SenhaPagamento {
  id: string;
  unidade_id: string;
  franquia_id: string;
  numero_senha: string;
  entregador_id: string | null;
  entregador_nome: string | null;
  status: 'aguardando' | 'chamado' | 'atendido' | 'expirado';
  chamado_em: string | null;
  atendido_em: string | null;
  expira_em: string;
  created_at: string;
  updated_at: string;
}

export async function gerarSenhaPagamento(
  unidadeId: string,
  franquiaId: string,
  entregadorId?: string,
  entregadorNome?: string,
): Promise<SenhaPagamento> {
  // Buscar última senha do dia para gerar número sequencial
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data: senhasHoje, error: errorBusca } = await supabase
    .from('senhas_pagamento')
    .select('numero_senha')
    .eq('unidade_id', unidadeId)
    .gte('created_at', hoje.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (errorBusca) throw errorBusca;

  let proximoNumero = 1;
  if (senhasHoje && senhasHoje.length > 0) {
    const ultimaSenha = senhasHoje[0].numero_senha;
    const numero = parseInt(ultimaSenha.replace('P', ''));
    proximoNumero = numero + 1;
  }

  const numeroSenha = `P${proximoNumero.toString().padStart(3, '0')}`;

  const { data, error } = await supabase
    .from('senhas_pagamento')
    .insert({
      unidade_id: unidadeId,
      franquia_id: franquiaId,
      numero_senha: numeroSenha,
      entregador_id: entregadorId || null,
      entregador_nome: entregadorNome || null,
      status: 'aguardando',
    })
    .select()
    .single();

  if (error) throw error;

  const senha = data as SenhaPagamento;

  // Após gerar a senha, enviar mensagem inicial para o motoboy ficar atento ao celular
  try {
    // Buscar unidade para obter nome_loja
    const { data: unidade, error: unidadeError } = await supabase
      .from('unidades')
      .select('id, nome_loja')
      .eq('id', unidadeId)
      .maybeSingle();

    if (unidadeError) {
      console.error('Erro ao buscar unidade ao gerar senha de pagamento:', unidadeError);
    }

    // Buscar telefone e nome do entregador, se existir vínculo
    let telefone: string | null = null;
    let nomeMotoboy: string | null = senha.entregador_nome;

    if (senha.entregador_id) {
      const { data: entregador, error: entregadorError } = await supabase
        .from('entregadores')
        .select('telefone, nome')
        .eq('id', senha.entregador_id)
        .maybeSingle();

      if (entregadorError) {
        console.error('Erro ao buscar entregador ao gerar senha de pagamento:', entregadorError);
      } else if (entregador) {
        telefone = entregador.telefone as string;
        nomeMotoboy = (entregador.nome as string) || nomeMotoboy;
      }
    }

    // Buscar template de mensagem "aguardando pagamento" na configuração da franquia
    let mensagem = '';

    if (franquiaId) {
      const { data: franquia, error: franquiaError } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', franquiaId)
        .maybeSingle();

      if (franquiaError) {
        console.error('Erro ao buscar config_pagamento da franquia ao gerar senha:', franquiaError);
      } else if (franquia?.config_pagamento) {
        const tvPrompts = (franquia.config_pagamento as any).tv_prompts || {};
        const template: string =
          tvPrompts.pagamento_aguardando ||
          'Olá {nome}, sua senha é {senha}. Fique atento ao seu celular, em breve chamaremos para pagamento.';

        mensagem = template
          .replace('{nome}', nomeMotoboy || '')
          .replace('{senha}', senha.numero_senha)
          .replace('{unidade}', (unidade?.nome_loja as string) || '');
      }
    }

    if (telefone && mensagem) {
      await sendWhatsAppMessage(telefone, mensagem, {
        franquiaId,
        unidadeId: senha.unidade_id,
      });
    }
  } catch (whatsError) {
    console.error('Erro ao enviar WhatsApp ao gerar senha de pagamento:', whatsError);
  }

  return senha;
}

export async function fetchSenhasPagamento(unidadeId: string): Promise<SenhaPagamento[]> {
  const { data, error } = await supabase
    .from('senhas_pagamento')
    .select('*')
    .eq('unidade_id', unidadeId)
    .gt('expira_em', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as SenhaPagamento[];
}

export async function chamarSenhaPagamento(senhaId: string) {
  // Buscar detalhes da senha
  const { data: senha, error: senhaError } = await supabase
    .from('senhas_pagamento')
    .select('id, numero_senha, unidade_id, franquia_id, entregador_id, entregador_nome')
    .eq('id', senhaId)
    .maybeSingle();

  if (senhaError || !senha) {
    throw senhaError || new Error('Senha não encontrada');
  }

  // Buscar unidade para obter nome_loja e franquia
  const { data: unidade, error: unidadeError } = await supabase
    .from('unidades')
    .select('id, nome_loja, franquia_id')
    .eq('id', senha.unidade_id)
    .maybeSingle();

  if (unidadeError) {
    console.error('Erro ao buscar unidade da senha de pagamento:', unidadeError);
  }

  const franquiaId = (senha as any).franquia_id || unidade?.franquia_id || null;

  // Buscar telefone e nome do entregador, se existir vínculo
  let telefone: string | null = null;
  let nomeMotoboy: string | null = senha.entregador_nome;

  if (senha.entregador_id) {
    const { data: entregador, error: entregadorError } = await supabase
      .from('entregadores')
      .select('telefone, nome')
      .eq('id', senha.entregador_id)
      .maybeSingle();

    if (entregadorError) {
      console.error('Erro ao buscar entregador da senha de pagamento:', entregadorError);
    } else if (entregador) {
      telefone = entregador.telefone as string;
      nomeMotoboy = (entregador.nome as string) || nomeMotoboy;
    }
  }

  // Buscar template de mensagem de pagamento na configuração da franquia
  let mensagem = '';

  if (franquiaId) {
    const { data: franquia, error: franquiaError } = await supabase
      .from('franquias')
      .select('config_pagamento')
      .eq('id', franquiaId)
      .maybeSingle();

    if (franquiaError) {
      console.error('Erro ao buscar config_pagamento da franquia:', franquiaError);
    } else if (franquia?.config_pagamento) {
      const tvPrompts = (franquia.config_pagamento as any).tv_prompts || {};
      const template: string =
        tvPrompts.pagamento_chamada ||
        'Olá {nome}, é a sua vez de receber. Vá até o escritório (caixa) da {unidade} para receber.';

      mensagem = template
        .replace('{nome}', nomeMotoboy || '')
        .replace('{senha}', senha.numero_senha)
        .replace('{unidade}', (unidade?.nome_loja as string) || '');
    }
  }

  // Enviar WhatsApp se tivermos telefone e mensagem
  if (telefone && mensagem) {
    await sendWhatsAppMessage(telefone, mensagem, {
      franquiaId: franquiaId,
      unidadeId: senha.unidade_id,
    });
  }

  // Atualizar status da senha para chamado
  const { error } = await supabase
    .from('senhas_pagamento')
    .update({
      status: 'chamado',
      chamado_em: new Date().toISOString(),
    })
    .eq('id', senhaId);

  if (error) throw error;
}

export async function atenderSenhaPagamento(senhaId: string) {
  const { error } = await supabase
    .from('senhas_pagamento')
    .update({
      status: 'atendido',
      atendido_em: new Date().toISOString(),
    })
    .eq('id', senhaId);

  if (error) throw error;
}

export async function resetDaily(unidade?: string, unidadeId?: string): Promise<void> {
  let query = supabase.from('entregadores').update({
    ativo: false,
    status: 'disponivel',
    hora_saida: null
  });

  if (unidadeId) {
    query = query.eq('unidade_id', unidadeId);
  } else if (unidade) {
    query = query.eq('unidade', unidade);
  } else {
    throw new Error('Parâmetro unidade ou unidadeId é obrigatório para o reset');
  }

  const { error } = await query;

  if (error) {
    console.error('Erro no resetDaily:', error);
    throw new Error('Falha ao executar reset diário');
  }
}

// ==========================================
// SYSTEM UPDATES (CHANGELOG)
// ==========================================

export async function fetchSystemUpdates(): Promise<SystemUpdate[]> {
  const { data, error } = await supabase
    .from('system_updates')
    .select('*')
    .order('ordem', { ascending: true })
    .order('data_publicacao', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch system updates: ' + error.message);
  }

  const manualUpdates: SystemUpdate[] = [
    {
      id: 'm1',
      titulo: 'Módulo Controle de Maquininhas',
      tipo: 'NOVO RECURSO',
      status: 'lancado',
      data_publicacao: '2026-02-28',
      ordem: -10,
      created_at: new Date().toISOString()
    },
    {
      id: 'm2',
      titulo: 'Busca Inteligente no Controle de Maquininhas',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-02-28',
      ordem: -9,
      created_at: new Date().toISOString()
    },
    {
      id: 'm3',
      titulo: 'Novo Fluxo de Atribuição (Dual-Mode)',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-02-28',
      ordem: -8,
      created_at: new Date().toISOString()
    },
    {
      id: 'm4',
      titulo: 'Exibição de Check-in no Card do Motoboy',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-02-28',
      ordem: -7,
      created_at: new Date().toISOString()
    },
    {
      id: 'm5',
      titulo: 'Correção na Chamada de TV (Sequência de Áudio)',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-02-27',
      ordem: -6,
      created_at: new Date().toISOString()
    },
    {
      id: 'm6',
      titulo: 'Novo Menu de Configurações (Premium UI)',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-02-27',
      ordem: -5,
      created_at: new Date().toISOString()
    }
  ];

  return [...manualUpdates, ...(data || [])] as unknown as SystemUpdate[];
}

export async function createSystemUpdate(data: Partial<SystemUpdate>): Promise<SystemUpdate> {
  const { data: result, error } = await supabase
    .from('system_updates')
    .insert([data as any])
    .select()
    .single();

  if (error) throw error;
  return result as unknown as SystemUpdate;
}

export async function updateSystemUpdate(id: string, data: Partial<SystemUpdate>): Promise<SystemUpdate> {
  const { data: result, error } = await supabase
    .from('system_updates')
    .update(data as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as unknown as SystemUpdate;
}

export async function deleteSystemUpdate(id: string): Promise<void> {
  const { error } = await supabase
    .from('system_updates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Bulk update para ordem (Drag and Drop)
export async function reorderSystemUpdates(updates: { id: string, ordem: number }[]): Promise<void> {
  const promises = updates.map(update =>
    supabase.from('system_updates').update({ ordem: update.ordem } as any).eq('id', update.id)
  );

  await Promise.all(promises);
}

export async function fetchMaquininhas(unidadeId: string, onlyActive = true): Promise<Maquininha[]> {
  let query = supabase
    .from('maquininhas')
    .select('*')
    .eq('unidade_id', unidadeId);

  if (onlyActive) {
    query = query.eq('status', 'livre').eq('ativo', true);
  }

  const { data, error } = await query.order('nome');

  if (error) throw error;
  return data || [];
}

export async function createMaquininha(data: Partial<Maquininha>): Promise<Maquininha> {
  const { data: result, error } = await supabase
    .from('maquininhas')
    .insert([data as any])
    .select()
    .single();

  if (error) throw error;
  return result as unknown as Maquininha;
}

export async function updateMaquininha(id: string, data: Partial<Maquininha>): Promise<Maquininha> {
  const { data: result, error } = await supabase
    .from('maquininhas')
    .update(data as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as unknown as Maquininha;
}

export async function deleteMaquininha(id: string): Promise<void> {
  const { error } = await supabase
    .from('maquininhas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchActiveVinculos(unidadeId: string): Promise<MaquininhaVinculo[]> {
  const { data, error } = await supabase
    .from('maquininha_vinculos')
    .select(`
      *,
      entregador:entregadores(nome),
      maquininha:maquininhas(nome)
    `)
    .eq('unidade_id', unidadeId)
    .eq('status', 'em_uso')
    .order('horario_retirada', { ascending: false });

  if (error) throw error;
  return (data || []) as any;
}

export async function atrelarMaquininha(params: {
  motoboy_id: string;
  maquininha_id: string;
  unidade_id: string;
  franquia_id: string;
  horario_checkin: string | null;
  unidade_nome: string;
  motoboy_nome: string;
  maquininha_nome: string;
}): Promise<void> {
  const now = new Date().toISOString();

  // 1. Criar vínculo
  const { data: vinculoData, error: vinculoError } = await supabase
    .from('maquininha_vinculos')
    .insert({
      motoboy_id: params.motoboy_id,
      maquininha_id: params.maquininha_id,
      unidade_id: params.unidade_id,
      franquia_id: params.franquia_id,
      horario_checkin: params.horario_checkin,
      horario_retirada: now,
      status: 'em_uso'
    })
    .select('id')
    .single();

  if (vinculoError) throw vinculoError;
  const vinculo_id = vinculoData.id;

  // 2. Atualizar status da maquininha
  const { error: machineError } = await supabase
    .from('maquininhas')
    .update({ status: 'em_uso' })
    .eq('id', params.maquininha_id);

  if (machineError) throw machineError;

  // 3. Webhook Google Sheets
  try {
    const { data: config } = await supabase
      .from('unidades')
      .select('config_sheets_url')
      .eq('id', params.unidade_id)
      .single();

    if (config?.config_sheets_url) {
      await fetch(config.config_sheets_url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "retirada_maquininha",
          id_vinculo: vinculo_id,
          motoboy: params.motoboy_nome,
          maquininha: params.maquininha_nome,
          checkin: params.horario_checkin,
          retirada: now,
          unidade: params.unidade_nome
        })
      });
    }
  } catch (e) {
    console.error('Erro ao enviar webhook retirada:', e);
  }
}

export async function devolverMaquininha(params: {
  vinculo_id: string;
  maquininha_id: string;
  unidade_id: string;
  unidade_nome: string;
  motoboy_nome: string;
  maquininha_nome: string;
}): Promise<void> {
  const now = new Date().toISOString();

  // 1. Atualizar vínculo
  const { error: vinculoError } = await supabase
    .from('maquininha_vinculos')
    .update({
      horario_devolucao: now,
      status: 'devolvida'
    })
    .eq('id', params.vinculo_id);

  if (vinculoError) throw vinculoError;

  // 2. Atualizar status da maquininha
  const { error: machineError } = await supabase
    .from('maquininhas')
    .update({ status: 'livre' })
    .eq('id', params.maquininha_id);

  if (machineError) throw machineError;

  // 3. Webhook Google Sheets
  try {
    const { data: config } = await supabase
      .from('unidades')
      .select('config_sheets_url')
      .eq('id', params.unidade_id)
      .single();

    if (config?.config_sheets_url) {
      await fetch(config.config_sheets_url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "devolucao_maquininha",
          id_vinculo: params.vinculo_id,
          motoboy: params.motoboy_nome,
          maquininha: params.maquininha_nome,
          devolucao: now,
          unidade: params.unidade_nome
        })
      });
    }
  } catch (e) {
    console.error('Erro ao enviar webhook devolução:', e);
  }
}
