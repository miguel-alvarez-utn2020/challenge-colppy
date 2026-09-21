import { useRef, useState } from 'react';
import { Header, BotonesDeCarga } from './components/Header/Header';
import { ConsolidadoResumen } from './components/ConsolidadoResumen/ConsolidadoResumen';
import { DetalleVentas } from './components/DetalleVentas/DetalleVentas';
import { ModalNuevaVenta } from './components/ModalNuevaVenta/ModalNuevaVenta';
import { ModalImportar } from './components/ModalImportar/ModalImportar';
import { Avisos, useAvisos } from './components/ui/Avisos';
import { useConsolidado } from './hooks/useConsolidado';
import { useVentas } from './hooks/useVentas';
import { formatearPeriodo } from './utils/formato';
import './App.scss';

const POR_PAGINA = 20;

type ModalAbierto = 'nueva-venta' | 'importar' | null;

function App() {
  const consolidado = useConsolidado();
  const detalle = useVentas(1, POR_PAGINA);
  const { avisos, avisar, cerrar } = useAvisos();

  const [modal, setModal] = useState<ModalAbierto>(null);
  const tituloDetalle = useRef<HTMLHeadingElement>(null);

  function refrescarTodo() {
    consolidado.refrescar();
    if (detalle.pagina === 1) {
      detalle.refrescar();
    } else {
      detalle.setPagina(1);
    }
  }

  function alGuardarVenta(insertado: boolean, id: string) {
    setModal(null);
    avisar(
      insertado ? 'exito' : 'info',
      insertado
        ? `Se cargó la venta ${id}.`
        : `La venta ${id} ya estaba cargada, no se duplicó.`,
    );
    refrescarTodo();
  }

  function alImportar() {
    refrescarTodo();
  }

  return (
    <div className="app">
      <Header
        periodo={formatearPeriodo((consolidado.consolidado?.porDia ?? []).map((d) => d.fecha))}
        onNuevaVenta={() => setModal('nueva-venta')}
        onImportar={() => setModal('importar')}
      />

      <main className="app__contenido">
        <BotonesDeCarga
          onNuevaVenta={() => setModal('nueva-venta')}
          onImportar={() => setModal('importar')}
        />

        <ConsolidadoResumen
          consolidado={consolidado.consolidado}
          cargando={consolidado.cargando}
          error={consolidado.error}
          onReintentar={consolidado.refrescar}
        />

        <DetalleVentas
          ventas={detalle.ventas}
          cargando={detalle.cargando}
          error={detalle.error}
          pagina={detalle.pagina}
          limite={POR_PAGINA}
          totalVentas={consolidado.consolidado?.totalVentas ?? null}
          onCambiarPagina={detalle.setPagina}
          onReintentar={detalle.refrescar}
          onNuevaVenta={() => setModal('nueva-venta')}
          onImportar={() => setModal('importar')}
          refFoco={tituloDetalle}
        />
      </main>

      <Avisos avisos={avisos} onCerrar={cerrar} />

      {modal === 'nueva-venta' && (
        <ModalNuevaVenta onCerrar={() => setModal(null)} onGuardada={alGuardarVenta} />
      )}

      {modal === 'importar' && (
        <ModalImportar
          onCerrar={() => setModal(null)}
          onImportada={alImportar}
          onVerDetalle={() => {
            setModal(null);
            window.setTimeout(() => tituloDetalle.current?.focus(), 0);
          }}
        />
      )}
    </div>
  );
}

export default App;
