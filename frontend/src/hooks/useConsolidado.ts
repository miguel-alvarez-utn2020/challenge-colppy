import { useCallback, useEffect, useState } from 'react';
import { obtenerConsolidado } from '../api/ventasApi';
import type { Consolidado } from '../types/venta';

export function useConsolidado() {
  const [consolidado, setConsolidado] = useState<Consolidado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setConsolidado(await obtenerConsolidado());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return { consolidado, cargando, error, refrescar };
}
