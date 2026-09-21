import { useCallback, useState } from 'react';
import { crearVenta } from '../api/ventasApi';
import type { NuevaVenta, ResultadoCrearVenta } from '../types/venta';

export function useCrearVenta() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = useCallback(async (venta: NuevaVenta): Promise<ResultadoCrearVenta> => {
    setEnviando(true);
    setError(null);
    try {
      return await crearVenta(venta);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      setError(mensaje);
      throw err;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { enviar, enviando, error };
}
