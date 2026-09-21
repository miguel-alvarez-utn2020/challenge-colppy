import { describe, expect, it } from 'vitest';
import {
  armarCsvDeInvalidas,
  parsearCsvVentas,
  trocearEnLotes,
  LOTE_MAXIMO_IMPORTACION,
} from './csv';

const ENCABEZADO_REAL = 'id_venta,fecha,cliente,producto,cantidad,importe,medio_pago';

describe('parsearCsvVentas', () => {
  it('mapea el encabezado snake_case de los CSV de ventas/', () => {
    const filas = parsearCsvVentas(
      `${ENCABEZADO_REAL}\nV-1001,2026-05-02,Comercial Andrade,Servicio,2,18500.00,transferencia`,
    );

    expect(filas).toEqual([
      {
        id: 'V-1001',
        fecha: '2026-05-02',
        cliente: 'Comercial Andrade',
        producto: 'Servicio',
        cantidad: 2,
        importe: 18500,
        medioPago: 'transferencia',
      },
    ]);
  });

  it('acepta también el camelCase que espera el backend', () => {
    const filas = parsearCsvVentas(
      'id,fecha,cliente,producto,cantidad,importe,medioPago\nV-1,2026-05-02,Cliente,Producto,1,10,tarjeta',
    );

    expect(filas[0]).toMatchObject({ id: 'V-1', medioPago: 'tarjeta' });
  });

  it('respeta las comas dentro de un campo entrecomillado', () => {
    const filas = parsearCsvVentas(
      `${ENCABEZADO_REAL}\nV-2,2026-05-02,Cliente,"Cable 2x1,5 mm por 100 m",4,1000,efectivo`,
    );

    expect(filas[0]).toMatchObject({
      producto: 'Cable 2x1,5 mm por 100 m',
      cantidad: 4,
    });
  });

  it('manda el cliente vacío como ausente, no como string vacío', () => {
    const filas = parsearCsvVentas(
      `${ENCABEZADO_REAL}\nV-3,2026-05-02,,Producto,1,10,efectivo`,
    );

    expect(filas[0]).toMatchObject({ cliente: undefined });
  });

  it('normaliza el medio de pago a minúscula', () => {
    const filas = parsearCsvVentas(
      `${ENCABEZADO_REAL}\nV-4,2026-05-02,Cliente,Producto,1,10,Transferencia`,
    );

    expect(filas[0]).toMatchObject({ medioPago: 'transferencia' });
  });

  it('tolera BOM, CRLF, espacios y líneas en blanco al final', () => {
    const filas = parsearCsvVentas(
      `﻿${ENCABEZADO_REAL}\r\nV-5 , 2026-05-02 ,Cliente,Producto,1,10,efectivo\r\n\r\n`,
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ id: 'V-5', fecha: '2026-05-02' });
  });

  it('deja el campo vacío si falta la columna, para que el backend lo rechace', () => {
    const filas = parsearCsvVentas(
      'id_venta,fecha,cliente,cantidad,importe,medio_pago\nV-6,2026-05-02,Cliente,1,10,efectivo',
    );

    expect(filas[0]).toMatchObject({ producto: '' });
  });

  it('con un archivo vacío devuelve una lista vacía', () => {
    expect(parsearCsvVentas('')).toEqual([]);
    expect(parsearCsvVentas(ENCABEZADO_REAL)).toEqual([]);
  });
});

describe('trocearEnLotes', () => {
  it('corta en lotes de 200 por defecto y deja el resto en el último', () => {
    const lotes = trocearEnLotes(Array.from({ length: 450 }, (_, i) => i));

    expect(lotes).toHaveLength(3);
    expect(lotes[0]).toHaveLength(LOTE_MAXIMO_IMPORTACION);
    expect(lotes[2]).toHaveLength(50);
  });

  it('acepta otro tamaño de lote (el que puede pedir el backend)', () => {
    expect(trocearEnLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('con lista vacía no arma ningún lote', () => {
    expect(trocearEnLotes([])).toEqual([]);
  });
});

describe('armarCsvDeInvalidas', () => {
  it('escribe una fila por error, con el número de fila y el motivo', () => {
    const csv = armarCsvDeInvalidas([
      {
        numeroFila: 312,
        fila: {
          id: 'V-09877',
          fecha: '2026-05-02',
          cliente: 'Cliente',
          producto: 'Producto',
          cantidad: -2,
          importe: 10,
          medioPago: 'efectivo',
        },
        errores: ['cantidad debe ser un número positivo'],
      },
    ]);

    const [encabezado, fila] = csv.split('\n');
    expect(encabezado).toBe(
      'fila,id_venta,fecha,cliente,producto,cantidad,importe,medio_pago,motivo',
    );
    expect(fila).toBe(
      '312,V-09877,2026-05-02,Cliente,Producto,-2,10,efectivo,cantidad debe ser un número positivo',
    );
  });

  it('entrecomilla lo que tiene comas y duplica las comillas internas', () => {
    const csv = armarCsvDeInvalidas([
      {
        numeroFila: 7,
        fila: { producto: 'Cable 2x1,5 mm', cliente: 'Monitor 24"' },
        errores: ['fecha es obligatoria', 'importe es obligatorio'],
      },
    ]);

    expect(csv.split('\n')[1]).toContain('"Cable 2x1,5 mm"');
    expect(csv.split('\n')[1]).toContain('"Monitor 24"""');
    expect(csv.split('\n')[1]).toContain('fecha es obligatoria · importe es obligatorio');
  });
});
