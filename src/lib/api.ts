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
  quantidade_entregas?: number;
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
  descricao?: string;
  created_at: string;
}

// Turno padrão do sistema (16:00 às 02:00)
export const TURNO_PADRAO = {
  inicio: '16:00:00',
  fim: '02:00:00',
};

export const HORARIO_EXPEDIENTE = {
  inicio: 17, // 17:00
  fim: 3,    // 03:00 (dia seguinte)
};

/**
 * Calcula o período de início e fim do expediente atual.
 * Se for antes das 03:00, considera que ainda estamos no expediente do dia anterior.
 */
export function getExpedientePeriod() {
  const now = new Date();
  const currentHour = now.getHours();
  let dataInicio: Date;
  let dataFim: Date;

  if (currentHour < HORARIO_EXPEDIENTE.fim) {
    // Madrugada: o expediente começou ontem às 17h e termina hoje às 3h
    dataInicio = new Date(now);
    dataInicio.setDate(dataInicio.getDate() - 1);
    dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
    
    dataFim = new Date(now);
    dataFim.setHours(HORARIO_EXPEDIENTE.fim, 0, 0, 0);
  } else if (currentHour >= HORARIO_EXPEDIENTE.inicio) {
    // Noite: o expediente começou hoje às 17h e termina amanhã às 3h
    dataInicio = new Date(now);
    dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
    
    dataFim = new Date(now);
    dataFim.setDate(dataFim.getDate() + 1);
    dataFim.setHours(HORARIO_EXPEDIENTE.fim, 0, 0, 0);
  } else {
    // Entre 03:00 e 17:00: Intervalo entre turnos. 
    // Mostramos o resultado do turno que ACABOU (ontem 17h às hoje 3h)
    dataInicio = new Date(now);
    dataInicio.setDate(dataInicio.getDate() - 1);
    dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
    
    dataFim = new Date(now);
    dataFim.setHours(HORARIO_EXPEDIENTE.fim, 0, 0, 0);
  }

  return { dataInicio, dataFim };
}

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

// Disparar webhook de check-in automático (server-side)
export async function sendCheckinWebhook(params: {
  unidade: string;
  unidadeId: string;
  motoboyId: string;
  motoboyNome: string;
  checkinTime: string;
}): Promise<void> {
  const runWebhook = async () => {
    try {
      const { data: config } = await supabase
        .from('unidades')
        .select('config_sheets_url, nome_loja')
        .eq('id', params.unidadeId)
        .maybeSingle();

      const webhookUrl = config?.config_sheets_url;
      if (!webhookUrl) return;

      const payload = {
        tipo: "checkin_motoboy",
        unidade: config?.nome_loja || params.unidade,
        motoboy: params.motoboyNome,
        // motoboy_id + data são usados pelo Apps Script como chave de lookup
        // para encontrar e atualizar a mesma linha ao atrelar/devolver maquininha
        motoboy_id: params.motoboyId,
        data: new Date().toISOString().split('T')[0],
        checkin: params.checkinTime,
      };

      await supabase.functions.invoke('send-webhook', {
        body: { webhookUrl, payload },
      });
    } catch (err) {
      console.error('[API] Erro silenciado ao enviar webhook de check-in:', err);
    }
  };

  runWebhook(); // Não aguardamos o retorno desta função para liberar a UI
  return Promise.resolve();
}

