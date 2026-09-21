import { useCallback, useState } from 'react';
import { IconoCerrar, IconoCheck, IconoInfo } from './Iconos';
import './Avisos.scss';

export type TipoDeAviso = 'exito' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoDeAviso;
  texto: string;
}

const DURACION_MS = 5000;

let contadorDeAvisos = 0;

export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const cerrar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  const avisar = useCallback(
    (tipo: TipoDeAviso, texto: string) => {
      const id = ++contadorDeAvisos;
      setAvisos((actuales) => [...actuales, { id, tipo, texto }]);
      window.setTimeout(() => cerrar(id), DURACION_MS);
    },
    [cerrar],
  );

  return { avisos, avisar, cerrar };
}

interface Props {
  avisos: Aviso[];
  onCerrar: (id: number) => void;
}

export function Avisos({ avisos, onCerrar }: Props) {
  if (avisos.length === 0) return null;

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div key={aviso.id} className={`aviso aviso--${aviso.tipo}`}>
          {aviso.tipo === 'exito' ? (
            <IconoCheck tamanio={18} />
          ) : (
            <IconoInfo tamanio={18} />
          )}
          <span className="aviso__texto">{aviso.texto}</span>
          <button
            type="button"
            className="aviso__cerrar"
            aria-label="Cerrar aviso"
            onClick={() => onCerrar(aviso.id)}
          >
            <IconoCerrar tamanio={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
