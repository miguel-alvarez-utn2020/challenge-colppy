import type { NuevaVenta } from '../types/venta';

export type CampoVenta = keyof NuevaVenta;

const CAMPOS: CampoVenta[] = [
  'id',
  'fecha',
  'cliente',
  'cantidad',
  'importe',
  'medioPago',
  'producto',
];

export interface ErroresDeFormulario {
  porCampo: Partial<Record<CampoVenta, string>>;
  generales: string[];
}

export function atribuirErrores(mensajes: string[]): ErroresDeFormulario {
  const porCampo: Partial<Record<CampoVenta, string>> = {};
  const generales: string[] = [];

  for (const mensaje of mensajes) {
    const primeraPalabra = mensaje.trim().split(/\s+/)[0];
    const campo = CAMPOS.find((nombre) => nombre === primeraPalabra);

    if (campo && !porCampo[campo]) {
      porCampo[campo] = mensaje;
    } else if (!campo) {
      generales.push(mensaje);
    }
  }

  return { porCampo, generales };
}

export function contarCamposConError(errores: ErroresDeFormulario): number {
  return Object.keys(errores.porCampo).length;
}
