import { describe, expect, it } from 'vitest';
import {
  formatearDiaDesglose,
  formatearEntero,
  formatearFecha,
  formatearMoneda,
  formatearPeriodo,
} from './formato';

describe('formatearMoneda', () => {
  it('usa punto de miles, coma decimal y prefijo con espacio', () => {
    expect(formatearMoneda(528924011.28)).toBe('$ 528.924.011,28');
  });

  it('siempre muestra dos decimales, incluso en cero', () => {
    expect(formatearMoneda(0)).toBe('$ 0,00');
    expect(formatearMoneda(1500)).toBe('$ 1.500,00');
  });

  it('redondea a dos decimales', () => {
    expect(formatearMoneda(10.005)).toBe('$ 10,01');
  });
});

describe('formatearEntero', () => {
  it('separa miles con punto y no agrega decimales', () => {
    expect(formatearEntero(4390)).toBe('4.390');
    expect(formatearEntero(0)).toBe('0');
  });
});

describe('formatearFecha', () => {
  it('no corre la fecha un día para atrás', () => {
    expect(formatearFecha('2026-09-21')).toBe('21/09/2026');
    expect(formatearFecha('2026-01-01')).toBe('01/01/2026');
  });
});

describe('formatearDiaDesglose', () => {
  it('escribe el día de la semana en minúscula y el dd/mm con dos dígitos', () => {
    expect(formatearDiaDesglose('2026-09-21')).toBe('lunes 21/09');
    expect(formatearDiaDesglose('2026-09-06')).toBe('domingo 06/09');
  });
});

describe('formatearPeriodo', () => {
  it('devuelve null si no hay días', () => {
    expect(formatearPeriodo([])).toBeNull();
  });

  it('con un solo día muestra ese día', () => {
    expect(formatearPeriodo(['2026-09-21'])).toBe('21 sept 2026');
  });

  it('dentro del mismo mes no repite el mes', () => {
    expect(formatearPeriodo(['2026-09-15', '2026-09-21', '2026-09-18'])).toBe(
      '15 — 21 sept 2026',
    );
  });

  it('si cruza meses muestra los dos meses', () => {
    expect(formatearPeriodo(['2026-08-30', '2026-09-21'])).toBe('30 ago — 21 sept 2026');
  });

  it('si cruza años muestra el año de los dos extremos', () => {
    expect(formatearPeriodo(['2025-10-01', '2026-09-20'])).toBe(
      '1 oct 2025 — 20 sept 2026',
    );
  });
});