// Disparar webhook de despacho (server-side)
export async function sendDispatchWebhook(params: {
  unidade: Unidade;
  unidadeId?: string | null;
  entregador: Entregador;
  quantidadeEntregas: number;
  bag: TipoBag;
  hasBebida?: boolean;
  idSaida?: string | null;
}): Promise<void> {
    // Execução assíncrona para não travar a UI
    const runWebhook = async () => {
      try {
        if (!params.unidadeId) return;

        // Tenta buscar do cache/config local se possível (futura melhoria), por ora buscamos uma vez
        const { data: config } = await supabase
          .from('unidades')
          .select('config_sheets_url, nome_loja')
          .eq('id', params.unidadeId)
          .maybeSingle();

        const webhookUrl = config?.config_sheets_url;
        if (!webhookUrl) return;

        const payload = {
          tipo: "saida_entrega",
          unidade: config?.nome_loja || params.unidade,
          nome: params.entregador.nome,
          horario_saida: new Date().toISOString(),
          quantidade_entregas: String(params.quantidadeEntregas),
          motoboy: params.entregador.nome,
          bag: params.bag,
          possui_bebida: params.hasBebida ? 'SIM' : 'NAO',
          id_saida: params.idSaida || null,
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
  unidade?: Unidade;
  unidade_id?: string | null;
  dataInicio: string;
  dataFim: string;
}): Promise<HistoricoEntrega[]> {
  let query = supabase
    .from('historico_entregas')
    .select('*')
    .gte('hora_saida', filters.dataInicio)
    .lte('hora_saida', filters.dataFim);

  if (filters.unidade_id) {
    query = query.eq('unidade_id', filters.unidade_id);
  } else if (filters.unidade) {
    query = query.eq('unidade', filters.unidade);
  }

  const { data, error } = await query.order('hora_saida', { ascending: false });

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
  quantidade_entregas?: number;
}): Promise<HistoricoEntrega> {
  const { data: result, error } = await supabase
    .from('historico_entregas')
    .insert({
      entregador_id: data.entregador_id,
      unidade: data.unidade,
      unidade_id: data.unidade_id,
      hora_saida: new Date().toISOString(),
      tipo_bag: data.tipo_bag || 'normal',
      quantidade_entregas: data.quantidade_entregas || 1,
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
  unidade: string,
  unidade_id?: string | null
): Promise<void> {
  // Segurança: Só atualiza registros das últimas 24 horas para evitar corrupção de histórico antigo
  const limitDate = new Date();
  limitDate.setHours(limitDate.getHours() - 24);

  const now = new Date().toISOString();

  // IMPORTANTE: usar 'let' e reatribuir o query para que os filtros encadeiem corretamente
  let query = supabase
    .from('historico_entregas')
    .update({ hora_retorno: now })
    .eq('entregador_id', entregador_id)
    .is('hora_retorno', null)
    .gte('created_at', limitDate.toISOString());

  // Filtra por unidade_id se disponível, caso contrário usa o nome (legado)
  if (unidade_id) {
    query = query.eq('unidade_id', unidade_id);
  } else {
    query = query.eq('unidade', unidade);
  }

  const { data, error } = await query
    .select('id, hora_saida, unidade_id, entregador:entregadores(nome)')
    .maybeSingle();

  if (error) {
    console.error('[API] Erro ao registrar retorno:', error.message);
    return;
  }

  if (data) {
    // Disparar o webhook de retorno de forma assíncrona para não bloquear a UI
    const runWebhook = async () => {
      try {
        const uId = data.unidade_id || unidade_id;
        if (!uId) return;

        const { data: config } = await supabase
          .from('unidades')
          .select('config_sheets_url, nome_loja')
          .eq('id', uId)
          .maybeSingle();

        const webhookUrl = config?.config_sheets_url;
        if (!webhookUrl) return;

        const motoboyNome = (data.entregador as any)?.nome || '';
        const payload = {
          tipo: "retorno_entrega",
          unidade: config?.nome_loja || unidade,
          motoboy: motoboyNome,
          horario_retorno: now,
          id_saida: data.id
        };

        await supabase.functions.invoke('send-webhook', {
          body: { webhookUrl, payload }
        });
      } catch (err) {
        console.error('[API] Erro silenciado ao enviar webhook de retorno:', err);
      }
    };
    runWebhook();
  }
}

export async function atualizarSaidaEntrega(
  entregador_id: string,
  unidade: string,
  unidade_id?: string | null
): Promise<void> {
  // Segurança: Só atualiza registros das últimas 24 horas para evitar corrupção de histórico antigo
  const limitDate = new Date();
  limitDate.setHours(limitDate.getHours() - 24);

  // IMPORTANTE: usar 'let' e reatribuir o query para que os filtros encadeiem corretamente
  let query = supabase
    .from('historico_entregas')
    .update({ hora_saida: new Date().toISOString() })
    .eq('entregador_id', entregador_id)
    .is('hora_retorno', null)
    .gte('created_at', limitDate.toISOString());

  // Filtra por unidade_id se disponível, caso contrário usa o nome (legado)
  if (unidade_id) {
    query = query.eq('unidade_id', unidade_id);
  } else {
    query = query.eq('unidade', unidade);
  }

  const { error } = await query;

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
  // 1. Checa primeiro a permissão específica da Unidade (override por loja)
  const { data: undMod } = await supabase
    .from('unidade_modulos')
    .select('ativo, data_expiracao')
    .eq('unidade_id', unidadeId)
    .eq('modulo_codigo', moduloCodigo)
    .maybeSingle();

  if (undMod) {
    if (!undMod.ativo) return false; // Explicitamente desativado para a loja
    if (undMod.data_expiracao) {
      if (new Date(undMod.data_expiracao) < new Date()) {
        return false;
      }
    }
    return true; // Explicitamente ativado para a loja
  }

  // 2. Fallback: Checa permissão da Franquia (nível global)
  const { data: und } = await supabase
    .from('unidades')
    .select('franquia_id')
    .eq('id', unidadeId)
    .maybeSingle();

  if (und && und.franquia_id) {
    const { data: fra } = await supabase
      .from('franquias')
      .select('config_pagamento')
      .eq('id', und.franquia_id)
      .maybeSingle();

    if (fra && fra.config_pagamento) {
      const config = fra.config_pagamento as any;
      const modulosAtivos = config.modulos_ativos || [];
      if (Array.isArray(modulosAtivos) && modulosAtivos.includes(moduloCodigo)) return true;
    }
  }

  return false;
}

export async function ativarModulo(unidadeId: string, moduloCodigo: string, diasTrial?: number) {
  const dataExpiracao = diasTrial ? new Date(Date.now() + diasTrial * 24 * 60 * 60 * 1000).toISOString() : null;

  const { error } = await supabase
    .from('unidade_modulos')
    .upsert(
      {
        unidade_id: unidadeId,
        modulo_codigo: moduloCodigo,
        ativo: true,
        data_expiracao: dataExpiracao,
      },
      { onConflict: 'unidade_id,modulo_codigo' }
    );

  if (error) throw error;
}

export async function desativarModulo(unidadeId: string, moduloCodigo: string) {
  const { error } = await supabase
    .from('unidade_modulos')
    .upsert(
      {
        unidade_id: unidadeId,
        modulo_codigo: moduloCodigo,
        ativo: false,
        data_expiracao: null,
      },
      { onConflict: 'unidade_id,modulo_codigo' }
    );

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

  // Também reseta o expediente dos funcionários internos (Janta & Ponto)
  if (unidade) {
    try {
      await resetPontoEquipeInterna(unidade);
    } catch (err) {
      console.warn('Aviso: Erro ao resetar ponto da equipe interna no reset diário:', err);
    }
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
      id: 'v3.0.0-janta-ponto',
      titulo: 'Novo Módulo: Janta & Ponto (Equipe Interna) com sincronização no Google Planilhas',
      tipo: 'NOVIDADES',
      status: 'lancado',
      data_publicacao: '2026-08-24',
      ordem: -20,
      created_at: new Date().toISOString()
    },
    {
      id: 'v3.0.0-reset-equipe',
      titulo: 'Botão de Reset diário exclusivo da equipe interna (não afeta motoboys)',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-08-24',
      ordem: -19,
      created_at: new Date().toISOString()
    },
    {
      id: 'v2.9.2-err',
      titulo: 'Erros corrigidos',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-06-18',
      ordem: -15,
      created_at: new Date().toISOString()
    },
    {
      id: 'v2.9.2-ident',
      titulo: 'Identificação das TVs assistindo em tempo real',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-06-18',
      ordem: -14,
      created_at: new Date().toISOString()
    },
    {
      id: 'v2.9.1-err',
      titulo: 'Erros corrigidos',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-06-16',
      ordem: -13,
      created_at: new Date().toISOString()
    },
    {
      id: 'v2.9.1-ret',
      titulo: 'Registro de horário de retorno na planilha',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-06-16',
      ordem: -12,
      created_at: new Date().toISOString()
    },
    {
      id: 'v2.9.1-hist',
      titulo: 'Melhoria no histórico',
      tipo: 'MELHORIAS',
      status: 'lancado',
      data_publicacao: '2026-06-16',
      ordem: -11,
      created_at: new Date().toISOString()
    },
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
  const dataHoje = now.split('T')[0];

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
      .select('config_sheets_url, nome_loja')
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
          // motoboy_id + data são usados pelo Apps Script como chave de lookup
          // para encontrar a linha do check-in e atualizar (não criar nova linha)
          motoboy_id: params.motoboy_id,
          data: dataHoje,
          motoboy: params.motoboy_nome,
          maquininha: params.maquininha_nome,
          checkin: params.horario_checkin || now,
          retirada: now,
          unidade: config?.nome_loja || params.unidade_nome
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
  motoboy_id: string;
  motoboy_nome: string;
  maquininha_nome: string;
  data: string;
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
      .select('config_sheets_url, nome_loja')
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
          // motoboy_id + data são usados pelo Apps Script como chave de lookup
          // para encontrar a linha do check-in e atualizar (não criar nova linha)
          motoboy_id: params.motoboy_id,
          data: params.data,
          motoboy: params.motoboy_nome,
          maquininha: params.maquininha_nome,
          devolucao: now,
          unidade: config?.nome_loja || params.unidade_nome
        })
      });
    }
  } catch (e) {
    console.error('Erro ao enviar webhook devolução:', e);
  }
}

