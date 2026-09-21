import { describe, expect, it } from 'vitest';
import { armarClaveDeLote, nuevaClaveDeImportacion } from './idempotencia';

describe('armarClaveDeLote', () => {
  it('compone la clave de la importación con el número de lote', () => {
    expect(armarClaveDeLote('a3f1', 1)).toBe('a3f1-lote-1');
    expect(armarClaveDeLote('a3f1', 7)).toBe('a3f1-lote-7');
  });

  it('es determinística: el reintento del mismo lote manda la misma clave', () => {
    expect(armarClaveDeLote('a3f1', 4)).toBe(armarClaveDeLote('a3f1', 4));
  });

  it('nunca repite clave entre lotes de la misma importación', () => {
    const claves = new Set(
      Array.from({ length: 25 }, (_, i) => armarClaveDeLote('a3f1', i + 1)),
    );

    expect(claves.size).toBe(25);
  });
});

describe('nuevaClaveDeImportacion', () => {
  it('cambia en cada importación, para no chocar con las de la anterior', () => {
    expect(nuevaClaveDeImportacion()).not.toBe(nuevaClaveDeImportacion());
  });
});
