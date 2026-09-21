import { IconoMarca, IconoMas, IconoSubir } from '../ui/Iconos';
import './Header.scss';

interface Props {
  periodo: string | null;
  onNuevaVenta: () => void;
  onImportar: () => void;
}

export function Header({ periodo, onNuevaVenta, onImportar }: Props) {
  return (
    <header className="header">
      <div className="header__marca">
        <IconoMarca tamanio={22} className="header__icono" />
        <span className="header__wordmark">Ventas</span>
      </div>

      <div className="header__acciones">
        <span className="header__periodo">
          {periodo ? `Período: ${periodo}` : 'Sin ventas cargadas'}
        </span>
        <span className="header__divisor" />
        <button
          type="button"
          className="boton boton--secundario boton--compacto"
          onClick={onImportar}
        >
          <IconoSubir />
          Importar ventas
        </button>
        <button
          type="button"
          className="boton boton--primario boton--compacto"
          onClick={onNuevaVenta}
        >
          <IconoMas />
          Nueva venta
        </button>
      </div>
    </header>
  );
}

export function BotonesDeCarga({
  onNuevaVenta,
  onImportar,
}: Omit<Props, 'periodo'>) {
  return (
    <div className="acciones-mobile">
      <button
        type="button"
        className="boton boton--primario"
        onClick={onNuevaVenta}
      >
        <IconoMas />
        Nueva venta
      </button>
      <button
        type="button"
        className="boton boton--secundario"
        onClick={onImportar}
      >
        <IconoSubir />
        Importar
      </button>
    </div>
  );
}
