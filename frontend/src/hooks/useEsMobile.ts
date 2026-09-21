import { useEffect, useState } from 'react';

const CONSULTA = '(max-width: 720px)';

export function useEsMobile(): boolean {
  const [esMobile, setEsMobile] = useState(
    () => window.matchMedia(CONSULTA).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(CONSULTA);
    const alCambiar = (evento: MediaQueryListEvent) => setEsMobile(evento.matches);

    media.addEventListener('change', alCambiar);
    return () => media.removeEventListener('change', alCambiar);
  }, []);

  return esMobile;
}
