import { IconoChevronDerecha, IconoChevronIzquierda } from '../ui/Iconos';

interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

function armarPaginas(pagina: number, total: number): (number | null)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const cercanas = [pagina - 1, pagina, pagina + 1].filter(
    (numero) => numero > 1 && numero < total,
  );

  const numeros = [1, ...cercanas, total];

  return numeros.flatMap((numero, indice) => {
    const anterior = numeros[indice - 1];
    return anterior !== undefined && numero - anterior > 1
      ? [null, numero]
      : [numero];
  });
}

export function Paginacion({ pagina, totalPaginas, onCambiar }: Props) {
  return (
    <nav className="paginacion" aria-label="Paginación del detalle de ventas">
      <button
        type="button"
        className="boton-icono"
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        <IconoChevronIzquierda />
      </button>

      {armarPaginas(pagina, totalPaginas).map((numero, indice) =>
        numero === null ? (
          <span key={`elipsis-${indice}`} className="paginacion__elipsis">
            …
          </span>
        ) : (
          <button
            key={numero}
            type="button"
            className={`paginacion__pagina${
              numero === pagina ? ' paginacion__pagina--actual' : ''
            }`}
            aria-current={numero === pagina ? 'page' : undefined}
            aria-label={`Página ${numero}`}
            onClick={() => onCambiar(numero)}
          >
            {numero}
          </button>
        ),
      )}

      <button
        type="button"
        className="boton-icono"
        aria-label="Página siguiente"
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        <IconoChevronDerecha />
      </button>
    </nav>
  );
}
