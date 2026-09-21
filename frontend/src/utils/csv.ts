export const LOTE_MAXIMO_IMPORTACION = 200;

export const COLUMNAS_ESPERADAS =
  'id_venta, fecha, cliente, producto, cantidad, importe, medio_pago';

const ALIAS_DE_COLUMNA = {
  id: ['id_venta', 'id'],
  fecha: ['fecha'],
  cliente: ['cliente'],
  producto: ['producto'],
  cantidad: ['cantidad'],
  importe: ['importe'],
  medioPago: ['medio_pago', 'mediopago'],
} as const;

function separarCampos(linea: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];

    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
      continue;
    }

    if (caracter === ',' && !entreComillas) {
      campos.push(actual);
      actual = '';
      continue;
    }

    actual += caracter;
  }

  campos.push(actual);
  return campos.map((campo) => campo.trim());
}

function normalizar(nombreDeColumna: string): string {
  return nombreDeColumna.trim().toLowerCase().replace(/^﻿/, '');
}

export function parsearCsvVentas(contenidoCsv: string): unknown[] {
  const [lineaEncabezado, ...lineas] = contenidoCsv.trim().split(/\r?\n/);
  if (!lineaEncabezado) return [];

  const columnas = separarCampos(lineaEncabezado).map(normalizar);

  const indices = Object.fromEntries(
    Object.entries(ALIAS_DE_COLUMNA).map(([campo, alias]) => [
      campo,
      columnas.findIndex((columna) => (alias as readonly string[]).includes(columna)),
    ]),
  ) as Record<keyof typeof ALIAS_DE_COLUMNA, number>;

  const leer = (valores: string[], campo: keyof typeof ALIAS_DE_COLUMNA): string =>
    indices[campo] === -1 ? '' : (valores[indices[campo]] ?? '');

  return lineas
    .filter((linea) => linea.trim().length > 0)
    .map((linea) => {
      const valores = separarCampos(linea);

      return {
        id: leer(valores, 'id'),
        fecha: leer(valores, 'fecha'),
        cliente: leer(valores, 'cliente') || undefined,
        producto: leer(valores, 'producto'),
        cantidad: Number(leer(valores, 'cantidad')),
        importe: Number(leer(valores, 'importe')),
        medioPago: leer(valores, 'medioPago').toLowerCase(),
      };
    });
}

export function trocearEnLotes<T>(
  items: T[],
  tamanioLote: number = LOTE_MAXIMO_IMPORTACION,
): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamanioLote) {
    lotes.push(items.slice(i, i + tamanioLote));
  }
  return lotes;
}

export function armarCsvDeInvalidas(
  invalidas: { numeroFila: number; fila: unknown; errores: string[] }[],
): string {
  const escapar = (valor: unknown): string => {
    const texto = valor === undefined || valor === null ? '' : String(valor);
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const encabezado =
    'fila,id_venta,fecha,cliente,producto,cantidad,importe,medio_pago,motivo';

  const lineas = invalidas.map(({ numeroFila, fila, errores }) => {
    const datos = (fila ?? {}) as Record<string, unknown>;
    return [
      numeroFila,
      datos.id,
      datos.fecha,
      datos.cliente,
      datos.producto,
      datos.cantidad,
      datos.importe,
      datos.medioPago,
      errores.join(' · '),
    ]
      .map(escapar)
      .join(',');
  });

  return [encabezado, ...lineas].join('\n');
}
