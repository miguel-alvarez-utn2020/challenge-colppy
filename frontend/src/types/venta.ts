export type MedioPago = 'transferencia' | 'tarjeta' | 'efectivo';

export interface Venta {
  id: string;
  producto: string;
  fecha: string;
  cliente: string | null;
  cantidad: number;
  importe: number;
  medioPago: MedioPago;
}

export interface NuevaVenta {
  id: string;
  producto: string;
  fecha: string;
  cliente?: string;
  cantidad: number;
  importe: number;
  medioPago: MedioPago;
}

export interface ResultadoCrearVenta {
  insertado: boolean;
  id?: string;
  mensaje?: string;
}

export interface Consolidado {
  totalGeneral: number;
  totalVentas: number;
  porDia: { fecha: string; total: number }[];
}

export interface FilaInvalida {
  numeroFila: number;
  fila: unknown;
  errores: string[];
}

export interface FilaDuplicada {
  numeroFila: number;
  venta: NuevaVenta;
}

export interface ResultadoImportacion {
  totalRecibidas: number;
  insertadas: number;
  duplicadas: number;
  invalidas: number;
  detalleDuplicadas: FilaDuplicada[];
  detalleInvalidas: FilaInvalida[];
}
