const formateadorDecimal = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formateadorEntero = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
});

export function formatearMoneda(valor: number): string {
  return `$ ${formateadorDecimal.format(valor ?? 0)}`;
}

export function formatearEntero(valor: number): string {
  return formateadorEntero.format(valor ?? 0);
}

const formateadorFechaLarga = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const formateadorDiaSemana = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  timeZone: 'UTC',
});

const formateadorDiaMes = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function formatearFecha(fecha: string): string {
  return formateadorFechaLarga.format(new Date(fecha));
}

export function formatearDiaDesglose(fecha: string): string {
  const dia = new Date(fecha);
  const numeroDeDia = String(dia.getUTCDate()).padStart(2, '0');
  const mes = String(dia.getUTCMonth() + 1).padStart(2, '0');

  return `${formateadorDiaSemana.format(dia)} ${numeroDeDia}/${mes}`;
}

export function formatearPeriodo(fechas: string[]): string | null {
  if (fechas.length === 0) return null;

  const ordenadas = [...fechas].sort();
  const desde = new Date(ordenadas[0]);
  const hasta = new Date(ordenadas[ordenadas.length - 1]);
  const anio = hasta.getUTCFullYear();
  const diaMes = (fecha: Date) => formateadorDiaMes.format(fecha).replace('.', '');

  if (ordenadas[0] === ordenadas[ordenadas.length - 1]) {
    return `${diaMes(hasta)} ${anio}`;
  }

  const inicio =
    desde.getUTCFullYear() !== anio
      ? `${diaMes(desde)} ${desde.getUTCFullYear()}`
      : desde.getUTCMonth() === hasta.getUTCMonth()
        ? String(desde.getUTCDate())
        : diaMes(desde);

  return `${inicio} — ${diaMes(hasta)} ${anio}`;
}

export const ETIQUETA_MEDIO_PAGO = {
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  efectivo: 'Efectivo',
} as const;
