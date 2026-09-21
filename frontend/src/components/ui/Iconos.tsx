import type { ReactNode } from 'react';

interface Props {
  tamanio?: number;
  grosor?: number;
  className?: string;
}

function Svg({
  tamanio = 16,
  grosor = 1.8,
  className,
  children,
}: Props & { children: ReactNode }) {
  return (
    <svg
      width={tamanio}
      height={tamanio}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconoMarca(props: Props) {
  return (
    <Svg grosor={1.7} {...props}>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-3-2z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </Svg>
  );
}

export function IconoMas(props: Props) {
  return (
    <Svg grosor={2} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconoSubir(props: Props) {
  return (
    <Svg {...props}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </Svg>
  );
}

export function IconoCerrar(props: Props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Svg>
  );
}

export function IconoChevronIzquierda(props: Props) {
  return (
    <Svg grosor={2} {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function IconoChevronDerecha(props: Props) {
  return (
    <Svg grosor={2} {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconoChevronAbajo(props: Props) {
  return (
    <Svg grosor={2} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconoArchivo(props: Props) {
  return (
    <Svg grosor={1.6} {...props}>
      <path d="M13 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z" />
      <path d="M13 3v5h5" />
    </Svg>
  );
}

export function IconoAlerta(props: Props) {
  return (
    <Svg {...props}>
      <path d="M10.3 3.9L1.9 18a1.5 1.5 0 0 0 1.3 2.2h17.6A1.5 1.5 0 0 0 22.1 18L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconoAlertaCirculo(props: Props) {
  return (
    <Svg grosor={2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </Svg>
  );
}

export function IconoInfo(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

export function IconoCheck(props: Props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </Svg>
  );
}

export function IconoLineas(props: Props) {
  return (
    <Svg grosor={1.6} {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </Svg>
  );
}
