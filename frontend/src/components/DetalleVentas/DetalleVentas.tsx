import { useEffect, useState } from 'react';
import type { Venta } from '../../types/venta';
import { useEsMobile } from '../../hooks/useEsMobile';
import { ListaVentas, TablaVentas } from '../TablaVentas/TablaVentas';
import { Paginacion } from './Paginacion';
import { IconoAlerta, IconoLineas, IconoMas, IconoSubir } from '../ui/Iconos';
import { formatearEntero } from '../../utils/formato';
import './DetalleVentas.scss';

interface Props {
  ventas: Venta[];
  cargando: boolean;
  error: string | null;
  pagina: number;
  limite: number;
  totalVentas: number | null;
  onCambiarPagina: (pagina: number) => void;
  onReintentar: () => void;
  onNuevaVenta: () => void;
  onImportar: () => void;
  refFoco: React.RefObject<HTMLHeadingElement>;
}

export function DetalleVentas({
  ventas,
  cargando,
  error,
  pagina,
  limite,
  totalVentas,
  onCambiarPagina,
  onReintentar,
  onNuevaVenta,
  onImportar,
  refFoco,
}: Props) {
  const esMobile = useEsMobile();

  const [porPagina, setPorPagina] = useState<Record<number, Venta[]>>({});

  useEffect(() => {
    if (!esMobile || cargando) return;
    setPorPagina((actuales) =>
      pagina === 1 ? { 1: ventas } : { ...actuales, [pagina]: ventas },
    );
  }, [esMobile, cargando, pagina, ventas]);

  const acumuladas = Object.keys(porPagina)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((numero) => porPagina[numero]);

  const lista = esMobile ? acumuladas : ventas;
  const totalPaginas = totalVentas ? Math.ceil(totalVentas / limite) : 1;
  const desde = (pagina - 1) * limite + 1;
  const hasta = desde + lista.length - 1;
  const vacio = !cargando && !error && lista.length === 0 && pagina === 1;

  return (
    <section className="detalle" aria-labelledby="detalle-titulo">
      <div className="detalle__header">
        <h2 id="detalle-titulo" className="detalle__titulo" ref={refFoco} tabIndex={-1}>
          {esMobile ? 'Detalle' : 'Detalle de ventas'}
        </h2>
        <span className="detalle__endpoint">
          {esMobile
            ? totalVentas !== null && `${formatearEntero(totalVentas)} ventas`
            : `GET /ventas · ${limite} por página`}
        </span>
      </div>

      {error ? (
        <div className="detalle__estado">
          <p className="estado-bloque estado-bloque--error">
            <IconoAlerta tamanio={20} />
            No pudimos traer el detalle. {error}
          </p>
          <button type="button" className="boton boton--secundario" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : vacio ? (
        <div className="detalle__vacio">
          <IconoLineas tamanio={26} className="detalle__vacio-icono" />
          <span className="detalle__vacio-titulo">Acá vas a ver cada venta cargada</span>
          <span className="detalle__vacio-texto">
            Con el ID, la fecha, el cliente, el producto y el importe.
          </span>
          <div className="detalle__vacio-acciones">
            <button type="button" className="boton boton--primario" onClick={onNuevaVenta}>
              <IconoMas />
              Cargar la primera venta
            </button>
            <button type="button" className="boton boton--secundario" onClick={onImportar}>
              <IconoSubir />
              Importar un CSV
            </button>
          </div>
        </div>
      ) : esMobile ? (
        <>
          <ListaVentas ventas={lista} />
          {hasta < (totalVentas ?? 0) && (
            <button
              type="button"
              className="boton boton--secundario detalle__cargar-mas"
              disabled={cargando}
              onClick={() => onCambiarPagina(pagina + 1)}
            >
              {cargando ? 'Cargando…' : `Cargar ${limite} más`}
            </button>
          )}
        </>
      ) : (
        <>
          <TablaVentas ventas={lista} cargando={cargando && lista.length === 0} />
          <div className="detalle__pie">
            <span className="detalle__rango">
              {cargando && lista.length === 0
                ? 'Cargando ventas…'
                : `Mostrando ${formatearEntero(desde)} — ${formatearEntero(hasta)} de ${formatearEntero(totalVentas ?? lista.length)} ventas`}
            </span>
            {totalPaginas > 1 && (
              <Paginacion
                pagina={pagina}
                totalPaginas={totalPaginas}
                onCambiar={onCambiarPagina}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
