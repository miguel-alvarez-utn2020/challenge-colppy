import { describe, expect, it } from 'vitest';
import { atribuirErrores, contarCamposConError } from './validacion';

describe('atribuirErrores', () => {
  it('reparte cada mensaje al campo que nombra', () => {
    const errores = atribuirErrores([
      'id es obligatorio',
      'cantidad debe ser un número positivo',
      'producto es obligatorio',
    ]);

    expect(errores.porCampo).toEqual({
      id: 'id es obligatorio',
      cantidad: 'cantidad debe ser un número positivo',
      producto: 'producto es obligatorio',
    });
    expect(errores.generales).toEqual([]);
  });

  it('no parte los mensajes que llevan coma adentro', () => {
    const errores = atribuirErrores([
      'medioPago debe ser uno de: transferencia, tarjeta, efectivo',
    ]);

    expect(errores.porCampo.medioPago).toBe(
      'medioPago debe ser uno de: transferencia, tarjeta, efectivo',
    );
  });

  it('con dos errores del mismo campo se queda con el primero', () => {
    const errores = atribuirErrores([
      'importe debe ser un número positivo',
      'importe debe ser un número con hasta 2 decimales',
    ]);

    expect(errores.porCampo.importe).toBe('importe debe ser un número positivo');
    expect(contarCamposConError(errores)).toBe(1);
  });

  it('manda al banner lo que no se puede atribuir a un campo', () => {
    const errores = atribuirErrores([
      'property nombre should not exist',
      'fecha es obligatoria',
    ]);

    expect(errores.porCampo).toEqual({ fecha: 'fecha es obligatoria' });
    expect(errores.generales).toEqual(['property nombre should not exist']);
  });

  it('sin errores no marca ningún campo', () => {
    const errores = atribuirErrores([]);

    expect(contarCamposConError(errores)).toBe(0);
    expect(errores.generales).toEqual([]);
  });
});
