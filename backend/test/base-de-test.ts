import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

// Los tests de integración corren contra el Postgres del docker-compose, pero
// nunca contra la base de la app: usan una base aparte que se crea al vuelta y
// se vacía entre tests. Así el consolidado puede afirmar totales exactos, que
// es imposible sobre una tabla con los datos de ejemplo adentro.
const BASE_APP = process.env.DATABASE_URL ?? 'postgresql://usuario:password@localhost:5432/colppy_ventas';
const BASE_TEST = process.env.DATABASE_URL_TEST ?? BASE_APP.replace(/\/[^/]+$/, '/colppy_ventas_test');

const NOMBRE_BASE_TEST = new URL(BASE_TEST).pathname.slice(1);

// El DDL sale del mismo archivo que usa docker-compose para inicializar la base
// real. Si el schema cambia, los tests corren contra el schema nuevo sin que
// haya que acordarse de copiarlo acá.
const DDL = readFileSync(
  join(__dirname, '..', '..', 'docker', 'init-db', '001-create-ventas.sql'),
  'utf8',
);

export async function crearBaseDeTest(): Promise<Pool> {
  // Para crear una base hay que estar conectado a otra: se usa `postgres`, que
  // siempre existe.
  const administrativa = new Pool({
    connectionString: BASE_TEST.replace(/\/[^/]+$/, '/postgres'),
  });

  try {
    const existe = await administrativa.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [NOMBRE_BASE_TEST],
    );
    if (existe.rowCount === 0) {
      await administrativa.query(`CREATE DATABASE ${NOMBRE_BASE_TEST}`);
    }
  } finally {
    await administrativa.end();
  }

  const pool = new Pool({ connectionString: BASE_TEST });
  await pool.query('DROP TABLE IF EXISTS ventas');
  await pool.query(DDL);
  return pool;
}

export async function vaciarVentas(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE ventas');
}

// Venta válida por defecto, con los campos que pida cada test sobreescritos.
// Evita repetir el objeto entero cuando lo único que importa es un campo.
export function ventaValida(cambios: Record<string, unknown> = {}) {
  return {
    id: 'V-001',
    producto: 'Teclado mecánico',
    fecha: '2026-05-01',
    cliente: 'Acme SA',
    cantidad: 2,
    importe: 15000.5,
    medioPago: 'transferencia',
    ...cambios,
  };
}
