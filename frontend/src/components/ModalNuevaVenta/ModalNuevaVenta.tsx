import { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Campo } from '../ui/Campo';
import { IconoAlerta } from '../ui/Iconos';
import { ErrorDeApi } from '../../api/httpClient';
import { useCrearVenta } from '../../hooks/useCrearVenta';
import {
  atribuirErrores,
  contarCamposConError,
  type ErroresDeFormulario,
} from '../../utils/validacion';
import type { MedioPago, NuevaVenta } from '../../types/venta';
import './ModalNuevaVenta.scss';

interface Props {
  onCerrar: () => void;
  onGuardada: (insertado: boolean, id: string) => void;
}

const HOY = new Date().toLocaleDateString('sv-SE');

const FORMULARIO_VACIO = {
  id: '',
  fecha: HOY,
  cliente: '',
  producto: '',
  cantidad: '',
  importe: '',
  medioPago: 'transferencia' as MedioPago,
};

const ID_DE_CAMPO = {
  id: 'nv-id',
  fecha: 'nv-fecha',
  cliente: 'nv-cliente',
  producto: 'nv-producto',
  cantidad: 'nv-cantidad',
  importe: 'nv-importe',
  medioPago: 'nv-medio',
} as const;

const SIN_ERRORES: ErroresDeFormulario = { porCampo: {}, generales: [] };

export function ModalNuevaVenta({ onCerrar, onGuardada }: Props) {
  const [valores, setValores] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState<ErroresDeFormulario>(SIN_ERRORES);
  const { enviar, enviando } = useCrearVenta();
  const primerCampo = useRef<HTMLInputElement>(null);

  const cambiar = (campo: keyof typeof FORMULARIO_VACIO) => (
    evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setValores((actuales) => ({ ...actuales, [campo]: evento.target.value }));

  const hayDatos =
    valores.id !== '' ||
    valores.cliente !== '' ||
    valores.producto !== '' ||
    valores.cantidad !== '' ||
    valores.importe !== '';

  async function alEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErrores(SIN_ERRORES);

    const venta: NuevaVenta = {
      id: valores.id.trim(),
      fecha: valores.fecha,
      cliente: valores.cliente.trim() || undefined,
      producto: valores.producto.trim(),
      cantidad: valores.cantidad === '' ? NaN : Number(valores.cantidad),
      importe: valores.importe === '' ? NaN : Number(valores.importe),
      medioPago: valores.medioPago,
    };

    try {
      const resultado = await enviar(venta);
      onGuardada(resultado.insertado, resultado.id ?? venta.id);
    } catch (err) {
      const atribuidos =
        err instanceof ErrorDeApi
          ? atribuirErrores(err.mensajes)
          : { porCampo: {}, generales: ['Ocurrió un error inesperado.'] };

      setErrores(atribuidos);

      const primerCampoConError = Object.keys(atribuidos.porCampo)[0] as
        | keyof typeof ID_DE_CAMPO
        | undefined;

      if (primerCampoConError) {
        document.getElementById(ID_DE_CAMPO[primerCampoConError])?.focus();
      }
    }
  }

  const cantidadDeCampos = contarCamposConError(errores);
  const hayBanner = cantidadDeCampos > 0 || errores.generales.length > 0;

  return (
    <Modal
      titulo="Nueva venta"
      bajada="Todos los campos son obligatorios salvo Cliente."
      ancho={700}
      onCerrar={onCerrar}
      refFocoInicial={primerCampo}
      puedeCerrarPorOverlay={() =>
        !hayDatos ||
        window.confirm('Hay datos cargados en el formulario. ¿Querés descartarlos?')
      }
      pie={
        <>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={onCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-nueva-venta"
            className="boton boton--primario"
            disabled={enviando}
          >
            {enviando ? 'Guardando…' : 'Guardar venta'}
          </button>
        </>
      }
    >
      {hayBanner && (
        <div role="alert" className="banner-error">
          <IconoAlerta tamanio={20} />
          <div className="banner-error__texto">
            <span className="banner-error__titulo">No pudimos guardar la venta</span>
            <span className="banner-error__detalle">
              {errores.generales.length > 0
                ? errores.generales.join(' · ')
                : `El backend rechazó la carga con un 400. Revisá ${
                    cantidadDeCampos === 1
                      ? 'el campo marcado'
                      : `los ${cantidadDeCampos} campos marcados`
                  } abajo.`}
            </span>
          </div>
        </div>
      )}

      <form id="form-nueva-venta" className="form-venta" onSubmit={alEnviar} noValidate>
        <Campo id="nv-id" label="ID de venta" error={errores.porCampo.id}>
          {(atributos) => (
            <input
              {...atributos}
              ref={primerCampo}
              className="campo__control"
              type="text"
              placeholder="V-10242"
              value={valores.id}
              onChange={cambiar('id')}
            />
          )}
        </Campo>

        <Campo id="nv-fecha" label="Fecha" error={errores.porCampo.fecha}>
          {(atributos) => (
            <input
              {...atributos}
              className="campo__control"
              type="date"
              value={valores.fecha}
              onChange={cambiar('fecha')}
            />
          )}
        </Campo>

        <Campo id="nv-cliente" label="Cliente" opcional ancho error={errores.porCampo.cliente}>
          {(atributos) => (
            <input
              {...atributos}
              className="campo__control"
              type="text"
              placeholder="Ferretería San Martín"
              value={valores.cliente}
              onChange={cambiar('cliente')}
            />
          )}
        </Campo>

        <Campo id="nv-producto" label="Producto" ancho error={errores.porCampo.producto}>
          {(atributos) => (
            <input
              {...atributos}
              className="campo__control"
              type="text"
              placeholder="Tornillo hexagonal 1/2 x 100"
              value={valores.producto}
              onChange={cambiar('producto')}
            />
          )}
        </Campo>

        <Campo id="nv-cantidad" label="Cantidad" error={errores.porCampo.cantidad}>
          {(atributos) => (
            <input
              {...atributos}
              className="campo__control"
              type="number"
              min="1"
              step="1"
              placeholder="12"
              value={valores.cantidad}
              onChange={cambiar('cantidad')}
            />
          )}
        </Campo>

        <Campo
          id="nv-importe"
          label="Importe"
          hint="Positivo, hasta 2 decimales."
          error={errores.porCampo.importe}
        >
          {(atributos) => (
            <div className="campo__con-prefijo">
              <span className="campo__prefijo" aria-hidden="true">
                $
              </span>
              <input
                {...atributos}
                className="campo__control-interno"
                type="number"
                min="0"
                step="0.01"
                placeholder="84600.00"
                value={valores.importe}
                onChange={cambiar('importe')}
              />
            </div>
          )}
        </Campo>

        <Campo id="nv-medio" label="Medio de pago" ancho error={errores.porCampo.medioPago}>
          {(atributos) => (
            <select
              {...atributos}
              className="campo__control"
              value={valores.medioPago}
              onChange={cambiar('medioPago')}
            >
              {}
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="efectivo">Efectivo</option>
            </select>
          )}
        </Campo>
      </form>
    </Modal>
  );
}
