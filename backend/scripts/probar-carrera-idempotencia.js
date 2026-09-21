const crypto = require('crypto');

// Dispara N requests en paralelo con la MISMA Idempotency-Key contra
// POST /ventas/importar, para probar en runtime lo que hasta ahora solo
// habíamos razonado en voz alta: el SET NX del guard debería dejar pasar
// a una sola y rebotar al resto con 409, sin importar que lleguen todas
// juntas. Al final hace un reintento con la misma key, ya fuera de la
// carrera, para confirmar que también rebota (esta vez por estado "listo").

const API_URL = 'http://localhost:3000/ventas/importar';
const CANTIDAD_REQUESTS_PARALELAS = Number(process.argv[2]) || 2;

function construirPayload() {
  const sufijo = crypto.randomUUID().slice(0, 8);
  return {
    filas: [
      {
        id: `race-test-${sufijo}`,
        fecha: '2026-01-01',
        cliente: 'Cliente de prueba',
        producto: 'Producto de prueba',
        cantidad: 1,
        importe: 100.5,
        medioPago: 'efectivo',
      },
    ],
    filaInicial: 1,
  };
}

async function pegarle(idempotencyKey, payload, etiqueta) {
  const inicio = process.hrtime.bigint();
  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
  const body = await respuesta.json().catch(() => null);

  return { etiqueta, status: respuesta.status, ms: ms.toFixed(1), body };
}

async function main() {
  const idempotencyKey = crypto.randomUUID();
  const payload = construirPayload();

  console.log(`Idempotency-Key compartida: ${idempotencyKey}`);
  console.log(
    `Disparando ${CANTIDAD_REQUESTS_PARALELAS} requests en paralelo contra ${API_URL}...\n`,
  );

  // Ojo acá: el fetch de cada una arranca en este mismo loop síncrono,
  // antes de que ninguna termine. Recién con el Promise.all esperamos a
  // que resuelvan todas. Eso es lo que garantiza que lleguen "juntas" al
  // guard, no una intención de paralelismo simulado.
  const promesas = Array.from({ length: CANTIDAD_REQUESTS_PARALELAS }, (_, i) =>
    pegarle(idempotencyKey, payload, `#${i + 1}`),
  );

  const resultados = await Promise.all(promesas);

  resultados.forEach((r) => {
    console.log(`Request ${r.etiqueta}: status=${r.status} (${r.ms}ms) body=${JSON.stringify(r.body)}`);
  });

  const doscientos = resultados.filter((r) => r.status === 200);
  const bloqueadas = resultados.filter((r) => r.status === 409);
  const otros = resultados.filter((r) => r.status !== 200 && r.status !== 409);

  console.log('\n--- RESUMEN ---');
  console.log(`200 (pasó el guard, llegó al service): ${doscientos.length}`);
  console.log(`409 (bloqueada por el guard): ${bloqueadas.length}`);
  if (otros.length > 0) {
    console.log(`Otros status inesperados: ${otros.map((r) => r.status).join(', ')}`);
  }

  const pasoCarrera = doscientos.length === 1 && bloqueadas.length === resultados.length - 1;
  console.log(
    pasoCarrera
      ? '\n✅ PASS: exactamente una request ganó la carrera, el resto rebotó con 409.'
      : '\n❌ FAIL: se esperaba 1×200 y el resto 409, revisá los resultados de arriba.',
  );

  console.log('\nEsperando 500ms y reintentando con la misma key, ya fuera de la carrera...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  const reintento = await pegarle(idempotencyKey, payload, 'reintento');
  console.log(`Reintento: status=${reintento.status} body=${JSON.stringify(reintento.body)}`);
  console.log(
    reintento.status === 409
      ? '✅ PASS: el reintento post-carrera también rebotó (409, estado "listo").'
      : '❌ FAIL: se esperaba 409 en el reintento.',
  );
}

main().catch((error) => {
  console.error('Error corriendo la prueba de carrera:', error);
  process.exit(1);
});
