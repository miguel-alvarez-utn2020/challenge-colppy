import type { Venta } from '../../types/venta';
import {
  ETIQUETA_MEDIO_PAGO,
  formatearFecha,
  formatearMoneda,
} from '../../utils/formato';
import './TablaVentas.scss';

interface Props {
  ventas: Venta[];
  cargando?: boolean;
}

const FILAS_SKELETON = 8;

export function TablaVentas({ ventas, cargando = false }: Props) {
  return (
    <table className="tabla-ventas">
      <thead>
        <tr>
          <th scope="col" className="tabla-ventas__col-id">
            ID
          </th>
          <th scope="col">Fecha</th>
          <th scope="col">Cliente</th>
          <th scope="col">Producto</th>
          <th scope="col" className="tabla-ventas__col-numerica">
            Cant.
          </th>
          <th scope="col">Medio de pago</th>
          <th scope="col" className="tabla-ventas__col-importe">
            Importe
          </th>
        </tr>
      </thead>
      <tbody>
        {cargando
          ? Array.from({ length: FILAS_SKELETON }, (_, i) => (
              <tr key={`skeleton-${i}`}>
                <td colSpan={7}>
                  <span className="skeleton tabla-ventas__skeleton" />
                </td>
              </tr>
            ))
          : ventas.map((venta) => (
              <tr key={venta.id}>
                <td className="tabla-ventas__id">{venta.id}</td>
                <td>{formatearFecha(venta.fecha)}</td>
                <td className={venta.cliente ? undefined : 'tabla-ventas__sin-cliente'}>
                  {venta.cliente || 'Sin cliente'}
                </td>
                <td>{venta.producto}</td>
                <td className="tabla-ventas__col-numerica">{venta.cantidad}</td>
                <td>
                  <span className={`pill pill--${venta.medioPago}`}>
                    {ETIQUETA_MEDIO_PAGO[venta.medioPago]}
                  </span>
                </td>
                <td className="tabla-ventas__importe">
                  {formatearMoneda(venta.importe)}
                </td>
              </tr>
            ))}
      </tbody>
    </table>
  );
}

export function ListaVentas({ ventas }: { ventas: Venta[] }) {
  return (
    <ul className="lista-ventas">
      {ventas.map((venta) => (
        <li key={venta.id} className="lista-ventas__item">
          <div className="lista-ventas__cabecera">
            <span className="lista-ventas__id">{venta.id}</span>
            <span className="lista-ventas__fecha">{formatearFecha(venta.fecha)}</span>
          </div>
          <span
            className={`lista-ventas__cliente${
              venta.cliente ? '' : ' lista-ventas__cliente--sin'
            }`}
          >
            {venta.cliente || 'Sin cliente'}
          </span>
          <span className="lista-ventas__producto">
            {venta.producto} · {venta.cantidad} u.
          </span>
          <div className="lista-ventas__pie">
            <span className={`pill pill--${venta.medioPago}`}>
              {ETIQUETA_MEDIO_PAGO[venta.medioPago]}
            </span>
            <span className="lista-ventas__importe">
              {formatearMoneda(venta.importe)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
