import { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import {
  IconoAlerta,
  IconoArchivo,
  IconoCerrar,
  IconoChevronDerecha,
  IconoSubir,
} from '../ui/Iconos';
import { useImportarCSV } from '../../hooks/useImportarCSV';
import type { ResumenImportacion } from '../../hooks/useImportarCSV';
import { COLUMNAS_ESPERADAS, armarCsvDeInvalidas } from '../../utils/csv';
import { formatearEntero } from '../../utils/formato';
import './ModalImportar.scss';

interface Props {
  onCerrar: () => void;
  onImportada: () => void;
  onVerDetalle: () => void;
}

const INVALIDAS_VISIBLES = 5;

export function ModalImportar({ onCerrar, onImportada, onVerDetalle }: Props) {
  const {
    estado,
    elegido,
    progreso,
    resumen,
    error,
    cancelado,
    elegirArchivo,
    importar,
    reintentar,
    cancelar,
    reiniciar,
  } = useImportarCSV();

  const [arrastrando, setArrastrando] = useState(false);
  const [errorDeArchivo, setErrorDeArchivo] = useState<string | null>(null);
  const [mostrarTodasLasInvalidas, setMostrarTodasLasInvalidas] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const botonElegir = useRef<HTMLLabelElement>(null);

  const enviando = estado === 'enviando';

  async function tomarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setErrorDeArchivo(null);
    setMostrarTodasLasInvalidas(false);

    try {
      const { filas } = await elegirArchivo(archivo);
      if (filas.length === 0) {
        setErrorDeArchivo('El archivo no tiene filas de datos.');
      }
    } catch {
      setErrorDeArchivo('No pudimos leer el archivo.');
    }
  }

  async function enviarTodo() {
    const resultado = await importar();
    if (resultado.insertadas > 0) onImportada();
  }

  async function reintentarLote() {
    const resultado = await reintentar();
    if (resultado.insertadas > 0) onImportada();
  }

  function descargarInvalidas() {
    const csv = armarCsvDeInvalidas(resumen.detalleInvalidas);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `invalidas-${elegido?.archivo.name ?? 'importacion.csv'}`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const titulo =
    estado === 'inicial'
      ? 'Importar ventas'
      : estado === 'enviando'
        ? `Importando ${elegido?.archivo.name ?? ''}`
        : cancelado
          ? 'Importación cancelada'
          : estado === 'cortado'
            ? 'La importación se cortó'
            : 'Importación terminada';

  const bajada =
    estado === 'inicial'
      ? 'El archivo se lee en el navegador y se envía al backend en lotes de hasta 200 filas.'
      : elegido
        ? `${formatearEntero(elegido.filas.length)} filas leídas · ${elegido.totalLotes} ${
            elegido.totalLotes === 1 ? 'lote' : 'lotes'
          } de hasta 200`
        : undefined;

  const porcentaje = progreso
    ? Math.round((progreso.filasEnviadas / Math.max(1, progreso.totalFilas)) * 100)
    : 0;

  const invalidasVisibles = mostrarTodasLasInvalidas
    ? resumen.detalleInvalidas
    : resumen.detalleInvalidas.slice(0, INVALIDAS_VISIBLES);

  return (
    <Modal
      titulo={titulo}
      bajada={bajada}
      ancho={660}
      bloqueado={enviando}
      onCerrar={onCerrar}
      refFocoInicial={botonElegir}
      puedeCerrarPorOverlay={() => !enviando}
      pie={
        estado === 'inicial' ? (
          <>
            <span className="modal__footer-leyenda">
              Cada lote viaja con su propia clave de idempotencia.
            </span>
            <button type="button" className="boton boton--secundario" onClick={onCerrar}>
              Cancelar
            </button>
            <button
              type="button"
              className="boton boton--primario"
              disabled={!elegido || elegido.filas.length === 0}
              onClick={enviarTodo}
            >
              {elegido && elegido.filas.length > 0
                ? `Importar ${formatearEntero(elegido.filas.length)} filas`
                : 'Importar'}
            </button>
          </>
        ) : estado === 'enviando' ? (
          <>
            <span className="modal__footer-leyenda">
              Cancelar deja de mandar lo que falta; lo ya insertado queda.
            </span>
            <button type="button" className="boton boton--secundario" onClick={cancelar}>
              Cancelar
            </button>
          </>
        ) : estado === 'cortado' ? (
          <>
            <button type="button" className="boton boton--secundario" onClick={onCerrar}>
              Cerrar
            </button>
            <button type="button" className="boton boton--primario" onClick={reintentarLote}>
              Reintentar desde el lote que falló
            </button>
          </>
        ) : (
          <>
            <span className="modal__footer-leyenda">
              {resumen.insertadas > 0
                ? 'El consolidado ya se actualizó.'
                : 'No entró ninguna fila nueva, así que no hizo falta refrescar.'}
            </span>
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => {
                reiniciar();
                setErrorDeArchivo(null);
              }}
            >
              Importar otro archivo
            </button>
            <button type="button" className="boton boton--primario" onClick={onVerDetalle}>
              Ver en el detalle
            </button>
          </>
        )
      }
    >
      {estado === 'inicial' && (
        <div className="importar">
          <div
            className={`zona-drop${arrastrando ? ' zona-drop--activa' : ''}`}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(evento) => {
              evento.preventDefault();
              setArrastrando(false);
              void tomarArchivo(evento.dataTransfer.files[0]);
            }}
          >
            <IconoSubir tamanio={28} grosor={1.6} className="zona-drop__icono" />
            <span className="zona-drop__leyenda">Arrastrá el archivo acá</span>
            {}
            <label ref={botonElegir} htmlFor="im-csv" className="boton boton--acento" tabIndex={0}>
              Elegir archivo CSV
            </label>
            <input
              id="im-csv"
              ref={inputArchivo}
              className="solo-lectores"
              type="file"
              accept=".csv,text/csv"
              onChange={(evento) => void tomarArchivo(evento.target.files?.[0])}
            />
          </div>

          <div className="importar__columnas">
            <span className="importar__overline">Columnas esperadas</span>
            <code className="importar__codigo">{COLUMNAS_ESPERADAS}</code>
          </div>

          {errorDeArchivo && (
            <p className="estado-bloque estado-bloque--error">
              <IconoAlerta tamanio={18} />
              {errorDeArchivo}
            </p>
          )}

          {elegido && elegido.filas.length > 0 && (
            <div className="archivo">
              <IconoArchivo tamanio={22} className="archivo__icono" />
              <div className="archivo__datos">
                <span className="archivo__nombre">{elegido.archivo.name}</span>
                <span className="archivo__detalle">
                  {formatearEntero(elegido.filas.length)} filas leídas · se enviarán en{' '}
                  {elegido.totalLotes} {elegido.totalLotes === 1 ? 'lote' : 'lotes'}
                </span>
              </div>
              <button
                type="button"
                className="boton-icono"
                aria-label="Quitar el archivo"
                onClick={() => {
                  reiniciar();
                  if (inputArchivo.current) inputArchivo.current.value = '';
                }}
              >
                <IconoCerrar tamanio={17} />
              </button>
            </div>
          )}
        </div>
      )}

      {estado === 'enviando' && progreso && (
        <div className="importar">
          <div className="progreso" role="status">
            <div className="progreso__cabecera">
              <span className="progreso__lote">
                Lote {progreso.loteActual} de {progreso.totalLotes}
              </span>
              <span className="progreso__filas">
                {formatearEntero(progreso.filasEnviadas)} de{' '}
                {formatearEntero(progreso.totalFilas)} filas enviadas
              </span>
            </div>
            <div className="progreso__riel">
              <div className="progreso__relleno" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>

          <Contadores resumen={resumen} />
        </div>
      )}

      {(estado === 'cortado' || estado === 'terminado') && (
        <div className="importar">
          {estado === 'cortado' && (
            <div role="alert" className="banner-error">
              <IconoAlerta tamanio={20} />
              <div className="banner-error__texto">
                <span className="banner-error__titulo">Un lote no se pudo enviar</span>
                <span className="banner-error__detalle">
                  {error} Lo insertado hasta acá quedó cargado; el reintento manda
                  el mismo lote con la misma clave de idempotencia, así que no
                  duplica nada.
                </span>
              </div>
            </div>
          )}

          {cancelado && (
            <p className="importar__nota">
              Cancelaste el envío: los lotes que faltaban no se mandaron, y lo que
              ya había entrado quedó cargado.
            </p>
          )}

          <Contadores resumen={resumen} conColor />

          {resumen.detalleDuplicadas.length > 0 && (
            <details className="detalle-bloque">
              <summary className="detalle-bloque__summary">
                <IconoChevronDerecha tamanio={16} className="detalle-bloque__chevron" />
                <span>
                  <strong>{formatearEntero(resumen.duplicadas)} duplicadas</strong> — ya
                  estaban cargadas, no se tocaron
                </span>
              </summary>
              <div className="detalle-bloque__cuerpo">
                <ul className="lista-ids">
                  {resumen.detalleDuplicadas.map((duplicada) => (
                    <li key={`${duplicada.numeroFila}-${duplicada.venta.id}`}>
                      {duplicada.venta.id}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {resumen.detalleInvalidas.length > 0 && (
            <details className="detalle-bloque detalle-bloque--error" open>
              <summary className="detalle-bloque__summary">
                <IconoChevronDerecha tamanio={16} className="detalle-bloque__chevron" />
                <span>
                  <strong>{formatearEntero(resumen.invalidas)} inválidas</strong> — no
                  entraron, con el motivo de cada una
                </span>
              </summary>
              <div className="detalle-bloque__cuerpo">
                {invalidasVisibles.map((invalida, indice) => {
                  const id = (invalida.fila as { id?: string })?.id;
                  return (
                    <div key={`${invalida.numeroFila}-${id ?? indice}`} className="fila-invalida">
                      <span className="fila-invalida__origen">
                        fila {invalida.numeroFila} · {id || 'sin id'}
                      </span>
                      {}
                      <span className="fila-invalida__motivo">
                        {invalida.errores.join(' · ')}
                      </span>
                    </div>
                  );
                })}

                <div className="detalle-bloque__acciones">
                  {!mostrarTodasLasInvalidas &&
                    resumen.detalleInvalidas.length > INVALIDAS_VISIBLES && (
                      <button
                        type="button"
                        className="boton boton--error"
                        onClick={() => setMostrarTodasLasInvalidas(true)}
                      >
                        Ver las {resumen.detalleInvalidas.length - INVALIDAS_VISIBLES}{' '}
                        restantes
                      </button>
                    )}
                  <button type="button" className="boton boton--error" onClick={descargarInvalidas}>
                    Descargar las inválidas en CSV
                  </button>
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}

function Contadores({
  resumen,
  conColor = false,
}: {
  resumen: ResumenImportacion;
  conColor?: boolean;
}) {
  const tiles = [
    { clave: 'insertadas', etiqueta: 'Insertadas', valor: resumen.insertadas },
    { clave: 'duplicadas', etiqueta: 'Duplicadas', valor: resumen.duplicadas },
    { clave: 'invalidas', etiqueta: 'Inválidas', valor: resumen.invalidas },
  ] as const;

  return (
    <div className="contadores">
      {tiles.map((tile) => (
        <div
          key={tile.clave}
          className={`contador contador--${tile.clave}${conColor ? ' contador--resultado' : ''}`}
        >
          <span className="contador__etiqueta">{tile.etiqueta}</span>
          <span className="contador__cifra">{formatearEntero(tile.valor)}</span>
        </div>
      ))}
    </div>
  );
}
