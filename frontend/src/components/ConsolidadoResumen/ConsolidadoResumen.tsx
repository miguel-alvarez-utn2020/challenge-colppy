import type { Consolidado } from '../../types/venta';
import { useEsMobile } from '../../hooks/useEsMobile';
import { IconoAlerta } from '../ui/Iconos';
import { formatearDiaDesglose, formatearEntero, formatearMoneda } from '../../utils/formato';
import './ConsolidadoResumen.scss';

interface Props {
  consolidado: Consolidado | null;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

const DIAS_VISIBLES = 7;

interface FilaDesglose {
  clave: string;
  etiqueta: string;
  monto: number;
  esTotal?: boolean;
}

export function ConsolidadoResumen({
  consolidado,
  cargando,
  error,
  onReintentar,
}: Props) {
  const esMobile = useEsMobile();

  if (error) {
    return (
      <section className="consolidado consolidado--plano">
        <p className="estado-bloque estado-bloque--error">
          <IconoAlerta tamanio={20} />
          No pudimos traer el consolidado. {error}
        </p>
        <button type="button" className="boton boton--secundario" onClick={onReintentar}>
          Reintentar
        </button>
      </section>
    );
  }

  if (cargando && !consolidado) {
    return (
      <section className="consolidado">
        <div className="consolidado__banda">
          <div className="consolidado__total">
            <span className="consolidado__overline">Total del período</span>
            <span className="skeleton consolidado__skeleton-total" />
          </div>
        </div>
        <div className="consolidado__desglose">
          <h2 className="consolidado__titulo">Últimos {DIAS_VISIBLES} días</h2>
          <div className="consolidado__skeleton-filas">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </div>
      </section>
    );
  }

  const dias = consolidado?.porDia ?? [];
  const totalGeneral = consolidado?.totalGeneral ?? 0;
  const vacio = dias.length === 0;

  const diasDesc = [...dias].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const visibles = diasDesc.slice(0, DIAS_VISIBLES);

  const diasEnTitulo = vacio ? DIAS_VISIBLES : visibles.length;

  const filas: FilaDesglose[] = visibles.map((dia) => ({
    clave: dia.fecha,
    etiqueta: formatearDiaDesglose(dia.fecha),
    monto: dia.total,
  }));

  const filasConTotal: FilaDesglose[] = [
    ...filas,
    {
      clave: '__total',
      etiqueta: 'Total del período',
      monto: totalGeneral,
      esTotal: true,
    },
  ];

  const mitad = Math.ceil(filasConTotal.length / 2);

  return (
    <section className="consolidado">
      <div className="consolidado__banda">
        <div className="consolidado__total">
          <span className="consolidado__overline">Total del período</span>
          <span
            className={`consolidado__monto${vacio ? ' consolidado__monto--vacio' : ''}`}
          >
            {formatearMoneda(totalGeneral)}
          </span>
          {esMobile && !vacio && (
            <span className="consolidado__conteo">
              {formatearEntero(consolidado?.totalVentas ?? 0)} ventas en{' '}
              {dias.length} días
            </span>
          )}
        </div>

        {vacio ? (
          <span className="consolidado__leyenda">Todavía no hay ventas en la base.</span>
        ) : (
          !esMobile && (
            <span className="consolidado__conteo">
              {formatearEntero(consolidado?.totalVentas ?? 0)} ventas en{' '}
              {dias.length} días
            </span>
          )
        )}
      </div>

      <div className="consolidado__desglose">
        <div className="consolidado__desglose-header">
          <h2 className="consolidado__titulo">Últimos {diasEnTitulo} días</h2>
          <span className="consolidado__endpoint">GET /ventas/consolidado</span>
        </div>

        {vacio ? (
          <p className="consolidado__vacio">
            Cargá tu primera venta con el formulario, o subí un CSV con el
            historial. En cuanto entre la primera fila, el total y los días
            aparecen acá.
          </p>
        ) : esMobile ? (
          <ListaDesglose filas={filasConTotal} />
        ) : (
          <div className="consolidado__columnas">
            <TablaDesglose filas={filasConTotal.slice(0, mitad)} />
            <TablaDesglose filas={filasConTotal.slice(mitad)} />
          </div>
        )}
      </div>
    </section>
  );
}

function TablaDesglose({ filas }: { filas: FilaDesglose[] }) {
  return (
    <table className="desglose">
      <thead>
        <tr>
          <th scope="col">Fecha</th>
          <th scope="col" className="desglose__col-total">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.clave}>
            <td className={fila.esTotal ? 'desglose__etiqueta-total' : undefined}>
              {fila.etiqueta}
            </td>
            <td
              className={`desglose__monto${
                fila.esTotal ? ' desglose__monto--total' : ''
              }`}
            >
              {formatearMoneda(fila.monto)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ListaDesglose({ filas }: { filas: FilaDesglose[] }) {
  return (
    <ul className="desglose-lista">
      {filas.map((fila) => (
        <li
          key={fila.clave}
          className={`desglose-lista__fila${
            fila.esTotal ? ' desglose-lista__fila--total' : ''
          }`}
        >
          <span>{fila.etiqueta}</span>
          <span className="desglose-lista__monto">{formatearMoneda(fila.monto)}</span>
        </li>
      ))}
    </ul>
  );
}
