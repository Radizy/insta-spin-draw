import { supabase } from '@/integrations/supabase/client';

export interface EtiquetaProduto {
  id: string;
  franquia_id?: string | null;
  unidade_id?: string | null;
  unidade?: string;
  nome: string;
  categoria: string;
  validade_producao_dias: number;
  validade_descongelamento_dias: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EtiquetaImpressora {
  id: string;
  franquia_id?: string | null;
  unidade_id?: string | null;
  unidade?: string;
  nome: string;
  modelo: string;
  ip: string;
  porta: number;
  ativa: boolean;
  created_at?: string;
}

export interface EtiquetaHistorico {
  id: string;
  franquia_id?: string | null;
  unidade_id?: string | null;
  unidade: string;
  tipo: 'producao' | 'descongelamento';
  produto_id?: string;
  produto_nome: string;
  categoria?: string;
  peso?: string | null;
  data_operacao: string; // YYYY-MM-DD
  hora_operacao: string; // HH:mm
  data_validade: string; // YYYY-MM-DD
  quantidade: number;
  usuario_nome: string;
  impressora_nome?: string;
  modelo_etiqueta?: string; // "80x30", "33x21", "100x50", etc.
  colunas?: number; // 1, 2, 3, 4 colunas por carreira
  created_at: string;
}

export type ModeloEtiquetaId = '80x30' | '33x21' | '100x50' | '60x40' | '50x30' | 'personalizado';

export interface ModeloEtiquetaConfig {
  id: ModeloEtiquetaId;
  nome: string;
  larguraMm: number;
  alturaMm: number;
  descricao: string;
}

export const MODELOS_ETIQUETAS: ModeloEtiquetaConfig[] = [
  { id: '80x30', nome: '80mm x 30mm (Padrão)', larguraMm: 80, alturaMm: 30, descricao: 'Padrão Elgin L42 Pro Full / Cozinha' },
  { id: '33x21', nome: '33mm x 21mm (Mini)', larguraMm: 33, alturaMm: 21, descricao: 'Compacta 33x21mm para potes, sachês e gôndolas' },
  { id: '100x50', nome: '100mm x 50mm', larguraMm: 100, alturaMm: 50, descricao: 'Formato grande com espaço expandido' },
  { id: '60x40', nome: '60mm x 40mm', larguraMm: 60, alturaMm: 40, descricao: 'Formato intermediário retangular' },
  { id: '50x30', nome: '50mm x 30mm', larguraMm: 50, alturaMm: 30, descricao: 'Compacta para potes e sachês' },
  { id: 'personalizado', nome: 'Personalizado', larguraMm: 80, alturaMm: 30, descricao: 'Dimensões flexíveis' },
];

export const CATEGORIAS_PADRAO = [
  'Queijos e Laticínios',
  'Carnes e Embutidos',
  'Massas',
  'Molhos e Temperos',
  'Vegetais e Hortifruti',
  'Doces e Sobremesas',
  'Diversos',
];

export const PRODUTOS_SEED_INICIAIS: Omit<EtiquetaProduto, 'id'>[] = [
  { nome: 'MUSSARELA FATIADA', categoria: 'Queijos e Laticínios', validade_producao_dias: 7, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'MUSSARELA RALADA', categoria: 'Queijos e Laticínios', validade_producao_dias: 5, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'CALABRESA FATIADA', categoria: 'Carnes e Embutidos', validade_producao_dias: 6, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'FRANGO DESFIADO TEMPERADO', categoria: 'Carnes e Embutidos', validade_producao_dias: 3, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'BACON EM CUBOS', categoria: 'Carnes e Embutidos', validade_producao_dias: 7, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'PRESUNTO FATIADO', categoria: 'Carnes e Embutidos', validade_producao_dias: 5, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'CATUPIRY / REQUEIJÃO', categoria: 'Queijos e Laticínios', validade_producao_dias: 5, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'MOLHO DE TOMATE ARTESANAL', categoria: 'Molhos e Temperos', validade_producao_dias: 4, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'MASSA DE PIZZA ABERTA', categoria: 'Massas', validade_producao_dias: 3, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'CEBOLA FATIADA', categoria: 'Vegetais e Hortifruti', validade_producao_dias: 2, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'TOMATE PICADO', categoria: 'Vegetais e Hortifruti', validade_producao_dias: 2, validade_descongelamento_dias: 1, ativo: true },
  { nome: 'CHOCOLATE FORNEÁVEL', categoria: 'Doces e Sobremesas', validade_producao_dias: 15, validade_descongelamento_dias: 1, ativo: true },
];

export const IMPRESSORAS_SEED_INICIAIS: Omit<EtiquetaImpressora, 'id'>[] = [
  { nome: 'Elgin Produção Principal', modelo: 'Elgin L42 Pro Full', ip: '192.168.0.120', porta: 9100, ativa: true },
  { nome: 'Impressora Balcão / Térmica', modelo: 'Elgin L42 Pro Full', ip: '192.168.0.121', porta: 9100, ativa: true },
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

// -------------------------------------------------------------
// HELPERS DE LOCALSTORAGE (CONTINGÊNCIA ISOLADA POR LOJA/FRANQUIA)
// -------------------------------------------------------------

const getLocalProdutos = (unidade: string): EtiquetaProduto[] => {
  try {
    const raw = localStorage.getItem(`filalab_etiquetas_produtos_${unidade}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalProdutos = (unidade: string, lista: EtiquetaProduto[]) => {
  try {
    localStorage.setItem(`filalab_etiquetas_produtos_${unidade}`, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao salvar produtos no cache local:', e);
  }
};

const getLocalImpressoras = (unidade: string): EtiquetaImpressora[] => {
  try {
    const raw = localStorage.getItem(`filalab_etiquetas_impressoras_${unidade}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalImpressoras = (unidade: string, lista: EtiquetaImpressora[]) => {
  try {
    localStorage.setItem(`filalab_etiquetas_impressoras_${unidade}`, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao salvar impressoras no cache local:', e);
  }
};

const getLocalHistorico = (unidade: string): EtiquetaHistorico[] => {
  try {
    const raw = localStorage.getItem(`filalab_etiquetas_historico_${unidade}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalHistorico = (unidade: string, lista: EtiquetaHistorico[]) => {
  try {
    localStorage.setItem(`filalab_etiquetas_historico_${unidade}`, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao salvar histórico de etiquetas no cache local:', e);
  }
};

// -------------------------------------------------------------
// PRODUTOS (CRUD)
// -------------------------------------------------------------

export async function fetchEtiquetaProdutos(
  unidade: string,
  franquiaId?: string | null,
  apenasAtivos: boolean = false
): Promise<EtiquetaProduto[]> {
  let local = getLocalProdutos(unidade);

  // Se o cache local estiver vazio para esta unidade, injeta o seed inicial
  if (local.length === 0) {
    const seed: EtiquetaProduto[] = PRODUTOS_SEED_INICIAIS.map((p) => ({
      id: generateUUID(),
      nome: p.nome,
      categoria: p.categoria,
      validade_producao_dias: p.validade_producao_dias,
      validade_descongelamento_dias: p.validade_descongelamento_dias,
      ativo: p.ativo,
      unidade,
      franquia_id: franquiaId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    local = seed;
    saveLocalProdutos(unidade, local);
  }

  try {
    let query = (supabase.from('etiquetas_produtos') as any)
      .select('*')
      .eq('unidade', unidade)
      .order('nome', { ascending: true });

    if (franquiaId) {
      query = query.eq('franquia_id', franquiaId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      saveLocalProdutos(unidade, data);
      return apenasAtivos ? data.filter((p: EtiquetaProduto) => p.ativo) : data;
    }
  } catch (e) {
    // Silencioso - contingência local
  }

  return apenasAtivos ? local.filter((p) => p.ativo) : local;
}

export async function createEtiquetaProduto(params: {
  nome: string;
  categoria: string;
  validade_producao_dias: number;
  validade_descongelamento_dias: number;
  unidade: string;
  franquia_id?: string | null;
  ativo?: boolean;
}): Promise<EtiquetaProduto> {
  const now = new Date().toISOString();
  const novoProduto: EtiquetaProduto = {
    id: generateUUID(),
    nome: params.nome.trim().toUpperCase(),
    categoria: params.categoria.trim(),
    validade_producao_dias: Number(params.validade_producao_dias) || 1,
    validade_descongelamento_dias: Number(params.validade_descongelamento_dias) || 1,
    unidade: params.unidade,
    franquia_id: params.franquia_id || null,
    ativo: params.ativo ?? true,
    created_at: now,
    updated_at: now,
  };

  const local = getLocalProdutos(params.unidade);
  saveLocalProdutos(params.unidade, [...local, novoProduto]);

  try {
    const { data, error } = await (supabase.from('etiquetas_produtos') as any)
      .insert([{
        nome: novoProduto.nome,
        categoria: novoProduto.categoria,
        validade_producao_dias: novoProduto.validade_producao_dias,
        validade_descongelamento_dias: novoProduto.validade_descongelamento_dias,
        unidade: novoProduto.unidade,
        franquia_id: novoProduto.franquia_id,
        ativo: novoProduto.ativo,
      }])
      .select()
      .single();

    if (!error && data) {
      saveLocalProdutos(params.unidade, [...local.filter((p) => p.id !== novoProduto.id), data]);
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  return novoProduto;
}

export async function updateEtiquetaProduto(
  id: string,
  params: Partial<Omit<EtiquetaProduto, 'id'>>,
  unidade: string
): Promise<EtiquetaProduto> {
  const now = new Date().toISOString();
  const local = getLocalProdutos(unidade);

  const formatado = {
    ...params,
    ...(params.nome ? { nome: params.nome.trim().toUpperCase() } : {}),
    updated_at: now,
  };

  try {
    const { data, error } = await (supabase.from('etiquetas_produtos') as any)
      .update(formatado)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      saveLocalProdutos(unidade, local.map((p) => (p.id === id ? data : p)));
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  const atualizado = local.map((p) => (p.id === id ? { ...p, ...formatado } : p));
  saveLocalProdutos(unidade, atualizado);
  return atualizado.find((p) => p.id === id)!;
}

export async function deleteEtiquetaProduto(id: string, unidade: string): Promise<void> {
  try {
    await (supabase.from('etiquetas_produtos') as any).delete().eq('id', id);
  } catch (e) {
    // Silencioso
  }

  const local = getLocalProdutos(unidade);
  saveLocalProdutos(unidade, local.filter((p) => p.id !== id));
}

// -------------------------------------------------------------
// IMPRESSORAS (CRUD)
// -------------------------------------------------------------

export async function fetchEtiquetaImpressoras(
  unidade: string,
  franquiaId?: string | null
): Promise<EtiquetaImpressora[]> {
  let local = getLocalImpressoras(unidade);

  if (local.length === 0) {
    const seed: EtiquetaImpressora[] = IMPRESSORAS_SEED_INICIAIS.map((imp) => ({
      id: generateUUID(),
      nome: imp.nome,
      modelo: imp.modelo,
      ip: imp.ip,
      porta: imp.porta,
      ativa: imp.ativa,
      unidade,
      franquia_id: franquiaId || null,
      created_at: new Date().toISOString(),
    }));
    local = seed;
    saveLocalImpressoras(unidade, local);
  }

  try {
    let query = (supabase.from('etiquetas_impressoras') as any)
      .select('*')
      .eq('unidade', unidade)
      .order('nome', { ascending: true });

    if (franquiaId) {
      query = query.eq('franquia_id', franquiaId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      saveLocalImpressoras(unidade, data);
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  return local;
}

export async function createEtiquetaImpressora(params: {
  nome: string;
  modelo: string;
  ip: string;
  porta: number;
  unidade: string;
  franquia_id?: string | null;
  ativa?: boolean;
}): Promise<EtiquetaImpressora> {
  const now = new Date().toISOString();
  const novaImpressora: EtiquetaImpressora = {
    id: generateUUID(),
    nome: params.nome.trim(),
    modelo: params.modelo.trim(),
    ip: params.ip.trim(),
    porta: Number(params.porta) || 9100,
    unidade: params.unidade,
    franquia_id: params.franquia_id || null,
    ativa: params.ativa ?? true,
    created_at: now,
  };

  const local = getLocalImpressoras(params.unidade);
  saveLocalImpressoras(params.unidade, [...local, novaImpressora]);

  try {
    const { data, error } = await (supabase.from('etiquetas_impressoras') as any)
      .insert([{
        nome: novaImpressora.nome,
        modelo: novaImpressora.modelo,
        ip: novaImpressora.ip,
        porta: novaImpressora.porta,
        unidade: novaImpressora.unidade,
        franquia_id: novaImpressora.franquia_id,
        ativa: novaImpressora.ativa,
      }])
      .select()
      .single();

    if (!error && data) {
      saveLocalImpressoras(params.unidade, [...local.filter((i) => i.id !== novaImpressora.id), data]);
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  return novaImpressora;
}

export async function updateEtiquetaImpressora(
  id: string,
  params: Partial<Omit<EtiquetaImpressora, 'id'>>,
  unidade: string
): Promise<EtiquetaImpressora> {
  const local = getLocalImpressoras(unidade);

  try {
    const { data, error } = await (supabase.from('etiquetas_impressoras') as any)
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      saveLocalImpressoras(unidade, local.map((i) => (i.id === id ? data : i)));
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  const atualizado = local.map((i) => (i.id === id ? { ...i, ...params } : i));
  saveLocalImpressoras(unidade, atualizado);
  return atualizado.find((i) => i.id === id)!;
}

export async function deleteEtiquetaImpressora(id: string, unidade: string): Promise<void> {
  try {
    await (supabase.from('etiquetas_impressoras') as any).delete().eq('id', id);
  } catch (e) {
    // Silencioso
  }

  const local = getLocalImpressoras(unidade);
  saveLocalImpressoras(unidade, local.filter((i) => i.id !== id));
}

// -------------------------------------------------------------
// HISTÓRICO (RETENÇÃO E LIMPEZA AUTOMÁTICA DE 7 DIAS)
// -------------------------------------------------------------

export async function fetchEtiquetaHistorico(
  unidade: string,
  franquiaId?: string | null
): Promise<EtiquetaHistorico[]> {
  // Executa rotina de limpeza de registros > 7 dias antes de retornar
  await cleanupEtiquetaHistorico7Dias(unidade, franquiaId);

  const local = getLocalHistorico(unidade);

  try {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const limiteIso = seteDiasAtras.toISOString();

    let query = (supabase.from('etiquetas_historico') as any)
      .select('*')
      .eq('unidade', unidade)
      .gte('created_at', limiteIso)
      .order('created_at', { ascending: false });

    if (franquiaId) {
      query = query.eq('franquia_id', franquiaId);
    }

    const { data, error } = await query;
    if (!error && data) {
      saveLocalHistorico(unidade, data);
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function saveEtiquetaHistorico(params: {
  unidade: string;
  franquia_id?: string | null;
  tipo: 'producao' | 'descongelamento';
  produto_id?: string;
  produto_nome: string;
  categoria?: string;
  peso?: string | null;
  data_operacao: string;
  hora_operacao: string;
  data_validade: string;
  quantidade: number;
  usuario_nome: string;
  impressora_nome?: string;
  modelo_etiqueta?: string;
}): Promise<EtiquetaHistorico> {
  const now = new Date().toISOString();
  const novoRegistro: EtiquetaHistorico = {
    id: generateUUID(),
    unidade: params.unidade,
    franquia_id: params.franquia_id || null,
    tipo: params.tipo,
    produto_id: params.produto_id,
    produto_nome: params.produto_nome.toUpperCase(),
    categoria: params.categoria,
    peso: params.peso?.trim() || null,
    data_operacao: params.data_operacao,
    hora_operacao: params.hora_operacao,
    data_validade: params.data_validade,
    quantidade: Math.max(1, Number(params.quantidade) || 1),
    usuario_nome: params.usuario_nome,
    impressora_nome: params.impressora_nome,
    modelo_etiqueta: params.modelo_etiqueta || '80x30',
    created_at: now,
  };

  const local = getLocalHistorico(params.unidade);
  saveLocalHistorico(params.unidade, [novoRegistro, ...local]);

  try {
    const { data, error } = await (supabase.from('etiquetas_historico') as any)
      .insert([{
        unidade: novoRegistro.unidade,
        franquia_id: novoRegistro.franquia_id,
        tipo: novoRegistro.tipo,
        produto_id: novoRegistro.produto_id,
        produto_nome: novoRegistro.produto_nome,
        categoria: novoRegistro.categoria,
        peso: novoRegistro.peso,
        data_operacao: novoRegistro.data_operacao,
        hora_operacao: novoRegistro.hora_operacao,
        data_validade: novoRegistro.data_validade,
        quantidade: novoRegistro.quantidade,
        usuario_nome: novoRegistro.usuario_nome,
        impressora_nome: novoRegistro.impressora_nome,
        modelo_etiqueta: novoRegistro.modelo_etiqueta,
      }])
      .select()
      .single();

    if (!error && data) {
      saveLocalHistorico(params.unidade, [data, ...local.filter((h) => h.id !== novoRegistro.id)]);
      return data;
    }
  } catch (e) {
    // Silencioso
  }

  return novoRegistro;
}

/** Limpeza automática: remove registros de histórico com mais de 7 dias */
export async function cleanupEtiquetaHistorico7Dias(
  unidade: string,
  franquiaId?: string | null
): Promise<void> {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const limiteIso = seteDiasAtras.toISOString();

  try {
    let query = (supabase.from('etiquetas_historico') as any)
      .delete()
      .eq('unidade', unidade)
      .lt('created_at', limiteIso);

    if (franquiaId) {
      query = query.eq('franquia_id', franquiaId);
    }

    await query;
  } catch (e) {
    // Silencioso
  }

  // Limpa também no LocalStorage
  const local = getLocalHistorico(unidade);
  const validos = local.filter((h) => new Date(h.created_at).getTime() >= seteDiasAtras.getTime());
  saveLocalHistorico(unidade, validos);
}

// -------------------------------------------------------------
// HELPERS DE DATAS E COMANDOS RAW EPL/ZPL (ELGIN L42 PRO FULL)
// -------------------------------------------------------------

export function calcularDataValidade(dataBase: string, diasAcrescentar: number): string {
  try {
    const [ano, mes, dia] = dataBase.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    d.setDate(d.getDate() + (diasAcrescentar || 0));
    
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (e) {
    return dataBase;
  }
}

export function formatarDataBR(dataYMD: string): string {
  if (!dataYMD) return '';
  try {
    const [ano, mes, dia] = dataYMD.split('-');
    if (ano && mes && dia) {
      return `${dia}/${mes}/${ano}`;
    }
    return dataYMD;
  } catch (e) {
    return dataYMD;
  }
}

export function getHoraAtualHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Gera comandos EPL2 nativos para a impressora Elgin L42 Pro Full (80mm x 30mm)
 * Preparado para futuro envio via Socket TCP / RAW 9100.
 */
export function generateEPL2Commands(params: {
  tipo: 'PRODUÇÃO' | 'DESCONGELAMENTO';
  produtoNome: string;
  peso?: string | null;
  dataOperacao: string;
  horaOperacao: string;
  dataValidade: string;
  unidade: string;
  usuarioNome: string;
  quantidade?: number;
}): string {
  const qtd = params.quantidade || 1;
  const tipoLabel = params.tipo.toUpperCase();
  const dataOpFormatted = formatarDataBR(params.dataOperacao);
  const dataValFormatted = formatarDataBR(params.dataValidade);

  return [
    'N', // Limpa o buffer de imagem
    'q640', // Largura da etiqueta (80mm a 203 DPI = ~640 pontos)
    'Q240,24', // Altura da etiqueta (30mm = ~240 pontos) + GAP 24 pontos
    'D10', // Densidade de impressão
    'ZT', // Posição de corte/avanço
    `A40,15,0,4,1,1,N,"${tipoLabel}"`,
    `A40,50,0,4,1,2,N,"${params.produtoNome.slice(0, 26)}"`,
    params.peso ? `A40,95,0,3,1,1,N,"Peso: ${params.peso}"` : '',
    `A40,130,0,2,1,1,N,"Data: ${dataOpFormatted}   Hora: ${params.horaOperacao}"`,
    `A40,160,0,3,1,1,N,"Validade: ${dataValFormatted}"`,
    `A40,195,0,2,1,1,N,"${params.unidade.toUpperCase()} - Resp: ${params.usuarioNome.toUpperCase()}"`,
    `P${qtd}`, // Imprime 'qtd' cópias
  ]
    .filter(Boolean)
    .join('\n');
}
