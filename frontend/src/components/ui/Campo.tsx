import type { ReactNode } from 'react';
import { IconoAlertaCirculo } from './Iconos';

export interface AtributosDeControl {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface Props {
  id: string;
  label: string;
  opcional?: boolean;
  hint?: string;
  error?: string;
  ancho?: boolean;
  children: (atributos: AtributosDeControl) => ReactNode;
}

export function Campo({
  id,
  label,
  opcional = false,
  hint,
  error,
  ancho = false,
  children,
}: Props) {
  const idError = `${id}-error`;

  const atributos: AtributosDeControl = error
    ? { id, 'aria-invalid': true, 'aria-describedby': idError }
    : { id };

  return (
    <div
      className={[
        'campo',
        ancho ? 'campo--ancho' : '',
        error ? 'campo--error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="campo__label" htmlFor={id}>
        {label}
        {opcional && <span className="campo__opcional"> (opcional)</span>}
      </label>

      {children(atributos)}

      {error ? (
        <span id={idError} className="campo__error">
          <IconoAlertaCirculo tamanio={14} />
          {error}
        </span>
      ) : (
        hint && <span className="campo__hint">{hint}</span>
      )}
    </div>
  );
}
