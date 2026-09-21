import { httpClient, aErrorDeApi } from './httpClient';
import type {
  Venta,
  NuevaVenta,
  Consolidado,
  ResultadoCrearVenta,
  ResultadoImportacion,
} from '../types/venta';

export async function obtenerVentas(page = 1, limit = 20): Promise<Venta[]> {
  try {
    const { data } = await httpClient.get<Venta[]>('/ventas', {
      params: { page, limit },
    });
    return data;
  } catch (error) {
    throw aErrorDeApi(error);
  }
}

export async function obtenerConsolidado(): Promise<Consolidado> {
  try {
    const { data } = await httpClient.get<Consolidado>('/ventas/consolidado');
    return data;
  } catch (error) {
    throw aErrorDeApi(error);
  }
}

export async function crearVenta(venta: NuevaVenta): Promise<ResultadoCrearVenta> {
  try {
    const { data } = await httpClient.post<ResultadoCrearVenta>('/ventas', venta);
    return data;
  } catch (error) {
    throw aErrorDeApi(error);
  }
}

export async function importarLote(
  filas: unknown[],
  filaInicial: number,
  idempotencyKey: string,
): Promise<ResultadoImportacion> {
  try {
    const { data } = await httpClient.post<ResultadoImportacion>(
      '/ventas/importar',
      { filas, filaInicial },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data;
  } catch (error) {
    throw aErrorDeApi(error);
  }
}
