const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CSV_PATH = path.join(__dirname, '..', '..', 'ventas', 'ventas_fake_5000.csv');
const API_URL = 'http://localhost:3000/ventas/importar';
// Tiene que ser <= al límite que impone el backend (ver
// LOTE_MAXIMO_IMPORTACION en backend/src/ventas/constants). Se deja con
// margen para no depender de tener ese número siempre actualizado acá.
const TAMANIO_LOTE = 100;

function parsearCsv(contenido) {
  // El CSV de ejemplo viene con saltos CRLF: si se parte solo por '\n',
  // el nombre de la última columna queda como 'medio_pago\r' y todas las
  // filas salen sin medio de pago.
  const [lineaEncabezado, ...lineas] = contenido.trim().split(/\r?\n/);
  const columnas = lineaEncabezado.split(',').map((columna) => columna.trim());

  return lineas
    .filter((linea) => linea.trim().length > 0)
    .map((linea) => {
      const valores = linea.split(',');
      const fila = {};
      columnas.forEach((columna, i) => {
        fila[columna.trim()] = valores[i]?.trim();
      });

      // Mapeo explícito: el CSV trae id_venta y medio_pago (snake_case),
      // el VentaDTO espera id y medioPago.
      return {
        id: fila.id_venta,
        fecha: fila.fecha,
        cliente: fila.cliente,
        producto: fila.producto,
        cantidad: Number(fila.cantidad),
        importe: Number(fila.importe),
        medioPago: fila.medio_pago,
      };
    });
}

async function cargarLote(lote, filaInicial) {
  // Simulamos lo que haría un cliente real: una Idempotency-Key nueva por
  // cada lote que se envía por primera vez. El endpoint /ventas/importar
  // ahora la exige (ver IdempotencyGuard).
  const idempotencyKey = crypto.randomUUID();

  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ filas: lote, filaInicial }),
  });

  if (!respuesta.ok) {
    // Hoy el service nunca tira 400 por datos sucios de una fila puntual
    // (esas se reportan en `detalleInvalidas` con 200), asi que cualquier
    // !ok acá significa que el request en si esta mal formado, por ejemplo
    // un lote mas grande que lo que el backend acepta.
    const cuerpo = await respuesta.json();
    const pista = cuerpo.loteMaximoPermitido
      ? ` (bajar TAMANIO_LOTE a ${cuerpo.loteMaximoPermitido} o menos)`
      : '';
    throw new Error(`HTTP ${respuesta.status} inesperado: ${JSON.stringify(cuerpo)}${pista}`);
  }

  return respuesta.json();
}

async function main() {
  const contenido = fs.readFileSync(CSV_PATH, 'utf-8');
  const filas = parsearCsv(contenido);

  console.log(`Total de filas leidas del CSV: ${filas.length}`);
  console.log(`Cargando en lotes de ${TAMANIO_LOTE} contra ${API_URL}...\n`);

  const totales = { insertadas: 0, duplicadas: 0, invalidas: 0 };
  const motivosInvalidas = new Set();

  for (let i = 0; i < filas.length; i += TAMANIO_LOTE) {
    const lote = filas.slice(i, i + TAMANIO_LOTE);
    const resultado = await cargarLote(lote, i + 1);

    totales.insertadas += resultado.insertadas ?? 0;
    totales.duplicadas += resultado.duplicadas ?? 0;
    totales.invalidas += resultado.invalidas ?? 0;

    console.log(
      `Lote filas ${i + 1}-${i + lote.length}: insertadas=${resultado.insertadas} duplicadas=${resultado.duplicadas} invalidas=${resultado.invalidas}`,
    );

    for (const fila of resultado.detalleInvalidas ?? []) {
      for (const error of fila.errores ?? []) {
        motivosInvalidas.add(error);
      }
    }
  }

  console.log('\n--- TOTALES ---');
  console.log(totales);

  if (motivosInvalidas.size > 0) {
    console.log('\nMotivos distintos de fila invalida encontrados:');
    motivosInvalidas.forEach((motivo) => console.log(`  - ${motivo}`));
  }
}

main().catch((error) => {
  console.error('Error cargando datos fake:', error);
  process.exit(1);
});
