import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconoCerrar } from './Iconos';
import './Modal.scss';

interface Props {
  titulo: string;
  bajada?: ReactNode;
  ancho: number;
  children: ReactNode;
  pie?: ReactNode;
  bloqueado?: boolean;
  onCerrar: () => void;
  puedeCerrarPorOverlay?: () => boolean;
  refFocoInicial?: React.RefObject<HTMLElement>;
}

const SELECTOR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

let contadorDeIds = 0;

export function Modal({
  titulo,
  bajada,
  ancho,
  children,
  pie,
  bloqueado = false,
  onCerrar,
  puedeCerrarPorOverlay,
  refFocoInicial,
}: Props) {
  const dialogo = useRef<HTMLDivElement>(null);
  const idTitulo = useRef(`modal-titulo-${++contadorDeIds}`);

  const disparador = useRef<HTMLElement | null>(null);

  useEffect(() => {
    disparador.current = document.activeElement as HTMLElement | null;
    document.body.classList.add('con-modal-abierto');

    const inicial =
      refFocoInicial?.current ??
      dialogo.current?.querySelector<HTMLElement>(SELECTOR_FOCUSABLE);
    inicial?.focus();

    return () => {
      document.body.classList.remove('con-modal-abierto');
      disparador.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !bloqueado) {
        evento.stopPropagation();
        onCerrar();
        return;
      }

      if (evento.key !== 'Tab' || !dialogo.current) return;

      const focusables = Array.from(
        dialogo.current.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE),
      ).filter((elemento) => elemento.offsetParent !== null);

      if (focusables.length === 0) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', alPresionar, true);
    return () => document.removeEventListener('keydown', alPresionar, true);
  }, [bloqueado, onCerrar]);

  function alClickearOverlay(evento: React.MouseEvent<HTMLDivElement>) {
    if (evento.target !== evento.currentTarget || bloqueado) return;
    if (puedeCerrarPorOverlay && !puedeCerrarPorOverlay()) return;
    onCerrar();
  }

  return (
    <div className="modal-overlay" onMouseDown={alClickearOverlay}>
      <div
        ref={dialogo}
        className="modal"
        style={{ width: ancho }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo.current}
      >
        <div className="modal__header">
          <div className="modal__titulos">
            <h2 id={idTitulo.current} className="modal__titulo">
              {titulo}
            </h2>
            {bajada && <p className="modal__bajada">{bajada}</p>}
          </div>
          <button
            type="button"
            className="boton-icono boton-icono--fantasma modal__cerrar"
            aria-label="Cerrar"
            disabled={bloqueado}
            onClick={onCerrar}
          >
            <IconoCerrar tamanio={20} />
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {pie && <div className="modal__footer">{pie}</div>}
      </div>
    </div>
  );
}
