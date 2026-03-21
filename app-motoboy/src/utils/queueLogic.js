export const TURNO_PADRAO = {
  inicio: '16:00:00',
  fim: '02:00:00',
};

export function isWithinShift(turnoInicio, turnoFim) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [inicioHour, inicioMinute] = turnoInicio.split(':').map(Number);
  const [fimHour, fimMinute] = turnoFim.split(':').map(Number);

  const inicioTime = inicioHour * 60 + inicioMinute;
  const fimTime = fimHour * 60 + fimMinute;

  if (fimTime < inicioTime) {
    return currentTime >= inicioTime || currentTime <= fimTime;
  }

  return currentTime >= inicioTime && currentTime <= fimTime;
}

export function isWorkDay(diasTrabalho) {
  const now = new Date();
  const dayOfWeek = now.getDay();

  const dayMap = {
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

export function hasRecentCheckin(entregador) {
  if (!entregador.fila_posicao) return false;
  const now = new Date().getTime();
  const filaTime = new Date(entregador.fila_posicao).getTime();
  const diffHours = (now - filaTime) / (1000 * 60 * 60);
  return diffHours <= 24;
}

export function shouldShowInQueue(entregador) {
  if (!entregador.ativo) return false;
  if (hasRecentCheckin(entregador)) return true;

  const diasTrabalho = entregador.dias_trabalho || {
    dom: true, seg: true, ter: true, qua: true, qui: true, sex: true, sab: true
  };

  if (!isWorkDay(diasTrabalho)) return false;

  const turnoInicio = entregador.usar_turno_padrao !== false
    ? TURNO_PADRAO.inicio
    : (entregador.turno_inicio || TURNO_PADRAO.inicio);
  const turnoFim = entregador.usar_turno_padrao !== false
    ? TURNO_PADRAO.fim
    : (entregador.turno_fim || TURNO_PADRAO.fim);

  if (!isWithinShift(turnoInicio, turnoFim)) return false;

  return true;
}