// ==========================================
// JANTA & PONTO (EQUIPE INTERNA)
// ==========================================

export interface FuncionarioInterno {
  id: string;
  franquia_id?: string | null;
  unidade: string;
  nome: string;
  cargo: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type StatusPonto = 'ausente' | 'trabalhando' | 'em_janta' | 'finalizado';

export interface RegistroPontoIntervalo {
  id: string;
  funcionario_id: string;
  franquia_id?: string | null;
  unidade: string;
  data_referencia: string; // YYYY-MM-DD
  checkin_at?: string | null;
  saida_janta_at?: string | null;
  retorno_janta_at?: string | null;
  tempo_total_janta_minutos?: number;
  status: StatusPonto;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
  funcionario?: FuncionarioInterno;
}

// Helpers de Armazenamento Local de Contingência (Isolado por Unidade)
const getLocalFuncionarios = (unidade: string): FuncionarioInterno[] => {
  try {
    const raw = localStorage.getItem(`filalab_funcionarios_${unidade}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalFuncionarios = (unidade: string, lista: FuncionarioInterno[]) => {
  try {
    localStorage.setItem(`filalab_funcionarios_${unidade}`, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao salvar localmente:', e);
  }
};

const getLocalRegistros = (unidade: string): RegistroPontoIntervalo[] => {
  try {
    const raw = localStorage.getItem(`filalab_registros_ponto_${unidade}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalRegistros = (unidade: string, lista: RegistroPontoIntervalo[]) => {
  try {
    localStorage.setItem(`filalab_registros_ponto_${unidade}`, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao salvar localmente:', e);
  }
};

export const INITIAL_ITAQUA_STAFF: { nome: string; cargo: string }[] = [
  // ATENDIMENTO
  { nome: 'Alessandra', cargo: 'Atendimento' },
  { nome: 'Andressa', cargo: 'Atendimento' },
  { nome: 'Elisa', cargo: 'Atendimento' },
  { nome: 'Julia', cargo: 'Atendimento' },
  { nome: 'Steffani', cargo: 'Atendimento' },
  { nome: 'Vinicius', cargo: 'Atendimento' },
  { nome: 'Kaylaine', cargo: 'Atendimento' },
  // CORTE
  { nome: 'Arthur', cargo: 'Corte' },
  { nome: 'Gustavo', cargo: 'Corte' },
  { nome: 'Isabela', cargo: 'Corte' },
  { nome: 'Gabriel corte', cargo: 'Corte' },
  // PIZZA
  { nome: 'Breno', cargo: 'Pizza' },
  { nome: 'Daiana', cargo: 'Pizza' },
  { nome: 'Flavio', cargo: 'Pizza' },
  { nome: 'Brayan', cargo: 'Pizza' },
  { nome: 'Eduarda', cargo: 'Pizza' },
  { nome: 'Rafael pow', cargo: 'Pizza' },
  { nome: 'Douglas', cargo: 'Pizza' },
  { nome: 'Henrique', cargo: 'Pizza' },
  { nome: 'Nycolas', cargo: 'Pizza' },
  // MASSA
  { nome: 'Bruno', cargo: 'Massa' },
  { nome: 'Matheus', cargo: 'Massa' },
  { nome: 'Eduardo', cargo: 'Massa' },
  { nome: 'Antonio', cargo: 'Massa' },
  // COZINHA
  { nome: 'Simone', cargo: 'Cozinha' },
  { nome: 'Sandra', cargo: 'Cozinha' },
  // BROTO DOCE
  { nome: 'Jaqueline', cargo: 'Broto Doce' },
  // GERENCIA
  { nome: 'Michael', cargo: 'Gerência' },
];

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Busca todos os funcionários internos da unidade de forma estritamente isolada e sem duplicidades */
export async function fetchFuncionariosInternos(
  unidade: string,
  apenasAtivos: boolean = false,
  franquiaId?: string | null
): Promise<FuncionarioInterno[]> {
  // Carrega do LocalStorage da unidade específica para resposta instantânea
  let local = getLocalFuncionarios(unidade);

  // Se for ITAQUA ou loja sem membros, garante que toda a equipe padrão exista no cache local
  if (unidade === 'ITAQUA' || local.length === 0) {
    const localNames = new Set(local.map((f) => f.nome.toLowerCase().trim()));
    const missingInLocal = INITIAL_ITAQUA_STAFF.filter(
      (s) => !localNames.has(s.nome.toLowerCase().trim())
    );
    if (missingInLocal.length > 0) {
      const now = new Date().toISOString();
      const added = missingInLocal.map((f) => ({
        id: generateUUID(),
        nome: f.nome,
        cargo: f.cargo,
        unidade,
        franquia_id: franquiaId || null,
        ativo: true,
        created_at: now,
        updated_at: now,
      }));
      local = [...local, ...added];
    }
  }

  // Deduplica cache local por nome
  const dedupLocalMap = new Map<string, FuncionarioInterno>();
  local.forEach((f) => {
    const key = f.nome.toLowerCase().trim();
    if (!dedupLocalMap.has(key)) {
      dedupLocalMap.set(key, f);
    }
  });
  local = Array.from(dedupLocalMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  saveLocalFuncionarios(unidade, local);

  // Sincroniza com o Supabase filtrando estritamente pela unidade (isolamento absoluto por loja)
  try {
    let query = (supabase.from('funcionarios_internos') as any)
      .select('*')
      .eq('unidade', unidade)
      .order('nome', { ascending: true });

    if (franquiaId) {
      query = query.eq('franquia_id', franquiaId);
    }

    const { data, error } = await query;

    if (!error && data) {
      let merged: FuncionarioInterno[] = data;

      // Se a equipe estiver incompleta (ex: faltam membros da equipe padrão para a loja), complementa no Supabase
      const nomesExistentes = new Set(merged.map((f: any) => f.nome.toLowerCase().trim()));
      const faltantes = INITIAL_ITAQUA_STAFF.filter(
        (staff) => !nomesExistentes.has(staff.nome.toLowerCase().trim())
      );

      if (faltantes.length > 0 && (unidade === 'ITAQUA' || merged.length === 0)) {
        try {
          const { data: inserted, error: insErr } = await (supabase.from('funcionarios_internos') as any)
            .insert(
              faltantes.map((f) => ({
                nome: f.nome,
                cargo: f.cargo,
                unidade,
                franquia_id: franquiaId || null,
                ativo: true,
              }))
            )
            .select();

          if (!insErr && inserted) {
            merged = [...merged, ...inserted];
          } else {
            // Em caso de restrição/erro do banco, mescla com o cache local para não faltar na interface
            const localMap = new Map(local.map((l) => [l.nome.toLowerCase().trim(), l]));
            faltantes.forEach((fl) => {
              const fromLocal = localMap.get(fl.nome.toLowerCase().trim());
              if (fromLocal) merged.push(fromLocal);
            });
          }
        } catch (e) {
          console.warn('Erro ao sincronizar equipe padrão no Supabase:', e);
          const localMap = new Map(local.map((l) => [l.nome.toLowerCase().trim(), l]));
          faltantes.forEach((fl) => {
            const fromLocal = localMap.get(fl.nome.toLowerCase().trim());
            if (fromLocal) merged.push(fromLocal);
          });
        }
      }

      // Deduplicação estrita de funcionários no retorno e no cache
      const dedupDbMap = new Map<string, FuncionarioInterno>();
      merged.forEach((f) => {
        const key = f.nome.toLowerCase().trim();
        if (!dedupDbMap.has(key)) {
          dedupDbMap.set(key, f);
        }
      });
      const dedupedMerged = Array.from(dedupDbMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));

      if (dedupedMerged.length > 0) {
        saveLocalFuncionarios(unidade, dedupedMerged);
        return apenasAtivos ? dedupedMerged.filter((f: any) => f.ativo) : dedupedMerged;
      }
    }
  } catch (err) {
    console.warn('Silencioso - utilizando cache local da loja:', err);
  }

  return apenasAtivos ? local.filter((f) => f.ativo) : local;
}

/** Cadastra um novo funcionário interno (com isolamento estrito por loja) */
export async function createFuncionarioInterno(params: {
  nome: string;
  cargo: string;
  unidade: string;
  franquia_id?: string | null;
}): Promise<FuncionarioInterno> {
  const now = new Date().toISOString();
  let novoFuncionario: FuncionarioInterno = {
    id: generateUUID(),
    nome: params.nome.trim(),
    cargo: params.cargo.trim(),
    unidade: params.unidade,
    franquia_id: params.franquia_id || null,
    ativo: true,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await (supabase.from('funcionarios_internos') as any)
      .insert([{
        nome: params.nome.trim(),
        cargo: params.cargo.trim(),
        unidade: params.unidade,
        franquia_id: params.franquia_id || null,
        ativo: true,
      }])
      .select()
      .single();

    if (!error && data) {
      novoFuncionario = data;
    }
  } catch (e) {
    console.warn('Salvo localmente na loja:', e);
  }

  const local = getLocalFuncionarios(params.unidade);
  const atualizado = [
    ...local.filter((f) => f.id !== novoFuncionario.id && f.nome.toLowerCase() !== novoFuncionario.nome.toLowerCase()),
    novoFuncionario
  ].sort((a, b) => a.nome.localeCompare(b.nome));

  saveLocalFuncionarios(params.unidade, atualizado);

  return novoFuncionario;
}

/** Atualiza dados do funcionário */
export async function updateFuncionarioInterno(
  id: string,
  params: Partial<Pick<FuncionarioInterno, 'nome' | 'cargo' | 'ativo'>>,
  unidade?: string
): Promise<FuncionarioInterno> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await (supabase.from('funcionarios_internos') as any)
      .update({ ...params, updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      if (unidade) {
        const local = getLocalFuncionarios(unidade);
        saveLocalFuncionarios(unidade, local.map((f) => (f.id === id ? data : f)));
      }
      return data;
    }
  } catch (e) {
    console.warn('Atualizando funcionário localmente:', e);
  }

  // Fallback LocalStorage
  if (unidade) {
    const local = getLocalFuncionarios(unidade);
    const atualizado = local.map((f) => (f.id === id ? { ...f, ...params, updated_at: now } : f));
    saveLocalFuncionarios(unidade, atualizado);
    return atualizado.find((f) => f.id === id)!;
  }

  throw new Error('Não foi possível atualizar o funcionário');
}

/** Deleta funcionário interno (remove da unidade) */
export async function deleteFuncionarioInterno(id: string, unidade?: string): Promise<void> {
  try {
    await (supabase.from('funcionarios_internos') as any).delete().eq('id', id);
  } catch (e) {
    console.warn('Erro ao excluir no Supabase:', e);
  }

  // Remove também do LocalStorage da unidade
  if (unidade) {
    const local = getLocalFuncionarios(unidade);
    saveLocalFuncionarios(unidade, local.filter((f) => f.id !== id));

    const registros = getLocalRegistros(unidade);
    saveLocalRegistros(unidade, registros.filter((r) => r.funcionario_id !== id));
  }
}

/** Busca os registros de ponto do dia atual para a unidade e reconecta a funcionários por ID ou Nome */
export async function fetchRegistrosPontoDia(unidade: string, dataReferencia: string): Promise<RegistroPontoIntervalo[]> {
  let dbRegistros: RegistroPontoIntervalo[] = [];
  try {
    const { data, error } = await (supabase.from('registros_ponto_intervalo') as any)
      .select(`*, funcionario:funcionarios_internos(*)`)
      .eq('unidade', unidade)
      .eq('data_referencia', dataReferencia);

    if (!error && data) {
      dbRegistros = data;
    }
  } catch (e) {
    console.warn('Erro ao buscar registros no Supabase:', e);
  }

  // Funcionários da unidade para mapeamento e normalização por ID ou Nome
  const funcionarios = getLocalFuncionarios(unidade);
  const funcById = new Map(funcionarios.map((f) => [f.id, f]));
  const funcByName = new Map(funcionarios.map((f) => [f.nome.toLowerCase().trim(), f]));

  const localRegistros = getLocalRegistros(unidade).filter(
    (r) => r.unidade === unidade && r.data_referencia === dataReferencia
  );

  const normalizeRegistro = (r: RegistroPontoIntervalo): RegistroPontoIntervalo => {
    let f = funcById.get(r.funcionario_id);
    if (!f && r.funcionario?.nome) {
      f = funcByName.get(r.funcionario.nome.toLowerCase().trim());
    }
    if (!f && (r as any).funcionario_nome) {
      f = funcByName.get(String((r as any).funcionario_nome).toLowerCase().trim());
    }

    if (f) {
      return {
        ...r,
        funcionario_id: f.id,
        funcionario: f,
      };
    }
    return r;
  };

  const mergedMap = new Map<string, RegistroPontoIntervalo>();

  // 1. Registros do banco normalizados
  dbRegistros.forEach((r) => {
    const norm = normalizeRegistro(r);
    mergedMap.set(norm.funcionario_id, norm);
    if (norm.funcionario?.nome) {
      mergedMap.set(`nome_${norm.funcionario.nome.toLowerCase().trim()}`, norm);
    }
  });

  // 2. Se o local tiver check-in recente preserva para evitar que a UI pisque ou zere
  localRegistros.forEach((r) => {
    const norm = normalizeRegistro(r);
    const existing = mergedMap.get(norm.funcionario_id) || (norm.funcionario?.nome ? mergedMap.get(`nome_${norm.funcionario.nome.toLowerCase().trim()}`) : undefined);
    if (!existing || (norm.checkin_at && (!existing.checkin_at || (norm.updated_at || '') > (existing.updated_at || '')))) {
      mergedMap.set(norm.funcionario_id, norm);
      if (norm.funcionario?.nome) {
        mergedMap.set(`nome_${norm.funcionario.nome.toLowerCase().trim()}`, norm);
      }
    }
  });

  // Retorna apenas valores únicos por funcionario_id
  const finalMap = new Map<string, RegistroPontoIntervalo>();
  Array.from(mergedMap.values()).forEach((r) => {
    if (r.funcionario_id) {
      finalMap.set(r.funcionario_id, r);
    }
  });

  return Array.from(finalMap.values());
}

/** Busca histórico completo para visualização na planilha/relatório */
export async function fetchHistoricoPontoPlanilha(params: {
  unidade: string;
  dataInicio?: string;
  dataFim?: string;
  funcionarioId?: string;
}): Promise<RegistroPontoIntervalo[]> {
  try {
    let query = (supabase.from('registros_ponto_intervalo') as any)
      .select(`*, funcionario:funcionarios_internos(*)`)
      .eq('unidade', params.unidade)
      .order('data_referencia', { ascending: false })
      .order('checkin_at', { ascending: false });

    if (params.dataInicio) query = query.gte('data_referencia', params.dataInicio);
    if (params.dataFim) query = query.lte('data_referencia', params.dataFim);
    if (params.funcionarioId && params.funcionarioId !== 'todos') {
      query = query.eq('funcionario_id', params.funcionarioId);
    }

    const { data, error } = await query;
    if (!error && data) return data;
  } catch (e) {
    console.warn('Buscando histórico na contingência local');
  }

  // Fallback LocalStorage
  const funcionarios = getLocalFuncionarios(params.unidade);
  const funcMap = new Map(funcionarios.map((f) => [f.id, f]));
  let local = getLocalRegistros(params.unidade).filter((r) => r.unidade === params.unidade);

  if (params.dataInicio) local = local.filter((r) => r.data_referencia >= params.dataInicio!);
  if (params.dataFim) local = local.filter((r) => r.data_referencia <= params.dataFim!);
  if (params.funcionarioId && params.funcionarioId !== 'todos') {
    local = local.filter((r) => r.funcionario_id === params.funcionarioId);
  }

  return local
    .map((r) => ({
      ...r,
      funcionario: funcMap.get(r.funcionario_id),
    }))
    .sort((a, b) => (b.data_referencia > a.data_referencia ? 1 : -1));
}

/** Retorna a data local de hoje no formato YYYY-MM-DD (fuso do Brasil) */
export const getHojeLocalYMD = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Envia webhook em segundo plano para o Google Sheets (atualiza na mesma linha do dia) */
export async function sendPontoSheetsWebhook(params: {
  tipo: 'ponto_intervalo_funcionario';
  acao: 'checkin' | 'saida_janta' | 'retorno_janta';
  unidade: string;
  franquia_id?: string | null;
  funcionario_id: string;
  funcionario_nome: string;
  cargo: string;
  data: string;
  checkin?: string | null;
  saida_janta?: string | null;
  retorno_janta?: string | null;
  tempo_total_minutos?: number;
  status: string;
  id_registro?: string;
  customUrl?: string;
}): Promise<void> {
  try {
    let webhookUrl = params.customUrl;

    // 1. Tenta recuperar do LocalStorage (Franquia ou Unidade)
    if (!webhookUrl && params.franquia_id) {
      webhookUrl = localStorage.getItem(`filalab_ponto_sheets_url_franquia_${params.franquia_id}`) || undefined;
    }
    if (!webhookUrl && params.unidade) {
      webhookUrl = localStorage.getItem(`filalab_ponto_sheets_url_${params.unidade}`) || undefined;
    }

    // 2. Se não achou em cache local, busca no banco (Franquia primeiro, depois Unidade)
    if (!webhookUrl) {
      try {
        if (params.franquia_id) {
          const { data: franq } = await supabase
            .from('franquias')
            .select('config_pagamento')
            .eq('id', params.franquia_id)
            .maybeSingle();

          const cfgFranq = (franq?.config_pagamento as any) || {};
          if (cfgFranq.config_sheets_ponto_url) {
            webhookUrl = cfgFranq.config_sheets_ponto_url;
            localStorage.setItem(`filalab_ponto_sheets_url_franquia_${params.franquia_id}`, webhookUrl);
            if (params.unidade) localStorage.setItem(`filalab_ponto_sheets_url_${params.unidade}`, webhookUrl);
          }
        }

        if (!webhookUrl && params.unidade) {
          const { data: unitData } = await supabase
            .from('unidades')
            .select('config_whatsapp, franquia_id')
            .eq('slug', params.unidade)
            .maybeSingle();

          const cfg = (unitData?.config_whatsapp as any) || {};
          if (cfg.config_sheets_ponto_url) {
            webhookUrl = cfg.config_sheets_ponto_url;
            localStorage.setItem(`filalab_ponto_sheets_url_${params.unidade}`, webhookUrl);
          } else if (unitData?.franquia_id) {
            const { data: franq } = await supabase
              .from('franquias')
              .select('config_pagamento')
              .eq('id', unitData.franquia_id)
              .maybeSingle();

            const cfgFranq = (franq?.config_pagamento as any) || {};
            if (cfgFranq.config_sheets_ponto_url) {
              webhookUrl = cfgFranq.config_sheets_ponto_url;
              localStorage.setItem(`filalab_ponto_sheets_url_franquia_${unitData.franquia_id}`, webhookUrl);
              localStorage.setItem(`filalab_ponto_sheets_url_${params.unidade}`, webhookUrl);
            }
          }
        }
      } catch (e) {
        // Silencioso
      }
    }

    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(params),
      });
    }
  } catch (err) {
    console.warn('Erro ao disparar webhook para Google Sheets:', err);
  }
}

/** Realiza Check-in de Chegada do funcionário (1 toque) */
export async function registrarCheckinPonto(params: {
  funcionario_id: string;
  unidade: string;
  franquia_id?: string | null;
  data_referencia: string;
  funcionario_nome?: string;
  cargo?: string;
}): Promise<RegistroPontoIntervalo> {
  const now = new Date().toISOString();

  // 1. Atualiza cache local PRIMEIRO para garantia de reatividade instantânea na UI
  const funcionarios = getLocalFuncionarios(params.unidade);
  let funcionario = funcionarios.find((f) => f.id === params.funcionario_id);
  if (!funcionario && params.funcionario_nome) {
    funcionario = {
      id: params.funcionario_id,
      nome: params.funcionario_nome,
      cargo: params.cargo || '-',
      unidade: params.unidade,
      franquia_id: params.franquia_id || null,
      ativo: true,
    };
  }

  const localRegistros = getLocalRegistros(params.unidade);
  const index = localRegistros.findIndex(
    (r) => r.funcionario_id === params.funcionario_id && r.data_referencia === params.data_referencia
  );

  let resultado: RegistroPontoIntervalo;
  if (index >= 0) {
    localRegistros[index] = {
      ...localRegistros[index],
      checkin_at: localRegistros[index].checkin_at || now,
      status: 'trabalhando',
      updated_at: now,
      funcionario: funcionario || localRegistros[index].funcionario,
    };
    resultado = localRegistros[index];
  } else {
    resultado = {
      id: generateUUID(),
      funcionario_id: params.funcionario_id,
      unidade: params.unidade,
      franquia_id: params.franquia_id || null,
      data_referencia: params.data_referencia,
      checkin_at: now,
      status: 'trabalhando',
      created_at: now,
      updated_at: now,
      funcionario,
    };
    localRegistros.push(resultado);
  }
  saveLocalRegistros(params.unidade, localRegistros);

  // 2. Sincroniza com Supabase garantindo que o funcionário existe no banco
  try {
    let targetFuncionarioId = params.funcionario_id;

    // Garante que o funcionário existe na tabela funcionarios_internos
    const { data: dbFunc } = await (supabase.from('funcionarios_internos') as any)
      .select('id')
      .eq('id', params.funcionario_id)
      .maybeSingle();

    if (!dbFunc && params.funcionario_nome) {
      // Tenta achar por nome na mesma unidade
      const { data: dbFuncPorNome } = await (supabase.from('funcionarios_internos') as any)
        .select('id')
        .eq('nome', params.funcionario_nome)
        .eq('unidade', params.unidade)
        .maybeSingle();

      if (dbFuncPorNome) {
        targetFuncionarioId = dbFuncPorNome.id;
      } else {
        // Cria no banco para ter id válido na unidade
        const { data: createdFunc } = await (supabase.from('funcionarios_internos') as any)
          .insert([{
            nome: params.funcionario_nome,
            cargo: params.cargo || '-',
            unidade: params.unidade,
            franquia_id: params.franquia_id || null,
            ativo: true,
          }])
          .select()
          .single();

        if (createdFunc) targetFuncionarioId = createdFunc.id;
      }
    }

    // Agora salva o registro de ponto no Supabase (estritamente isolado por loja e data)
    const { data: existente } = await (supabase.from('registros_ponto_intervalo') as any)
      .select('id')
      .eq('funcionario_id', targetFuncionarioId)
      .eq('unidade', params.unidade)
      .eq('data_referencia', params.data_referencia)
      .maybeSingle();

    if (existente) {
      const { data: updatedDb } = await (supabase.from('registros_ponto_intervalo') as any)
        .update({ checkin_at: now, status: 'trabalhando', updated_at: now })
        .eq('id', existente.id)
        .select(`*, funcionario:funcionarios_internos(*)`)
        .single();

      if (updatedDb) resultado = updatedDb;
    } else {
      const { data: insertedDb } = await (supabase.from('registros_ponto_intervalo') as any)
        .insert([{
          funcionario_id: targetFuncionarioId,
          unidade: params.unidade,
          franquia_id: params.franquia_id || null,
          data_referencia: params.data_referencia,
          checkin_at: now,
          status: 'trabalhando',
        }])
        .select(`*, funcionario:funcionarios_internos(*)`)
        .single();

      if (insertedDb) resultado = insertedDb;
    }
  } catch (e) {
    console.warn('Erro ao sincronizar check-in no Supabase:', e);
  }

  // Disparo assíncrono para o Google Sheets (na mesma linha do dia)
  sendPontoSheetsWebhook({
    tipo: 'ponto_intervalo_funcionario',
    acao: 'checkin',
    unidade: params.unidade,
    funcionario_id: resultado.funcionario_id || params.funcionario_id,
    funcionario_nome: resultado.funcionario?.nome || params.funcionario_nome || 'Funcionário',
    cargo: resultado.funcionario?.cargo || params.cargo || '-',
    data: params.data_referencia,
    checkin: resultado.checkin_at,
    status: 'trabalhando',
    id_registro: resultado.id,
  });

  return resultado;
}

/** Registra Saída para Janta (Início do Intervalo) */
export async function registrarSaidaJanta(registroId: string, unidade?: string): Promise<RegistroPontoIntervalo> {
  const now = new Date().toISOString();
  let resultado: RegistroPontoIntervalo | null = null;

  try {
    const { data, error } = await (supabase.from('registros_ponto_intervalo') as any)
      .update({ saida_janta_at: now, status: 'em_janta', updated_at: now })
      .eq('id', registroId)
      .select(`*, funcionario:funcionarios_internos(*)`)
      .single();

    if (!error && data) resultado = data;
  } catch (e) {
    console.warn('Registrando saída janta no armazenamento local');
  }

  // Fallback LocalStorage
  if (!resultado && unidade) {
    const localRegistros = getLocalRegistros(unidade);
    const funcionarios = getLocalFuncionarios(unidade);
    const funcMap = new Map(funcionarios.map((f) => [f.id, f]));

    const index = localRegistros.findIndex((r) => r.id === registroId);
    if (index >= 0) {
      localRegistros[index] = {
        ...localRegistros[index],
        saida_janta_at: now,
        status: 'em_janta',
        updated_at: now,
      };
      saveLocalRegistros(unidade, localRegistros);
      resultado = { ...localRegistros[index], funcionario: funcMap.get(localRegistros[index].funcionario_id) };
    }
  }

  if (!resultado) {
    throw new Error('Falha ao registrar saída de janta');
  }

  // Disparo assíncrono para o Google Sheets (atualiza na mesma linha do dia)
  sendPontoSheetsWebhook({
    tipo: 'ponto_intervalo_funcionario',
    acao: 'saida_janta',
    unidade: resultado.unidade || unidade || 'Geral',
    franquia_id: resultado.funcionario?.franquia_id,
    funcionario_id: resultado.funcionario_id,
    funcionario_nome: resultado.funcionario?.nome || 'Funcionário',
    cargo: resultado.funcionario?.cargo || '-',
    data: resultado.data_referencia,
    checkin: resultado.checkin_at,
    saida_janta: resultado.saida_janta_at,
    status: 'em_janta',
    id_registro: resultado.id,
  });

  return resultado;
}

/** Registra Retorno da Janta (Fim do Intervalo) e calcula duração em minutos */
export async function registrarRetornoJanta(
  registroId: string,
  saidaJantaAt: string,
  unidade?: string
): Promise<RegistroPontoIntervalo> {
  const now = new Date();
  const saida = new Date(saidaJantaAt);
  const diffMs = Math.max(0, now.getTime() - saida.getTime());
  const diffMin = Math.round(diffMs / 60000);
  let resultado: RegistroPontoIntervalo | null = null;

  try {
    const { data, error } = await (supabase.from('registros_ponto_intervalo') as any)
      .update({
        retorno_janta_at: now.toISOString(),
        tempo_total_janta_minutos: diffMin,
        status: 'trabalhando',
        updated_at: now.toISOString(),
      })
      .eq('id', registroId)
      .select(`*, funcionario:funcionarios_internos(*)`)
      .single();

    if (!error && data) resultado = data;
  } catch (e) {
    console.warn('Registrando retorno de janta no armazenamento local');
  }

  // Fallback LocalStorage
  if (!resultado && unidade) {
    const localRegistros = getLocalRegistros(unidade);
    const funcionarios = getLocalFuncionarios(unidade);
    const funcMap = new Map(funcionarios.map((f) => [f.id, f]));

    const index = localRegistros.findIndex((r) => r.id === registroId);
    if (index >= 0) {
      localRegistros[index] = {
        ...localRegistros[index],
        retorno_janta_at: now.toISOString(),
        tempo_total_janta_minutos: diffMin,
        status: 'trabalhando',
        updated_at: now.toISOString(),
      };
      saveLocalRegistros(unidade, localRegistros);
      resultado = { ...localRegistros[index], funcionario: funcMap.get(localRegistros[index].funcionario_id) };
    }
  }

  if (!resultado) {
    throw new Error('Falha ao registrar retorno de janta');
  }

  // Disparo assíncrono para o Google Sheets (atualiza na mesma linha do dia)
  sendPontoSheetsWebhook({
    tipo: 'ponto_intervalo_funcionario',
    acao: 'retorno_janta',
    unidade: resultado.unidade || unidade || 'Geral',
    franquia_id: resultado.funcionario?.franquia_id,
    funcionario_id: resultado.funcionario_id,
    funcionario_nome: resultado.funcionario?.nome || 'Funcionário',
    cargo: resultado.funcionario?.cargo || '-',
    data: resultado.data_referencia,
    checkin: resultado.checkin_at,
    saida_janta: resultado.saida_janta_at,
    retorno_janta: resultado.retorno_janta_at,
    tempo_total_minutos: resultado.tempo_total_janta_minutos,
    status: 'trabalhando',
    id_registro: resultado.id,
  });

  return resultado;
}

/** Reseta apenas os registros de ponto e janta do dia atual da equipe interna (NÃO afeta motoboys) */
export async function resetPontoEquipeInterna(unidade: string, dataReferencia?: string): Promise<void> {
  const dataHoje = dataReferencia || new Date().toISOString().split('T')[0];

  try {
    await (supabase.from('registros_ponto_intervalo') as any)
      .delete()
      .eq('unidade', unidade)
      .eq('data_referencia', dataHoje);
  } catch (err) {
    console.warn('Erro ao resetar registros de ponto no Supabase:', err);
  }

  // Remove também do LocalStorage da unidade para o dia atual
  const localRegistros = getLocalRegistros(unidade);
  const filtrados = localRegistros.filter(
    (r) => !(r.unidade === unidade && r.data_referencia === dataHoje)
  );
  saveLocalRegistros(unidade, filtrados);
}

/** Reseta os registros de ponto e janta do dia atual de um único funcionário interno */
export async function resetPontoFuncionario(
  funcionarioId: string,
  unidade: string,
  dataReferencia?: string
): Promise<void> {
  const dataHoje = dataReferencia || new Date().toISOString().split('T')[0];

  try {
    await (supabase.from('registros_ponto_intervalo') as any)
      .delete()
      .eq('funcionario_id', funcionarioId)
      .eq('unidade', unidade)
      .eq('data_referencia', dataHoje);
  } catch (err) {
    console.warn('Erro ao resetar registro de ponto do funcionário no Supabase:', err);
  }

  // Remove também do LocalStorage da unidade para este funcionário no dia atual
  const localRegistros = getLocalRegistros(unidade);
  const filtrados = localRegistros.filter(
    (r) => !(r.funcionario_id === funcionarioId && r.unidade === unidade && r.data_referencia === dataHoje)
  );
  saveLocalRegistros(unidade, filtrados);
}


