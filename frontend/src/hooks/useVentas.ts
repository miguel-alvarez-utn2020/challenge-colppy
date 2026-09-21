import { useCallback, useEffect, useState } from 'react';
import { obtenerVentas } from '../api/ventasApi';
import type { Venta } from '../types/venta';

export function useVentas(paginaInicial = 1, limite = 20) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pagina, setPagina] = useState(paginaInicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setVentas(await obtenerVentas(pagina, limite));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  }, [pagina, limite]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return { ventas, pagina, setPagina, cargando, error, refrescar };
}
