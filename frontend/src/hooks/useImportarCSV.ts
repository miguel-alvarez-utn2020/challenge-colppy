import { useCallback, useRef, useState } from 'react';
import { importarLote } from '../api/ventasApi';
import { ErrorDeApi } from '../api/httpClient';
import { parsearCsvVentas, LOTE_MAXIMO_IMPORTACION } from '../utils/csv';
import { armarClaveDeLote, nuevaClaveDeImportacion } from '../utils/idempotencia';
import type { FilaDuplicada, FilaInvalida } from '../types/venta';

export type EstadoImportacion = 'inicial' | 'enviando' | 'cortado' | 'terminado';

export interface ArchivoElegido {
  archivo: File;
  filas: unknown[];
  totalLotes: number;
}

export interface ProgresoImportacion {
  loteActual: number;
  totalLotes: number;
  filasEnviadas: number;
  totalFilas: number;
}

export interface ResumenImportacion {
  totalRecibidas: number;
  insertadas: number;
  duplicadas: number;
  invalidas: number;
  detalleDuplicadas: FilaDuplicada[];
  detalleInvalidas: FilaInvalida[];
}

const RESUMEN_VACIO: ResumenImportacion = {
  totalRecibidas: 0,
  insertadas: 0,
  duplicadas: 0,
  invalidas: 0,
  detalleDuplicadas: [],
  detalleInvalidas: [],
};

export function useImportarCSV() {
  const [estado, setEstado] = useState<EstadoImportacion>('inicial');
  const [elegido, setElegido] = useState<ArchivoElegido | null>(null);
  const [progreso, setProgreso] = useState<ProgresoImportacion | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacion>(RESUMEN_VACIO);
  const [error, setError] = useState<string | null>(null);
  const [cancelado, setCancelado] = useState(false);

  const cursor = useRef(0);
  const tamanioLote = useRef(LOTE_MAXIMO_IMPORTACION);
  const pedidoDeCancelacion = useRef(false);

  const claveDeImportacion = useRef(nuevaClaveDeImportacion());
  const claveRegenerada = useRef(false);

  const resumenActual = useRef<ResumenImportacion>(RESUMEN_VACIO);

  const reiniciar = useCallback(() => {
    cursor.current = 0;
    tamanioLote.current = LOTE_MAXIMO_IMPORTACION;
    pedidoDeCancelacion.current = false;
    claveDeImportacion.current = nuevaClaveDeImportacion();
    claveRegenerada.current = false;
    resumenActual.current = RESUMEN_VACIO;
    setEstado('inicial');
    setElegido(null);
    setProgreso(null);
    setResumen(RESUMEN_VACIO);
    setError(null);
    setCancelado(false);
  }, []);

  const elegirArchivo = useCallback(
    async (archivo: File): Promise<ArchivoElegido> => {
      reiniciar();
      const filas = parsearCsvVentas(await archivo.text());
      const nuevo: ArchivoElegido = {
        archivo,
        filas,
        totalLotes: Math.max(1, Math.ceil(filas.length / LOTE_MAXIMO_IMPORTACION)),
      };
      setElegido(nuevo);
      return nuevo;
    },
    [reiniciar],
  );

  const enviarDesdeElCursor = useCallback(
    async (filas: unknown[]): Promise<ResumenImportacion> => {
      pedidoDeCancelacion.current = false;
      setCancelado(false);
      setError(null);
      setEstado('enviando');

      let acumulado = resumenActual.current;

      while (cursor.current < filas.length) {
        if (pedidoDeCancelacion.current) {
          setEstado('terminado');
          setCancelado(true);
          setProgreso(null);
          return acumulado;
        }

        const inicio = cursor.current;
        const lote = filas.slice(inicio, inicio + tamanioLote.current);
        const numeroDeLote = Math.floor(inicio / tamanioLote.current) + 1;
        const totalLotes = Math.max(
          1,
          Math.ceil(filas.length / tamanioLote.current),
        );

        setProgreso({
          loteActual: numeroDeLote,
          totalLotes,
          filasEnviadas: inicio,
          totalFilas: filas.length,
        });

        try {
          const resultado = await importarLote(
            lote,
            inicio + 1,
            armarClaveDeLote(claveDeImportacion.current, numeroDeLote),
          );

          acumulado = {
            totalRecibidas: acumulado.totalRecibidas + resultado.totalRecibidas,
            insertadas: acumulado.insertadas + resultado.insertadas,
            duplicadas: acumulado.duplicadas + resultado.duplicadas,
            invalidas: acumulado.invalidas + resultado.invalidas,
            detalleDuplicadas: [
              ...acumulado.detalleDuplicadas,
              ...resultado.detalleDuplicadas,
            ],
            detalleInvalidas: [
              ...acumulado.detalleInvalidas,
              ...resultado.detalleInvalidas,
            ],
          };

          resumenActual.current = acumulado;
          setResumen(acumulado);
          cursor.current = inicio + lote.length;
          claveRegenerada.current = false;
        } catch (err) {
          const nuevoMaximo =
            err instanceof ErrorDeApi
              ? Number(err.extra.loteMaximoPermitido)
              : NaN;

          if (Number.isFinite(nuevoMaximo) && nuevoMaximo > 0) {
            tamanioLote.current = nuevoMaximo;
            claveDeImportacion.current = nuevaClaveDeImportacion();
            continue;
          }

          if (
            err instanceof ErrorDeApi &&
            err.statusCode === 409 &&
            !claveRegenerada.current
          ) {
            claveRegenerada.current = true;
            claveDeImportacion.current = nuevaClaveDeImportacion();
            continue;
          }

          setError(err instanceof Error ? err.message : 'Error desconocido');
          setEstado('cortado');
          return acumulado;
        }
      }

      setProgreso({
        loteActual: Math.max(1, Math.ceil(filas.length / tamanioLote.current)),
        totalLotes: Math.max(1, Math.ceil(filas.length / tamanioLote.current)),
        filasEnviadas: filas.length,
        totalFilas: filas.length,
      });
      setEstado('terminado');
      return acumulado;
    },
    [],
  );

  const importar = useCallback(async (): Promise<ResumenImportacion> => {
    if (!elegido) return RESUMEN_VACIO;

    cursor.current = 0;
    claveRegenerada.current = false;
    resumenActual.current = RESUMEN_VACIO;
    setResumen(RESUMEN_VACIO);
    return enviarDesdeElCursor(elegido.filas);
  }, [elegido, enviarDesdeElCursor]);

  const reintentar = useCallback(async (): Promise<ResumenImportacion> => {
    if (!elegido) return RESUMEN_VACIO;
    return enviarDesdeElCursor(elegido.filas);
  }, [elegido, enviarDesdeElCursor]);

  const cancelar = useCallback(() => {
    pedidoDeCancelacion.current = true;
  }, []);

  return {
    estado,
    elegido,
    progreso,
    resumen,
    error,
    cancelado,
    elegirArchivo,
    importar,
    reintentar,
    cancelar,
    reiniciar,
  };
}
